<?php

use App\Http\Controllers\ContentController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:120,1')->group(function () {
    Route::get('/tools', [\App\Http\Controllers\WorkspaceController::class, 'tools']);
    Route::get('/terms', [\App\Http\Controllers\WorkspaceController::class, 'terms']);
    Route::get('/content', [ContentController::class, 'index'])->name('content.index');
    Route::get('/content/{type}/{slug}', [ContentController::class, 'show'])->name('content.show');
    Route::get('/health/ready', function () {
        try {
            DB::select('SELECT 1');

            return response()->json(['status' => 'ready']);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['status' => 'unavailable'], 503);
        }
    });
});
