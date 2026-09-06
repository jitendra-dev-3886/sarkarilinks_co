<?php

namespace Tests\Feature;

use App\Domain\Access\Role;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SessionSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_csrf_is_required_when_test_bypass_is_disabled(): void
    {
        $this->app->instance('env', 'local');
        $this->postJson('/api/v1/session', ['email' => 'test@example.com', 'password' => 'invalid'])->assertStatus(419);
    }

    public function test_repeated_bad_logins_are_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/session', ['email' => 'nobody@example.com', 'password' => 'invalid'])->assertUnprocessable();
        }
        $this->postJson('/api/v1/session', ['email' => 'nobody@example.com', 'password' => 'invalid'])
            ->assertUnprocessable()->assertSee('Too many attempts');
    }

    public function test_admin_creates_users_and_edits_role_permissions_with_audit(): void
    {
        $this->seed(AccessControlSeeder::class);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'administrator')->firstOrFail());
        $authorRole = Role::where('name', 'author')->firstOrFail();
        $this->actingAs($admin);
        $this->postJson('/api/v1/admin/users', ['name' => 'New Author', 'email' => 'author@example.com', 'password' => 'AuthorPassword123', 'roles' => ['author']])->assertCreated();
        $this->putJson('/api/v1/admin/roles/'.$authorRole->id.'/permissions', ['permissions' => ['cms.access', 'jobs.view']])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'role.permissions_changed']);
        $this->actingAs(User::where('email', 'author@example.com')->firstOrFail());
        $this->assertFalse(auth()->user()->hasPermission('jobs.create'));
        $this->seed(AccessControlSeeder::class);
        $this->assertFalse(auth()->user()->hasPermission('jobs.create'), 'Re-seeding must not restore revoked permissions.');
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->putJson('/api/v1/admin/roles/'.$authorRole->id.'/permissions', ['permissions' => ['users.manage']])->assertForbidden();
    }

    public function test_delegated_user_manager_cannot_grant_administrator_privileges(): void
    {
        $this->seed(AccessControlSeeder::class);
        $role = Role::where('name', 'author')->firstOrFail();
        DB::table('permission_role')->insert(['role_id' => $role->id, 'permission_id' => DB::table('permissions')->where('name', 'users.manage')->value('id')]);
        $manager = User::factory()->create();
        $manager->roles()->attach($role);
        $target = User::factory()->create();
        $target->roles()->attach(Role::where('name', 'user')->firstOrFail());
        $this->actingAs($manager)->putJson('/api/v1/admin/users/'.$target->id.'/roles', ['roles' => ['administrator']])->assertForbidden();
        $this->postJson('/api/v1/admin/users', ['name' => 'Escalated', 'email' => 'escalated@example.com', 'password' => 'NeverGrantThis123', 'roles' => ['administrator']])->assertForbidden();
    }
}
