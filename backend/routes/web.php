<?php

use App\Http\Controllers\AccessController;
use App\Http\Controllers\AdminContentController;
use App\Http\Controllers\AdvertisementController;
use App\Http\Controllers\AppearanceController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SitePageController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Middleware\PrivateResponse;
use Illuminate\Support\Facades\Route;

Route::get('/robots.txt', [SeoController::class, 'robots']);
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);

// Browser session endpoints intentionally use the web middleware group: encrypted
// HttpOnly cookies, session rotation and Laravel CSRF protection on every write.
Route::prefix('api/v1')->middleware([PrivateResponse::class, 'throttle:browser'])->group(function () {
    Route::get('/session/csrf', fn () => response()->json(['token' => csrf_token()]));
    Route::get('/session', [SessionController::class, 'show']);
    Route::post('/session', [SessionController::class, 'login'])->middleware('throttle:login');
    Route::delete('/session', [SessionController::class, 'logout'])->middleware('auth');
    Route::post('/register', [MemberController::class, 'register'])->middleware('throttle:registration');
    Route::prefix('account')->middleware('auth')->group(function () {
        Route::get('/downloads', [MediaController::class, 'index']);
        Route::post('/downloads', [MediaController::class, 'store'])->middleware('throttle:media-submit');
        Route::get('/downloads/{id}/file', [MediaController::class, 'download'])->whereUuid('id');
        Route::get('/profile', [MemberController::class, 'profile']);
        Route::put('/profile', [MemberController::class, 'update']);
        Route::put('/password', [MemberController::class, 'password'])->middleware('throttle:password-change');
        Route::get('/recommendations', [MemberController::class, 'recommendations']);
        Route::get('/bookmarks', [MemberController::class, 'bookmarks']);
        Route::put('/bookmarks/{content}', [MemberController::class, 'bookmark']);
        Route::delete('/bookmarks/{content}', [MemberController::class, 'removeBookmark'])->whereNumber('content');
        Route::get('/resume', [MemberController::class, 'resume']);
        Route::put('/resume', [MemberController::class, 'saveResume']);
        Route::delete('/resume', [MemberController::class, 'deleteResume']);
    });
    Route::prefix('admin')->middleware(['auth', 'can:cms.access'])->group(function () {
        Route::get('/site-information', [SitePageController::class, 'manage'])->middleware('can:settings.manage');
        Route::put('/site-information', [SitePageController::class, 'update'])->middleware('can:settings.manage');
        Route::get('/appearance', [AppearanceController::class, 'manage'])->middleware('can:settings.manage');
        Route::put('/appearance', [AppearanceController::class, 'update'])->middleware('can:settings.manage');
        Route::get('/tools', [WorkspaceController::class, 'manageTools'])->middleware('can:tools.manage');
        Route::put('/tools/{slug}', [WorkspaceController::class, 'saveTool'])->middleware('can:tools.manage');
        Route::get('/operations', [WorkspaceController::class, 'operations'])->middleware('can:operations.view');
        Route::post('/terms', [WorkspaceController::class, 'saveTerm'])->middleware('can:taxonomy.manage');
        Route::get('/advertisements', [AdvertisementController::class, 'index']);
        Route::post('/advertisements', [AdvertisementController::class, 'store'])->middleware('throttle:advertisement-submit');
        Route::get('/advertisements/{advertisement}', [AdvertisementController::class, 'show']);
        Route::get('/advertisements/{advertisement}/download', [AdvertisementController::class, 'download']);
        Route::post('/advertisements/{advertisement}/retry', [AdvertisementController::class, 'retry'])->middleware('throttle:advertisement-submit');
        Route::post('/advertisements/{advertisement}/draft', [AdvertisementController::class, 'draft']);
        Route::get('/content', [AdminContentController::class, 'index']);
        Route::post('/content', [AdminContentController::class, 'store']);
        Route::get('/content/{content}', [AdminContentController::class, 'show']);
        Route::get('/content/{content}/advertisement', [AdvertisementController::class, 'contentSource']);
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

Route::get('/{path?}', [SeoController::class, 'page'])->where('path', '(?!api(?:/|$)).*');
