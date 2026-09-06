<?php

use App\Http\Controllers\AppearanceController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\WorkspaceController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:120,1')->group(function () {
    Route::get('/appearance', [AppearanceController::class, 'show']);
    Route::get('/tools', [WorkspaceController::class, 'tools']);
    Route::get('/terms', [WorkspaceController::class, 'terms']);
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
