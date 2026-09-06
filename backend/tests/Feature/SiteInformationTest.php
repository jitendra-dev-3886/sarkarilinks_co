<?php

namespace Tests\Feature;

use App\Domain\Access\Role;
use App\Http\Controllers\SitePageController;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteInformationTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role): User
    {
        $this->seed(AccessControlSeeder::class);
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->firstOrFail());

        return $user;
    }

    public function test_information_pages_render_and_draft_policies_are_not_indexed(): void
    {
        foreach (array_keys(SitePageController::pages()) as $slug) {
            $this->getJson('/api/v1/pages/'.$slug)->assertOk();
            $this->get('/'.$slug)->assertOk()->assertSee(SitePageController::page($slug)['title']);
        }
        $this->get('/privacy-policy')->assertSee('noindex,follow');
        $this->get('/sitemap.xml?page=1')->assertSee('/admissions')->assertSee('/certificate-verification')->assertSee('/about-us')->assertDontSee('/privacy-policy');
        $this->getJson('/api/v1/pages/not-real')->assertNotFound();
    }

    public function test_only_administrator_can_update_pages_and_stale_edits_are_rejected(): void
    {
        $input = SitePageController::current();
        $this->getJson('/api/v1/admin/site-information')->assertUnauthorized();
        $author = $this->staff('author');
        $this->actingAs($author)->putJson('/api/v1/admin/site-information', $input)->assertForbidden();
        $admin = $this->staff('administrator');
        $input['document']['owner'] = 'Synthetic Site Owner';
        $input['document']['support_email'] = 'support@example.test';
        $input['document']['pages']['about-us']['title'] = '<script>alert(1)</script>';
        $input['document']['pages']['privacy-policy']['review_required'] = false;
        $this->actingAs($admin)->putJson('/api/v1/admin/site-information', $input)->assertOk()->assertJsonPath('data.version', 2);
        $this->getJson('/api/v1/pages/contact-us')->assertJsonPath('data.support_email', 'support@example.test');
        $this->get('/about-us')->assertDontSee('<script>alert(1)</script>', false)->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false);
        $this->get('/privacy-policy')->assertSee('index,follow')->assertDontSee('noindex,follow');
        $this->putJson('/api/v1/admin/site-information', $input)->assertConflict();
        $this->assertDatabaseHas('audit_logs', ['action' => 'site-information.updated']);
    }

    public function test_reviewed_policies_require_real_contact_fields_and_payload_is_validated(): void
    {
        $this->actingAs($this->staff('administrator'));
        $input = SitePageController::current();
        $input['document']['pages']['privacy-policy']['review_required'] = false;
        $this->putJson('/api/v1/admin/site-information', $input)->assertUnprocessable();
        $input['document']['support_email'] = 'not-an-email';
        $this->putJson('/api/v1/admin/site-information', $input)->assertUnprocessable();
    }

    public function test_new_categories_support_author_drafts_without_granting_publication(): void
    {
        $author = $this->staff('author');
        foreach (['admissions', 'certificate-verification'] as $type) {
            $this->assertTrue($author->hasPermission($type.'.create'));
            $this->assertFalse($author->hasPermission($type.'.publish'));
            $this->actingAs($author)->postJson('/api/v1/admin/content', ['type' => $type, 'locale' => 'en', 'slug' => 'synthetic-'.$type, 'title' => 'Synthetic '.$type, 'summary' => 'Fixture only', 'body' => 'Official instructions for testing.', 'organization' => 'Test authority', 'source_url' => 'https://example.org'])->assertCreated();
            $this->getJson('/api/v1/content?type='.$type)->assertOk()->assertJsonCount(0, 'data');
            $this->get('/'.$type)->assertOk();
        }
    }
}
