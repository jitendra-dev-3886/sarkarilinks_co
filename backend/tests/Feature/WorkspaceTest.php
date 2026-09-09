<?php

namespace Tests\Feature;

use App\Domain\Access\Role;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkspaceTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        $this->seed(AccessControlSeeder::class);
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->firstOrFail());

        return $user;
    }

    public function test_tool_manager_can_configure_tools_but_operations_cannot(): void
    {
        $this->actingAs($this->user('tool-manager'));
        $this->getJson('/api/v1/admin/tools')->assertOk()->assertJsonCount(12, 'data');
        $this->putJson('/api/v1/admin/tools/age', ['name' => 'Age calculator', 'help' => 'Read the official cut-off date.', 'enabled' => false])->assertOk();
        $this->getJson('/api/v1/tools')->assertJsonCount(11, 'data');
        $this->getJson('/api/v1/admin/operations')->assertForbidden();
        $this->assertDatabaseHas('audit_logs', ['action' => 'tool.updated']);
        $this->actingAs($this->user('operations'));
        $this->getJson('/api/v1/admin/operations')->assertOk()->assertJsonPath('data.failed_jobs', 0);
        $this->putJson('/api/v1/admin/tools/age', ['name' => 'Changed', 'help' => 'Changed', 'enabled' => true])->assertForbidden();
    }

    public function test_taxonomy_management_and_content_tag_validation(): void
    {
        $this->actingAs($this->user('administrator'));
        $term = $this->postJson('/api/v1/admin/terms', ['taxonomy' => 'qualification', 'slug' => 'graduate', 'label' => 'Graduate', 'locale' => 'en'])->assertOk()->json('data.id');
        $author = $this->user('author');
        $this->actingAs($author);
        $this->postJson('/api/v1/admin/terms', [])->assertForbidden();
        $input = ['type' => 'jobs', 'locale' => 'en', 'slug' => 'filter-test', 'title' => 'Filter test', 'summary' => 'Summary', 'body' => 'Details', 'organization' => 'Test Board', 'source_url' => 'https://example.org', 'term_ids' => [$term]];
        $id = $this->postJson('/api/v1/admin/content', $input)->assertCreated()->assertJsonPath('data.term_ids.0', $term)->json('data.id');
        $this->assertDatabaseHas('content_term', ['content_id' => $id, 'term_id' => $term]);
        $this->putJson('/api/v1/admin/content/'.$id, [...$input, 'term_ids' => [99999]])->assertUnprocessable();
        $this->putJson('/api/v1/admin/content/'.$id, [...$input, 'term_ids' => []])->assertOk();
        $this->assertDatabaseCount('content_term', 0);
    }
}
