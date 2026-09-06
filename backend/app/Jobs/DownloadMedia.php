<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Throwable;

class DownloadMedia implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 270;

    public function __construct(public string $downloadId) {}

    public function handle(): void
    {
        if (! DB::table('media_downloads')->where('id', $this->downloadId)->where('status', 'queued')->where('expires_at', '>', now())->update(['status' => 'processing', 'updated_at' => now()])) {
            return;
        }
        $record = DB::table('media_downloads')->where('id', $this->downloadId)->first();
        $relative = 'media-downloads/'.$this->downloadId;
        Storage::disk('local')->makeDirectory($relative);
        try {
            $process = new Process([config('media.python'), config('media.script'), $record->url, $record->format, Storage::disk('local')->path($relative), config('media.ffmpeg')]);
            $process->setTimeout(230);
            $process->run();
            $result = json_decode($process->getOutput(), true);
            if (! $process->isSuccessful() || empty($result['filename']) || basename($result['filename']) !== $result['filename']) {
                throw new \RuntimeException('Source unavailable.');
            }
            $path = $relative.'/'.$result['filename'];
            if (! Storage::disk('local')->exists($path) || Storage::disk('local')->size($path) > 52428800) {
                throw new \RuntimeException('Output limit exceeded.');
            }
            DB::table('media_downloads')->where('id', $this->downloadId)->update(['status' => 'ready', 'title' => mb_substr($result['title'] ?? 'Media download', 0, 255), 'path' => $path, 'size' => Storage::disk('local')->size($path), 'updated_at' => now()]);
        } catch (Throwable $exception) {
            $this->failed($exception);
        }
    }

    public function failed(?Throwable $exception): void
    {
        Storage::disk('local')->deleteDirectory('media-downloads/'.$this->downloadId);
        DB::table('media_downloads')->where('id', $this->downloadId)->whereIn('status', ['queued', 'processing'])->update(['status' => 'failed', 'error' => 'The source could not provide this download. It may require sign-in, restrict downloads, be unavailable, or exceed the 10-minute / 50 MB limit. Try another public video link.', 'updated_at' => now()]);
    }
}
