<?php

namespace Tests\Feature;

use App\Domain\Access\Role;
use App\Domain\Content\Content;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AccessWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccessControlSeeder::class);
    }

    private function user(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->firstOrFail());

        return $user;
    }

    private function draft(User $author): Content
    {
        return Content::create([...$this->input(), 'author_id' => $author->id, 'status' => 'draft']);
    }

    private function input(): array
    {
        return ['type' => 'jobs', 'locale' => 'en', 'slug' => fake()->unique()->slug(), 'title' => 'Synthetic notice', 'summary' => 'Test summary', 'body' => 'Test body', 'organization' => 'Test department', 'source_url' => 'https://example.org/notice'];
    }

    public function test_guests_and_registered_users_cannot_access_cms(): void
    {
        $this->getJson('/api/v1/admin/content')->assertUnauthorized();
        $this->actingAs($this->user('user'))->getJson('/api/v1/admin/content')->assertForbidden();
    }

    public function test_author_cannot_view_edit_or_submit_another_authors_draft(): void
    {
        $content = $this->draft($this->user('author'));
        $this->actingAs($this->user('author'));
        $this->getJson('/api/v1/admin/content')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/admin/content/'.$content->id)->assertForbidden();
        $this->putJson('/api/v1/admin/content/'.$content->id, $this->input())->assertForbidden();
        $this->postJson('/api/v1/admin/content/'.$content->id.'/transitions', ['action' => 'submit'])->assertForbidden();
    }

    public function test_author_to_independent_reviewer_publication_and_audit(): void
    {
        $author = $this->user('author');
        $this->actingAs($author);
        $id = $this->postJson('/api/v1/admin/content', [...$this->input(), 'status' => 'published', 'reviewer_id' => $author->id])->assertCreated()->json('data.id');
        $content = Content::findOrFail($id);
        $this->assertSame('draft', $content->status->value);
        $this->assertNull($content->reviewer_id);
        $path = '/api/v1/admin/content/'.$id.'/transitions';
        $this->postJson($path, ['action' => 'submit'])->assertOk()->assertJsonPath('data.status', 'in_review');
        $this->putJson('/api/v1/admin/content/'.$id, $this->input())->assertForbidden();
        $this->postJson($path, ['action' => 'approve'])->assertForbidden();
        $this->actingAs($this->user('reviewer'));
        $this->postJson($path, ['action' => 'publish'])->assertUnprocessable();
        $this->postJson($path, ['action' => 'approve'])->assertOk();
        $this->postJson($path, ['action' => 'publish'])->assertOk();
        $this->getJson('/api/v1/content/jobs/'.$content->slug)->assertOk();
        $this->assertDatabaseCount('audit_logs', 4);
    }

    public function test_administrator_cannot_approve_own_content(): void
    {
        $admin = $this->user('administrator');
        $content = $this->draft($admin);
        $content->update(['status' => 'in_review']);
        $this->actingAs($admin)->postJson('/api/v1/admin/content/'.$content->id.'/transitions', ['action' => 'approve'])->assertForbidden();
    }

    public function test_return_requires_reason_and_restores_author_editing(): void
    {
        $author = $this->user('author');
        $content = $this->draft($author);
        $content->update(['status' => 'in_review']);
        $this->actingAs($this->user('reviewer'));
        $path = '/api/v1/admin/content/'.$content->id.'/transitions';
        $this->postJson($path, ['action' => 'return'])->assertUnprocessable();
        $this->postJson($path, ['action' => 'return', 'reason' => 'Please clarify the eligibility.'])->assertOk();
        $this->actingAs($author)->putJson('/api/v1/admin/content/'.$content->id, $this->input())->assertOk();
    }

    public function test_operations_and_tool_managers_have_no_publish_or_user_management_permission(): void
    {
        $content = $this->draft($this->user('author'));
        foreach (['operations', 'tool-manager'] as $role) {
            $this->actingAs($this->user($role));
            $this->postJson('/api/v1/admin/content', $this->input())->assertForbidden();
            $this->postJson('/api/v1/admin/content/'.$content->id.'/transitions', ['action' => 'publish'])->assertForbidden();
            $this->getJson('/api/v1/admin/users')->assertForbidden();
            $this->getJson('/api/v1/admin/audit')->assertForbidden();
        }
    }

    public function test_administrator_assigns_roles_with_immediate_effect_and_cannot_change_own_roles(): void
    {
        $admin = $this->user('administrator');
        $author = $this->user('author');
        $this->actingAs($admin)->putJson('/api/v1/admin/users/'.$author->id.'/roles', ['roles' => ['user']])->assertOk();
        $this->putJson('/api/v1/admin/users/'.$admin->id.'/roles', ['roles' => ['user']])->assertForbidden();
        $this->actingAs($author)->getJson('/api/v1/admin/content')->assertForbidden();
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.roles_changed', 'actor_id' => $admin->id]);
    }

    public function test_scheduling_and_expiry_are_idempotent(): void
    {
        $content = $this->draft($this->user('author'));
        $reviewer = $this->user('reviewer');
        $content->update(['status' => 'approved', 'verified_at' => now(), 'reviewer_id' => $reviewer->id]);
        $this->actingAs($reviewer)->postJson('/api/v1/admin/content/'.$content->id.'/transitions', ['action' => 'schedule', 'published_at' => now()->addMinutes(10)->toIso8601String()])->assertOk();
        $this->artisan('content:publish-due')->assertSuccessful();
        $this->assertSame('scheduled', $content->fresh()->status->value);
        $this->travel(11)->minutes();
        $this->artisan('content:publish-due')->assertSuccessful();
        $this->artisan('content:publish-due')->assertSuccessful();
        $this->assertSame('published', $content->fresh()->status->value);
        $this->assertDatabaseCount('audit_logs', 2);
        $content->update(['expires_at' => now()->subMinute()]);
        $this->artisan('content:publish-due')->assertSuccessful();
        $this->assertSame('archived', $content->fresh()->status->value);
    }

    public function test_audit_rows_cannot_be_changed_in_database(): void
    {
        $this->actingAs($this->user('author'))->postJson('/api/v1/admin/content', $this->input())->assertCreated();
        $this->expectException(QueryException::class);
        DB::table('audit_logs')->update(['action' => 'tampered']);
    }

    public function test_login_logout_and_permission_identity(): void
    {
        $user = $this->user('author');
        $this->postJson('/api/v1/session', ['email' => $user->email, 'password' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/v1/session', ['email' => $user->email, 'password' => 'password'])->assertOk()->assertJsonPath('data.roles.0', 'author');
        $this->getJson('/api/v1/admin/content')->assertOk();
        $this->deleteJson('/api/v1/session')->assertNoContent();
        $this->getJson('/api/v1/admin/content')->assertUnauthorized();
    }
}
