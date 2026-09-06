<?php

namespace App\Console\Commands;

use App\Application\Audit;
use App\Models\AdvertisementImport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RecoverAdvertisementImports extends Command
{
    protected $signature = 'advertisements:recover-stalled';

    protected $description = 'Mark interrupted extractions as retryable after the worker timeout';

    public function handle(): int
    {
        AdvertisementImport::where('status', 'processing')->where('updated_at', '<', now()->subMinutes(6))->pluck('id')->each(function ($id) {
            DB::transaction(function () use ($id) {
                $changed = AdvertisementImport::whereKey($id)->where('status', 'processing')->where('updated_at', '<', now()->subMinutes(6))->update(['status' => 'failed', 'error' => 'The extraction worker was interrupted. Retry this import.', 'updated_at' => now()]);
                if ($changed) {
                    Audit::record(null, 'advertisement.interrupted', 'advertisement', $id, null, ['status' => 'failed']);
                }
            });
        });

        return self::SUCCESS;
    }
}
