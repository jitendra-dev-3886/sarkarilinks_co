<?php

namespace Tests\Feature;

use App\Domain\Content\Content;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicContentTest extends TestCase
{
    use RefreshDatabase;

    private function content(array $attributes = []): Content
    {
        return Content::create(array_merge([
            'type' => 'jobs', 'locale' => 'en', 'slug' => fake()->unique()->slug(),
            'title' => 'Sample recruitment', 'summary' => 'Synthetic test content',
            'body' => 'Official notice details', 'organization' => 'Test department',
            'source_url' => 'https://example.gov.in/notice', 'status' => 'published',
            'verified_at' => now(), 'published_at' => now()->subMinute(),
        ], $attributes));
    }

    public function test_only_current_verified_published_content_is_public(): void
    {
        $visible = $this->content();
        foreach ([['status' => 'draft'], ['status' => 'scheduled'], ['published_at' => now()->addHour()], ['expires_at' => now()->subMinute()], ['verified_at' => null]] as $attributes) {
            $hidden = $this->content($attributes);
            $this->getJson('/api/v1/content/jobs/'.$hidden->slug)->assertNotFound();
        }
        $deleted = $this->content();
        $deleted->delete();
        $this->getJson('/api/v1/content')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $visible->id);
    }

    public function test_search_filters_and_source_metadata(): void
    {
        $record = $this->content(['title' => 'Railway recruitment']);
        $this->content(['type' => 'results']);
        $this->getJson('/api/v1/content?type=jobs&q=Railway')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/content/jobs/'.$record->slug)->assertOk()
            ->assertJsonPath('data.source_url', $record->source_url)->assertJsonPath('data.body', $record->body);
    }

    public function test_invalid_filters_are_rejected_and_wildcards_are_literal(): void
    {
        $this->content();
        $this->getJson('/api/v1/content?per_page=500')->assertUnprocessable();
        $this->getJson('/api/v1/content?type=invalid')->assertUnprocessable();
        $this->getJson('/api/v1/content?q=%25')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_closing_soon_excludes_closed_notices_and_orders_deadlines(): void
    {
        $this->content(['closing_date' => now()->subDay()->toDateString()]);
        $this->content(['closing_date' => now()->addDays(5)->toDateString()]);
        $first = $this->content(['closing_date' => now()->addDay()->toDateString()]);
        $this->getJson('/api/v1/content?sort=closing-soon')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.id', $first->id);
    }
}
