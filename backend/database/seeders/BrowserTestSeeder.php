<?php

namespace Database\Seeders;

use App\Domain\Access\Role;
use App\Domain\Content\Content;
use App\Models\User;
use Illuminate\Database\Seeder;

class BrowserTestSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('testing')) {
            throw new \RuntimeException('Browser fixtures require APP_ENV=testing and an isolated test database.');
        }
        $this->call(AccessControlSeeder::class);
        foreach (['administrator', 'author', 'reviewer', 'operations'] as $role) {
            $user = User::create(['name' => 'Browser Test '.ucfirst($role), 'email' => $role.'@example.test', 'password' => 'BrowserTest123!']);
            $user->roles()->attach(Role::where('name', $role)->firstOrFail());
        }
        Content::create(['type' => 'jobs', 'locale' => 'en', 'slug' => 'member-test-opportunity', 'title' => 'Synthetic member opportunity', 'summary' => 'Browser fixture only. Not a real government job.', 'body' => 'Synthetic application details for testing bookmarks.', 'organization' => 'Test organization', 'source_url' => 'https://example.org/member-test', 'status' => 'published', 'verified_at' => now(), 'published_at' => now()->subMinute()]);
    }
}
