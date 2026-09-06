<?php

namespace App\Http\Controllers;

use App\Jobs\DownloadMedia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        return ['data' => DB::table('media_downloads')->where('user_id', $request->user()->id)->where('expires_at', '>', now())->latest()->limit(20)->get(['id', 'url', 'title', 'status', 'format', 'size', 'error', 'expires_at'])];
    }

    public function store(Request $request)
    {
        abort_unless(DB::table('portal_tools')->where('slug', 'media-downloader')->where('enabled', true)->exists(), 404);
        $input = $request->validate(['url' => ['required', 'url:https', 'max:2048'], 'format' => ['required', Rule::in(['video', 'audio'])], 'permission' => ['accepted']]);
        $url = parse_url($input['url']);
        $hosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'instagram.com', 'www.instagram.com', 'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch'];
        abort_unless(in_array(strtolower($url['host'] ?? ''), $hosts, true) && ! isset($url['user']) && ! isset($url['pass']) && (! isset($url['port']) || $url['port'] === 443), 422, 'Use a public YouTube, Instagram or Facebook video link.');
        abort_unless(is_file(config('media.python')), 503, 'The media worker is not installed on this server.');
        $id = DB::transaction(function () use ($request, $input) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            abort_if(DB::table('media_downloads')->where('user_id', $request->user()->id)->whereIn('status', ['queued', 'processing'])->where('expires_at', '>', now())->count() >= 2, 429, 'Please wait for your current downloads to finish.');
            $id = (string) Str::uuid();
            DB::table('media_downloads')->insert(['id' => $id, 'user_id' => $request->user()->id, 'url' => $input['url'], 'format' => $input['format'], 'status' => 'queued', 'created_at' => now(), 'updated_at' => now(), 'expires_at' => now()->addHour()]);
            DownloadMedia::dispatch($id)->afterCommit();

            return $id;
        });

        return response()->json(['data' => ['id' => $id, 'status' => 'queued']], 202);
    }

    public function download(Request $request, string $id)
    {
        $file = DB::table('media_downloads')->where('id', $id)->where('user_id', $request->user()->id)->where('status', 'ready')->where('expires_at', '>', now())->first();
        abort_unless($file && $file->path && Storage::disk('local')->exists($file->path), 404);

        return Storage::disk('local')->download($file->path, 'sarkarilinks-'.($file->format === 'audio' ? 'audio.mp3' : 'video.'.pathinfo($file->path, PATHINFO_EXTENSION)), ['X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "default-src 'none'; sandbox"]);
    }
}
