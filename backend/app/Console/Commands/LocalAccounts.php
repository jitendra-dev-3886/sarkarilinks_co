<?php

namespace App\Console\Commands;

use App\Application\Audit;
use App\Domain\Access\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LocalAccounts extends Command
{
    protected $signature = 'portal:local-accounts';

    protected $description = 'Create local-only administrator, author and reviewer accounts with random passwords';

    public function handle(): int
    {
        if (! app()->environment('local') || config('database.default') !== 'sqlite') {
            $this->error('Only available in a local SQLite development environment.');

            return self::FAILURE;
        }
        $credentials = [];
        foreach (['administrator', 'author', 'reviewer'] as $roleName) {
            $email = $roleName.'@sarkarilinks.test';
            if (User::where('email', $email)->exists()) {
                continue;
            }
            $password = Str::password(20);
            DB::transaction(function () use ($email, $password, $roleName) {
                $user = User::create(['name' => 'Local '.ucfirst($roleName), 'email' => $email, 'password' => $password]);
                $user->roles()->attach(Role::where('name', $roleName)->firstOrFail());
                Audit::record(null, 'user.local_provisioned', 'user', $user->id, null, ['roles' => [$roleName]]);
            });
            $credentials[] = ['email' => $email, 'password' => $password, 'role' => $roleName];
        }
        if ($credentials !== []) {
            $path = storage_path('app/private/local-accounts.json');
            file_put_contents($path, json_encode($credentials, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
            $this->info('Local credentials written to backend/storage/app/private/local-accounts.json. Existing accounts were not changed.');
        } else {
            $this->info('Local accounts already exist. Passwords were not reset.');
        }

        return self::SUCCESS;
    }
}
