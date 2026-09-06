<?php

namespace Tests\Feature;

use App\Application\AdvertisementExtractor;
use App\Application\AdvertisementRejected;
use App\Domain\Access\Role;
use App\Jobs\ExtractAdvertisement;
use App\Models\AdvertisementImport;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdvertisementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccessControlSeeder::class);
        Storage::fake('local');
        Queue::fake();
    }

    private function user(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->firstOrFail());

        return $user;
    }

    private function upload(string $contents = "%PDF-1.4\nSynthetic advertisement\n%%EOF"): array
    {
        return ['file' => UploadedFile::fake()->createWithContent('notice.pdf', $contents), 'source_url' => 'https://example.org/notice'];
    }

    private function input(): array
    {
        return ['type' => 'jobs', 'locale' => 'en', 'slug' => 'synthetic-job', 'title' => 'Synthetic recruitment', 'summary' => 'Synthetic summary', 'body' => 'Synthetic recruitment notice body', 'organization' => 'Synthetic Board', 'source_url' => 'https://example.org/notice', 'details' => ['vacancies' => '120 posts', 'eligibility' => 'Graduate']];
    }

    public function test_author_can_upload_private_file_and_duplicate_upload_returns_existing_record(): void
    {
        $this->actingAs($this->user('author'));
        $id = $this->postJson('/api/v1/admin/advertisements', $this->upload())->assertStatus(202)->assertJsonMissingPath('data.path')->json('data.id');
        $this->postJson('/api/v1/admin/advertisements', $this->upload())->assertOk()->assertJsonPath('data.id', $id);
        $this->assertDatabaseCount('advertisement_imports', 1);
        Storage::disk('local')->assertExists(AdvertisementImport::findOrFail($id)->path);
        // Dispatch happens after commit; Laravel's transactional test doesn't commit the outer transaction.
        $this->getJson('/api/v1/admin/advertisements/'.$id)->assertOk();
        $this->get('/api/v1/admin/advertisements/'.$id.'/download')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertDatabaseHas('audit_logs', ['action' => 'advertisement.uploaded']);
    }

    public function test_role_permissions_and_ownership_protect_import_endpoints(): void
    {
        $this->getJson('/api/v1/admin/advertisements')->assertUnauthorized();
        $this->actingAs($this->user('author'));
        $id = $this->postJson('/api/v1/admin/advertisements', $this->upload())->json('data.id');
        $this->actingAs($this->user('author'));
        $this->getJson('/api/v1/admin/advertisements')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/admin/advertisements/'.$id)->assertForbidden();
        $this->getJson('/api/v1/admin/advertisements/'.$id.'/download')->assertForbidden();
        $this->postJson('/api/v1/admin/advertisements/'.$id.'/retry')->assertForbidden();
        $this->postJson('/api/v1/admin/advertisements/'.$id.'/draft', $this->input())->assertForbidden();
        foreach (['user', 'reviewer', 'tool-manager', 'operations'] as $role) {
            $this->actingAs($this->user($role))->postJson('/api/v1/admin/advertisements', $this->upload())->assertForbidden();
        }
    }

    public function test_unsafe_malformed_and_oversized_uploads_are_rejected(): void
    {
        $this->actingAs($this->user('author'));
        foreach (["<?php echo 'test';", "%PDF-1.4\n%%EOF\n<?php echo 'test';", '%PDF-1.4 no ending marker'] as $bytes) {
            $this->postJson('/api/v1/admin/advertisements', $this->upload($bytes))->assertUnprocessable();
        }
        $this->postJson('/api/v1/admin/advertisements', ['file' => UploadedFile::fake()->create('large.pdf', 10241, 'application/pdf'), 'source_url' => 'https://example.org/notice'])->assertUnprocessable();
        $this->postJson('/api/v1/admin/advertisements', [...$this->upload(), 'source_url' => 'javascript:alert(1)'])->assertUnprocessable();
        $this->assertDatabaseCount('advertisement_imports', 0);
    }

    public function test_pdf_text_markers_and_long_trailing_whitespace_are_not_classified_as_unsafe(): void
    {
        $this->actingAs($this->user('author'));
        $this->postJson('/api/v1/admin/advertisements', $this->upload("%PDF-1.4\n(Recruitment syllabus includes <script and /JavaScript text)\n%%EOF".str_repeat("\r\n ", 1000)))->assertStatus(202);
        $this->assertDatabaseCount('advertisement_imports', 1);
    }

    public function test_image_metadata_is_not_scanned_as_executable_code(): void
    {
        $this->actingAs($this->user('author'));
        $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
        $comment = "Comment\0Advertisement metadata: <script /JavaScript <?=";
        $chunk = pack('N', strlen($comment)).'tEXt'.$comment.pack('N', crc32('tEXt'.$comment));
        $bytes = substr($bytes, 0, -12).$chunk.substr($bytes, -12);
        $this->postJson('/api/v1/admin/advertisements', ['file' => UploadedFile::fake()->createWithContent('notice.png', $bytes), 'source_url' => 'https://example.org/notice'])->assertStatus(202);
    }

    public function test_known_extraction_rejections_show_specific_recovery_instructions(): void
    {
        $this->actingAs($this->user('author'));
        $id = $this->postJson('/api/v1/admin/advertisements', $this->upload())->json('data.id');
        $extractor = $this->mock(AdvertisementExtractor::class);
        $extractor->shouldReceive('extract')->andThrow(new AdvertisementRejected('pdf_scripts'));
        (new ExtractAdvertisement($id))->handle($extractor);
        $this->getJson('/api/v1/admin/advertisements/'.$id)->assertJsonPath('data.status', 'failed')->assertJsonPath('data.error', (new AdvertisementRejected('pdf_scripts'))->getMessage());
        $this->assertStringContainsString('print it to a new PDF', AdvertisementImport::findOrFail($id)->error);
    }

    public function test_extraction_persists_text_and_fields_without_publishing_then_independent_review_makes_job_public(): void
    {
        $author = $this->user('author');
        $this->actingAs($author);
        $id = $this->postJson('/api/v1/admin/advertisements', $this->upload())->json('data.id');
        $extractor = $this->mock(AdvertisementExtractor::class);
        $extractor->shouldReceive('extract')->once()->andReturn(['text' => 'Synthetic recruitment with 120 vacancies', 'suggestions' => ['type' => 'jobs'], 'metadata' => ['pages' => 1, 'ocr_pages' => 0, 'warnings' => []]]);
        (new ExtractAdvertisement($id))->handle($extractor);
        $this->assertDatabaseHas('advertisement_imports', ['id' => $id, 'status' => 'ready', 'extracted_text' => 'Synthetic recruitment with 120 vacancies']);
        $this->getJson('/api/v1/content')->assertJsonCount(0, 'data');
        $contentId = $this->postJson('/api/v1/admin/advertisements/'.$id.'/draft', [...$this->input(), 'status' => 'published', 'reviewer_id' => $author->id])->assertCreated()->assertJsonPath('data.status', 'draft')->json('data.id');
        $this->assertDatabaseHas('advertisement_imports', ['id' => $id, 'status' => 'imported', 'content_id' => $contentId]);
        $this->getJson('/api/v1/content/jobs/synthetic-job')->assertNotFound();
        $this->postJson('/api/v1/admin/advertisements/'.$id.'/draft', [...$this->input(), 'slug' => 'duplicate-import'])->assertConflict();
        $path = '/api/v1/admin/content/'.$contentId.'/transitions';
        $this->postJson($path, ['action' => 'submit'])->assertOk();
        $this->actingAs($this->user('reviewer'));
        $this->get('/api/v1/admin/content/'.$contentId.'/advertisement')->assertOk();
        $this->postJson($path, ['action' => 'approve'])->assertOk();
        $this->postJson($path, ['action' => 'publish'])->assertOk();
        $this->getJson('/api/v1/content?type=jobs')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/content?type=results')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/content/jobs/synthetic-job')->assertOk()->assertJsonPath('data.details.vacancies', '120 posts');
    }

    public function test_failed_extraction_can_retry_but_ready_import_cannot(): void
    {
        $this->actingAs($this->user('author'));
        $id = $this->postJson('/api/v1/admin/advertisements', $this->upload())->json('data.id');
        $extractor = $this->mock(AdvertisementExtractor::class);
        $extractor->shouldReceive('extract')->andThrow(new \RuntimeException('Secret internal path'));
        (new ExtractAdvertisement($id))->handle($extractor);
        $this->getJson('/api/v1/admin/advertisements/'.$id)->assertJsonPath('data.status', 'failed')->assertDontSee('Secret internal path');
        $this->postJson('/api/v1/admin/advertisements/'.$id.'/retry')->assertStatus(202);
        Queue::assertPushed(ExtractAdvertisement::class);
        $this->postJson('/api/v1/admin/advertisements/'.$id.'/retry')->assertConflict();
    }

    public function test_destination_permission_is_enforced_even_with_upload_permission(): void
    {
        $author = $this->user('author');
        $this->actingAs($author);
        $id = $this->postJson('/api/v1/admin/advertisements', $this->upload())->json('data.id');
        AdvertisementImport::findOrFail($id)->update(['status' => 'ready']);
        DB::table('permission_role')->where('role_id', Role::where('name', 'author')->value('id'))->where('permission_id', DB::table('permissions')->where('name', 'jobs.create')->value('id'))->delete();
        $this->postJson('/api/v1/admin/advertisements/'.$id.'/draft', $this->input())->assertForbidden();
        $this->assertDatabaseCount('contents', 0);
    }

    public function test_interrupted_worker_becomes_retryable_without_affecting_queued_imports(): void
    {
        $this->actingAs($this->user('author'));
        $id = $this->postJson('/api/v1/admin/advertisements', $this->upload())->json('data.id');
        AdvertisementImport::findOrFail($id)->update(['status' => 'processing']);
        $this->travel(7)->minutes();
        $this->artisan('advertisements:recover-stalled')->assertSuccessful();
        $this->getJson('/api/v1/admin/advertisements/'.$id)->assertJsonPath('data.status', 'failed');
        $this->postJson('/api/v1/admin/advertisements/'.$id.'/retry')->assertStatus(202);
        $this->artisan('advertisements:recover-stalled')->assertSuccessful();
        $this->getJson('/api/v1/admin/advertisements/'.$id)->assertJsonPath('data.status', 'queued');
    }
}
