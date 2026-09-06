<?php

use App\Http\Controllers\AccessController;
use App\Http\Controllers\AdminContentController;
use App\Http\Controllers\SessionController;
use App\Http\Middleware\PrivateResponse;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['service' => 'SarkariLinks API', 'frontend' => 'http://localhost:5173']);
});

// Browser session endpoints intentionally use the web middleware group: encrypted
// HttpOnly cookies, session rotation and Laravel CSRF protection on every write.
Route::prefix('api/v1')->middleware([PrivateResponse::class, 'throttle:browser'])->group(function () {
    Route::get('/session/csrf', fn () => response()->json(['token' => csrf_token()]));
    Route::get('/session', [SessionController::class, 'show']);
    Route::post('/session', [SessionController::class, 'login'])->middleware('throttle:login');
    Route::delete('/session', [SessionController::class, 'logout'])->middleware('auth');
    Route::prefix('admin')->middleware(['auth', 'can:cms.access'])->group(function () {
        Route::get('/tools', [\App\Http\Controllers\WorkspaceController::class, 'manageTools'])->middleware('can:tools.manage');
        Route::put('/tools/{slug}', [\App\Http\Controllers\WorkspaceController::class, 'saveTool'])->middleware('can:tools.manage');
        Route::get('/operations', [\App\Http\Controllers\WorkspaceController::class, 'operations'])->middleware('can:operations.view');
        Route::post('/terms', [\App\Http\Controllers\WorkspaceController::class, 'saveTerm'])->middleware('can:taxonomy.manage');
        Route::get('/advertisements', [\App\Http\Controllers\AdvertisementController::class, 'index']);
        Route::post('/advertisements', [\App\Http\Controllers\AdvertisementController::class, 'store'])->middleware('throttle:6,1');
        Route::get('/advertisements/{advertisement}', [\App\Http\Controllers\AdvertisementController::class, 'show']);
        Route::get('/advertisements/{advertisement}/download', [\App\Http\Controllers\AdvertisementController::class, 'download']);
        Route::post('/advertisements/{advertisement}/retry', [\App\Http\Controllers\AdvertisementController::class, 'retry'])->middleware('throttle:6,1');
        Route::post('/advertisements/{advertisement}/draft', [\App\Http\Controllers\AdvertisementController::class, 'draft']);
        Route::get('/content', [AdminContentController::class, 'index']);
        Route::post('/content', [AdminContentController::class, 'store']);
        Route::get('/content/{content}', [AdminContentController::class, 'show']);
        Route::put('/content/{content}', [AdminContentController::class, 'update']);
        Route::post('/content/{content}/transitions', [AdminContentController::class, 'transition']);
        Route::get('/roles', [AccessController::class, 'roles'])->middleware('can:roles.view');
        Route::get('/permissions', [AccessController::class, 'permissions'])->middleware('can:roles.view');
        Route::put('/roles/{role}/permissions', [AccessController::class, 'updateRole'])->middleware('can:roles.manage');
        Route::get('/users', [AccessController::class, 'users'])->middleware('can:users.manage');
        Route::post('/users', [AccessController::class, 'createUser'])->middleware('can:users.manage');
        Route::put('/users/{user}/roles', [AccessController::class, 'assign'])->middleware('can:users.manage');
        Route::get('/audit', [AccessController::class, 'audit'])->middleware('can:audit.view');
    });
});
