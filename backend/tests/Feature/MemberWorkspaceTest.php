<?php

namespace Tests\Feature;

use App\Domain\Content\Content;
use App\Jobs\DownloadMedia;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class MemberWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_browsing_does_not_consume_registration_attempts(): void
    {
        for ($i = 0; $i < 8; $i++) {
            $this->getJson('/api/v1/appearance')->assertOk();
        }
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/register', [])->assertUnprocessable();
        }
        $this->postJson('/api/v1/register', [])->assertTooManyRequests();
        $this->getJson('/api/v1/appearance')->assertOk();
    }

    private function notice(array $extra = []): Content
    {
        return Content::create([...['type' => 'jobs', 'locale' => 'en', 'slug' => fake()->unique()->slug(), 'title' => 'Public test job', 'summary' => 'Synthetic notice', 'body' => 'Details', 'organization' => 'Test department', 'source_url' => 'https://example.org', 'status' => 'published', 'verified_at' => now(), 'published_at' => now()->subMinute()], ...$extra]);
    }

    public function test_registration_always_grants_member_only_and_can_sign_back_in(): void
    {
        $this->seed(AccessControlSeeder::class);
        $this->postJson('/api/v1/register', ['name' => 'Member', 'email' => 'member@example.test', 'password' => 'MemberPassword123!', 'password_confirmation' => 'MemberPassword123!', 'roles' => ['administrator'], 'permissions' => ['cms.access']])->assertCreated();
        $this->getJson('/api/v1/session')->assertJsonPath('data.roles', ['user']);
        $this->getJson('/api/v1/admin/content')->assertForbidden();
        $this->getJson('/api/v1/account/profile')->assertOk()->assertJsonPath('data.name', 'Member');
        $this->deleteJson('/api/v1/session')->assertNoContent();
        $this->getJson('/api/v1/account/profile')->assertUnauthorized();
        $this->postJson('/api/v1/session', ['email' => 'member@example.test', 'password' => 'MemberPassword123!'])->assertOk();
        $this->postJson('/api/v1/register', ['name' => 'Duplicate', 'email' => 'member@example.test', 'password' => 'MemberPassword123!', 'password_confirmation' => 'MemberPassword123!'])->assertUnprocessable();
    }

    public function test_bookmarks_are_owned_and_never_reveal_nonpublic_content(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();
        $visible = $this->notice();
        $hidden = $this->notice(['status' => 'draft']);
        $this->actingAs($first)->putJson('/api/v1/account/bookmarks/'.$visible->id)->assertNoContent();
        $this->putJson('/api/v1/account/bookmarks/'.$visible->id)->assertNoContent();
        $this->putJson('/api/v1/account/bookmarks/'.$hidden->id)->assertNotFound();
        $this->getJson('/api/v1/account/bookmarks')->assertJsonCount(1, 'data');
        $this->actingAs($second)->getJson('/api/v1/account/bookmarks')->assertJsonCount(0, 'data');
        $this->deleteJson('/api/v1/account/bookmarks/'.$visible->id)->assertNoContent();
        $this->assertDatabaseCount('bookmarks', 1);
        $visible->update(['expires_at' => now()->subMinute()]);
        $this->actingAs($first)->getJson('/api/v1/account/bookmarks')->assertJsonCount(0, 'data');
        $this->deleteJson('/api/v1/account/bookmarks/'.$visible->id)->assertNoContent();
        $this->assertDatabaseCount('bookmarks', 0);
    }

    public function test_job_preferences_filter_recommendations_and_validate_taxonomy(): void
    {
        $member = User::factory()->create();
        $term = DB::table('terms')->insertGetId(['taxonomy' => 'state', 'slug' => 'rajasthan', 'label' => 'Rajasthan', 'locale' => 'en']);
        $match = $this->notice();
        $match->syncTerms([$term]);
        $this->notice();
        $this->notice(['type' => 'results']);
        $this->actingAs($member)->putJson('/api/v1/account/profile', ['name' => 'Updated member', 'preferences' => ['locale' => 'en', 'state' => 'rajasthan'], 'roles' => ['administrator']])->assertOk();
        $this->getJson('/api/v1/account/recommendations')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $match->id);
        $this->putJson('/api/v1/account/profile', ['name' => 'Member', 'preferences' => ['locale' => 'en', 'state' => 'not-a-state']])->assertUnprocessable();
        $this->putJson('/api/v1/account/profile', ['name' => 'Member', 'preferences' => ['locale' => 'en', 'role' => 'administrator']])->assertUnprocessable();
    }

    public function test_private_resume_and_password_changes_require_the_owner(): void
    {
        $first = User::factory()->create(['password' => 'OriginalPassword123!']);
        $second = User::factory()->create();
        $document = ['template' => 'modern', 'name' => 'Private name', 'experience' => 'Private employment history'];
        $this->actingAs($first)->putJson('/api/v1/account/resume', ['document' => $document])->assertOk();
        $this->getJson('/api/v1/account/resume')->assertJsonPath('data.experience', $document['experience']);
        $this->actingAs($second)->getJson('/api/v1/account/resume')->assertJsonPath('data', null);
        $this->deleteJson('/api/v1/account/resume')->assertNoContent();
        $this->assertDatabaseCount('member_resumes', 1);
        $this->actingAs($first)->putJson('/api/v1/account/password', ['current_password' => 'incorrect', 'password' => 'NewPassword12345!', 'password_confirmation' => 'NewPassword12345!'])->assertUnprocessable();
        $this->putJson('/api/v1/account/password', ['current_password' => 'OriginalPassword123!', 'password' => 'NewPassword12345!', 'password_confirmation' => 'NewPassword12345!'])->assertOk();
        $this->assertTrue(Hash::check('NewPassword12345!', $first->fresh()->password));
        $this->deleteJson('/api/v1/account/resume')->assertNoContent();
        $this->assertDatabaseCount('member_resumes', 0);
    }

    public function test_media_jobs_validate_url_and_are_private_expiring_downloads(): void
    {
        Queue::fake();
        Storage::fake('local');
        config(['media.python' => PHP_BINARY]);
        $this->postJson('/api/v1/account/downloads', [])->assertUnauthorized();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $this->actingAs($owner)->postJson('/api/v1/account/downloads', ['url' => 'https://127.0.0.1/private', 'format' => 'video', 'permission' => true])->assertUnprocessable();
        $this->postJson('/api/v1/account/downloads', ['url' => 'https://www.youtube.com/watch?v=test', 'format' => 'video', 'permission' => true])->assertAccepted();
        Queue::assertPushed(DownloadMedia::class);
        $job = DB::table('media_downloads')->first();
        Storage::disk('local')->put('media-downloads/'.$job->id.'/media.mp4', 'synthetic media');
        DB::table('media_downloads')->where('id', $job->id)->update(['status' => 'ready', 'path' => 'media-downloads/'.$job->id.'/media.mp4']);
        $this->get('/api/v1/account/downloads/'.$job->id.'/file')->assertOk()->assertDownload('sarkarilinks-video.mp4');
        $this->actingAs($other)->getJson('/api/v1/account/downloads')->assertJsonCount(0, 'data');
        $this->get('/api/v1/account/downloads/'.$job->id.'/file')->assertNotFound();
        DB::table('media_downloads')->where('id', $job->id)->update(['expires_at' => now()->subMinute()]);
        $this->actingAs($owner)->get('/api/v1/account/downloads/'.$job->id.'/file')->assertNotFound();
        $this->artisan('media:cleanup')->assertSuccessful();
        Storage::disk('local')->assertMissing('media-downloads/'.$job->id.'/media.mp4');
        $this->assertDatabaseCount('media_downloads', 0);
    }

    public function test_stalled_media_is_recoverable_and_permissions_are_required(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $id = (string) Str::uuid();
        DB::table('media_downloads')->insert(['id' => $id, 'user_id' => $owner->id, 'url' => 'https://youtu.be/test', 'format' => 'audio', 'status' => 'processing', 'created_at' => now()->subMinutes(11), 'updated_at' => now()->subMinutes(11), 'expires_at' => now()->addHour()]);
        Storage::disk('local')->put('media-downloads/'.$id.'/media.part', 'partial');
        $this->artisan('media:cleanup')->assertSuccessful();
        $this->assertDatabaseHas('media_downloads', ['id' => $id, 'status' => 'failed']);
        Storage::disk('local')->assertMissing('media-downloads/'.$id.'/media.part');
        $this->actingAs($owner)->postJson('/api/v1/account/downloads', ['url' => 'https://youtu.be/test', 'format' => 'audio'])->assertUnprocessable();
        DB::table('portal_tools')->where('slug', 'media-downloader')->update(['enabled' => false]);
        $this->postJson('/api/v1/account/downloads', ['url' => 'https://youtu.be/test', 'format' => 'audio', 'permission' => true])->assertNotFound();
    }

    public function test_seo_html_and_sitemap_include_only_visible_notices_and_escape_text(): void
    {
        config(['portal.url' => 'https://portal.example']);
        $visible = $this->notice(['title' => 'Test <script>alert(1)</script>']);
        $hidden = $this->notice(['status' => 'draft']);
        $this->get('/sitemap.xml')->assertOk()->assertSee('sitemapindex')->assertSee('https://portal.example/sitemap.xml?page=1', false);
        $this->get('/sitemap.xml?page=1')->assertOk()->assertSee($visible->slug)->assertDontSee($hidden->slug);
        $this->get('/jobs/'.$visible->slug)->assertOk()->assertSee('Test &lt;script&gt;', false)->assertDontSee('<script>alert(1)</script>', false)->assertSee('rel="canonical"', false);
        $this->get('/jobs/'.$hidden->slug)->assertNotFound();
        $this->get('/tools/image-converter')->assertOk()->assertSee('Image converter');
        $this->get('/account')->assertOk()->assertSee('noindex,follow');
        $this->get('/robots.txt')->assertOk()->assertSee('Sitemap: https://portal.example/sitemap.xml', false);
    }
}
