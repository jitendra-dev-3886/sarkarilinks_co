<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CleanupMediaDownloads extends Command
{
    protected $signature = 'media:cleanup';

    protected $description = 'Remove expired private media files and recover interrupted downloads';

    public function handle(): int
    {
        $records = DB::table('media_downloads')->where('expires_at', '<=', now())->orWhere(fn ($q) => $q->whereIn('status', ['queued', 'processing'])->where('updated_at', '<', now()->subMinutes(10)))->get();
        foreach ($records as $record) {
            if (! Str::isUuid($record->id)) {
                continue;
            }
            Storage::disk('local')->deleteDirectory('media-downloads/'.$record->id);
            if ($record->expires_at <= now()->toDateTimeString()) {
                DB::table('media_downloads')->where('id', $record->id)->delete();
            } else {
                DB::table('media_downloads')->where('id', $record->id)->update(['status' => 'failed', 'error' => 'Processing was interrupted. Please submit the link again.', 'updated_at' => now()]);
            }
        }

        return self::SUCCESS;
    }
}
