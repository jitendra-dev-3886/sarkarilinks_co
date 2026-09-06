<?php

namespace App\Console\Commands;

use App\Application\Audit;
use App\Domain\Access\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateStaff extends Command
{
    protected $signature = 'portal:create-staff {email} {--role=administrator}';

    protected $description = 'Provision a staff account with an interactive password prompt';

    public function handle(): int
    {
        $role = Role::where('name', $this->option('role'))->first();
        if (! $role) {
            $this->error('Unknown role. Run database seeding first.');

            return self::FAILURE;
        }
        $input = ['email' => strtolower($this->argument('email')), 'name' => $this->ask('Name'), 'password' => $this->secret('Password (at least 12 characters, upper/lower case and numbers)')];
        $validator = Validator::make($input, ['email' => ['required', 'email', 'unique:users,email'], 'name' => ['required', 'string', 'max:255'], 'password' => ['required', Password::min(12)->mixedCase()->numbers()]]);
        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }
        DB::transaction(function () use ($input, $role) {
            $user = User::create($input);
            $user->roles()->attach($role);
            Audit::record(null, 'user.provisioned', 'user', $user->id, null, ['roles' => [$role->name]]);
        });
        $this->info('Staff account created. Sign in at /login on the frontend.');

        return self::SUCCESS;
    }
}
