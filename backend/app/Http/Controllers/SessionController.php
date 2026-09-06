<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SessionController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json(['data' => $user ? [
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
            'roles' => $user->roles()->pluck('name'), 'permissions' => $user->permissionNames(),
        ] : null])->header('Cache-Control', 'no-store');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $credentials['email'] = Str::lower(trim($credentials['email']));
        $key = 'login:'.hash('sha256', $credentials['email'].'|'.$request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['email' => 'Too many attempts. Try again in '.RateLimiter::availableIn($key).' seconds.']);
        }
        if (! Auth::attempt($credentials)) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages(['email' => 'The supplied credentials are incorrect.']);
        }
        RateLimiter::clear($key);
        $request->session()->regenerate();

        return $this->show($request);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
