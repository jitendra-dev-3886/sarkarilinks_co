<?php

namespace Tests\Feature;

use App\Domain\Access\Role;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AppearanceTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        $this->seed(AccessControlSeeder::class);
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->firstOrFail());

        return $user;
    }

    public function test_public_settings_and_rendered_html_agree_after_admin_applies_a_design(): void
    {
        $this->getJson('/api/v1/appearance')->assertOk()->assertJsonPath('data.theme', 'ocean')->assertHeader('Cache-Control', 'no-store, private');
        $admin = $this->user('administrator');
        $this->actingAs($admin)->putJson('/api/v1/admin/appearance', ['theme' => 'editorial', 'text_size' => 'large', 'version' => 1])->assertOk()->assertJsonPath('data.version', 2);
        $this->getJson('/api/v1/appearance')->assertJsonPath('data.theme', 'editorial')->assertJsonPath('data.text_size', 'large');
        $this->get('/')->assertOk()->assertSee('data-theme="editorial" data-text-size="large"', false);
        $this->assertDatabaseHas('audit_logs', ['actor_id' => $admin->id, 'action' => 'appearance.updated']);
    }

    public function test_guest_member_and_delegated_settings_permission_cannot_change_global_appearance(): void
    {
        $body = ['theme' => 'forest', 'text_size' => 'standard', 'version' => 1];
        $this->putJson('/api/v1/admin/appearance', $body)->assertUnauthorized();
        $this->actingAs($this->user('user'))->getJson('/api/v1/admin/appearance')->assertForbidden();
        $author = $this->user('author');
        $role = Role::where('name', 'author')->firstOrFail();
        DB::table('permission_role')->insert(['role_id' => $role->id, 'permission_id' => DB::table('permissions')->where('name', 'settings.manage')->value('id')]);
        $this->actingAs($author)->putJson('/api/v1/admin/appearance', $body)->assertForbidden();
        $this->getJson('/api/v1/admin/appearance')->assertForbidden();
        $this->assertDatabaseHas('portal_appearance', ['theme' => 'ocean', 'version' => 1]);
    }

    public function test_stale_edits_and_arbitrary_style_payloads_do_not_overwrite_a_saved_design(): void
    {
        $this->actingAs($this->user('administrator'));
        $this->putJson('/api/v1/admin/appearance', ['theme' => 'studio', 'text_size' => 'large', 'version' => 1])->assertOk();
        $this->putJson('/api/v1/admin/appearance', ['theme' => 'forest', 'text_size' => 'standard', 'version' => 1])->assertStatus(409);
        $this->putJson('/api/v1/admin/appearance', ['theme' => 'url(https://untrusted.example)', 'text_size' => 'standard', 'version' => 2])->assertUnprocessable();
        $this->putJson('/api/v1/admin/appearance', ['theme' => 'focus', 'text_size' => 'tiny', 'version' => 2])->assertUnprocessable();
        $this->assertDatabaseHas('portal_appearance', ['theme' => 'studio', 'text_size' => 'large', 'version' => 2]);
        $this->assertSame(1, DB::table('audit_logs')->where('action', 'appearance.updated')->count());
    }

    public function test_a_homepage_preview_url_never_changes_public_settings(): void
    {
        $this->get('/?theme-preview=focus&text-preview=large')->assertOk()->assertSee('data-theme="ocean" data-text-size="standard"', false);
        $this->getJson('/api/v1/appearance')->assertJsonPath('data.theme', 'ocean')->assertJsonPath('data.version', 1);
    }
}
