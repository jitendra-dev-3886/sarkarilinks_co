<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('content:publish-due')->everyMinute()->withoutOverlapping();
Schedule::command('advertisements:recover-stalled')->everyMinute()->withoutOverlapping();
Schedule::command('media:cleanup')->everyMinute()->withoutOverlapping();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
