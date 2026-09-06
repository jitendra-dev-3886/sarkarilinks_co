<?php

namespace App\Http\Controllers;

use App\Application\Audit;
use App\Domain\Content\Content;
use App\Http\Requests\SaveContentRequest;
use App\Jobs\ExtractAdvertisement;
use App\Models\AdvertisementImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class AdvertisementController extends Controller
{
    private function authorizeImport(Request $request, AdvertisementImport $advertisement): void
    {
        abort_unless($request->user()->hasPermission('media.manage') || ($request->user()->hasPermission('media.upload') && $advertisement->user_id === $request->user()->id), 403);
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->hasPermission('media.upload') || $request->user()->hasPermission('media.manage'), 403);

        return AdvertisementImport::query()->when(! $request->user()->hasPermission('media.manage'), fn ($q) => $q->where('user_id', $request->user()->id))
            ->select('id', 'user_id', 'content_id', 'filename', 'mime', 'size', 'status', 'error', 'created_at', 'updated_at')->latest('id')->paginate(15);
    }

    public function store(Request $request)
    {
        Gate::authorize('media.upload');
        $request->validate(['file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'extensions:pdf,jpg,jpeg,png', 'max:10240'], 'source_url' => ['required', 'url:http,https', 'max:2048']]);
        $file = $request->file('file');
        $bytes = file_get_contents($file->getRealPath());
        $mime = $file->getMimeType();
        $valid = match ($mime) {
            'application/pdf' => str_starts_with($bytes, '%PDF-'),
            'image/png' => str_starts_with($bytes, "\x89PNG\r\n\x1a\n"),
            'image/jpeg' => str_starts_with($bytes, "\xff\xd8\xff"),
            default => false,
        };
        abort_unless($valid, 422, 'The file contents do not match a supported PDF, JPG or PNG. Download the original file again; changing its extension does not convert it.');
        if ($mime === 'application/pdf') {
            abort_unless(str_ends_with(rtrim($bytes, "\x00\t\n\f\r "), '%%EOF'), 422, 'This PDF appears incomplete or has unexpected data after its ending. Download it again, or export a fresh PDF and upload that copy.');
        }
        // Do not scan compressed bytes, metadata or displayed text for code words.
        // The queued PDF parser checks actual actions and attachments before extraction.
        if ($mime !== 'application/pdf') {
            $dimensions = @getimagesize($file->getRealPath());
            abort_unless($dimensions && $dimensions[0] * $dimensions[1] <= 20000000, 422, 'Use a valid image with no more than 20 megapixels.');
        }
        $hash = hash('sha256', $bytes);
        $existing = AdvertisementImport::where('user_id', $request->user()->id)->where('sha256', $hash)->first();
        if ($existing) {
            return response()->json(['data' => $existing, 'message' => 'This file is already in your import history.']);
        }
        $path = $file->store('advertisements', 'local');
        abort_unless($path, 503, 'The file could not be stored. Please try again.');
        try {
            $import = DB::transaction(function () use ($request, $file, $mime, $hash, $path) {
                $import = AdvertisementImport::create(['user_id' => $request->user()->id, 'filename' => mb_substr(basename($file->getClientOriginalName()), 0, 255), 'path' => $path, 'mime' => $mime, 'size' => $file->getSize(), 'sha256' => $hash, 'source_url' => $request->input('source_url')]);
                Audit::record($request->user()->id, 'advertisement.uploaded', 'advertisement', $import->id, null, ['filename' => $import->filename, 'status' => 'queued']);
                ExtractAdvertisement::dispatch($import->id)->afterCommit();

                return $import;
            });
        } catch (\Throwable $exception) {
            if (! AdvertisementImport::where('path', $path)->exists()) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json(['data' => $import], 202);
    }

    public function show(Request $request, AdvertisementImport $advertisement)
    {
        $this->authorizeImport($request, $advertisement);

        return ['data' => $advertisement];
    }

    public function download(Request $request, AdvertisementImport $advertisement)
    {
        $this->authorizeImport($request, $advertisement);

        return Storage::disk('local')->download($advertisement->path, $advertisement->filename, ['X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "default-src 'none'; sandbox"]);
    }

    public function contentSource(Content $content)
    {
        Gate::authorize('view', $content);
        $advertisement = AdvertisementImport::where('content_id', $content->id)->firstOrFail();

        return Storage::disk('local')->download($advertisement->path, $advertisement->filename, ['X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "default-src 'none'; sandbox"]);
    }

    public function retry(Request $request, AdvertisementImport $advertisement)
    {
        $this->authorizeImport($request, $advertisement);
        abort_unless(AdvertisementImport::whereKey($advertisement->id)->where('status', 'failed')->update(['status' => 'queued', 'error' => null, 'updated_at' => now()]), 409, 'Only a failed extraction can be retried.');
        Audit::record($request->user()->id, 'advertisement.retried', 'advertisement', $advertisement->id, null, ['status' => 'queued']);
        ExtractAdvertisement::dispatch($advertisement->id);

        return response()->json(['data' => $advertisement->fresh()], 202);
    }

    public function draft(SaveContentRequest $request, AdvertisementImport $advertisement)
    {
        $this->authorizeImport($request, $advertisement);
        $input = $request->validated();
        Gate::authorize($input['type'].'.create');
        $content = DB::transaction(function () use ($request, $advertisement, $input) {
            $advertisement = AdvertisementImport::lockForUpdate()->findOrFail($advertisement->id);
            abort_unless($advertisement->status === 'ready' && ! $advertisement->content_id, 409, 'This import is not ready or already has a draft.');
            $termIds = $input['term_ids'] ?? [];
            unset($input['term_ids']);
            $content = Content::create([...$input, 'author_id' => $request->user()->id, 'status' => 'draft']);
            $content->syncTerms($termIds);
            $advertisement->update(['content_id' => $content->id, 'status' => 'imported']);
            Audit::record($request->user()->id, 'content.create', 'content', $content->id, null, $content->toArray(), 'Advertisement import #'.$advertisement->id);

            return $content;
        });

        return response()->json(['data' => $content], 201);
    }
}
