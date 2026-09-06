<?php

namespace App\Jobs;

use App\Application\AdvertisementExtractor;
use App\Application\Audit;
use App\Models\AdvertisementImport;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ExtractAdvertisement implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;
    public int $timeout = 270;

    public function __construct(public int $importId) {}

    public function handle(AdvertisementExtractor $extractor): void
    {
        if (! AdvertisementImport::whereKey($this->importId)->where('status', 'queued')->update(['status' => 'processing', 'error' => null, 'updated_at' => now()])) {
            return;
        }
        $import = AdvertisementImport::findOrFail($this->importId);
        try {
            $result = $extractor->extract(Storage::disk('local')->path($import->path));
            if (mb_strlen(trim($result['text'] ?? '')) < 20 || mb_strlen($result['text']) > 100000) {
                throw new \RuntimeException('Unreadable or oversized extracted text.');
            }
            DB::transaction(function () use ($import, $result) {
                $import->update(['status' => 'ready', 'extracted_text' => $result['text'], 'suggestions' => $result['suggestions'], 'extraction' => $result['metadata']]);
                Audit::record(null, 'advertisement.extracted', 'advertisement', $import->id, null, ['status' => 'ready']);
            });
        } catch (Throwable $exception) {
            $this->failed($exception);
        }
    }

    public function failed(?Throwable $exception): void
    {
        AdvertisementImport::whereKey($this->importId)->whereIn('status', ['queued', 'processing'])->update([
            'status' => 'failed', 'error' => 'Extraction could not finish. Use a clear PDF (maximum 20 pages), JPG or PNG, or retry after checking the extraction worker.',
        ]);
    }
}
