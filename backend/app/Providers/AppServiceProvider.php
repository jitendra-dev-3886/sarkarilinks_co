<?php

namespace App\Providers;

use App\Domain\Content\Content;
use App\Models\User;
use App\Policies\ContentPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('browser', fn (Request $request) => Limit::perMinute(120)->by($request->ip()));
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('registration', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('password-change', fn (Request $request) => Limit::perMinute(5)->by($request->user()?->id ?? $request->ip()));
        RateLimiter::for('media-submit', fn (Request $request) => Limit::perMinute(2)->by($request->user()?->id ?? $request->ip()));
        RateLimiter::for('advertisement-submit', fn (Request $request) => Limit::perMinute(6)->by($request->user()?->id ?? $request->ip()));
        Gate::policy(Content::class, ContentPolicy::class);
        Gate::before(function (User $user, string $ability) {
            // Model policy abilities have no dot and must run their ownership rules.
            return str_contains($ability, '.') ? $user->hasPermission($ability) : null;
        });
    }
}
