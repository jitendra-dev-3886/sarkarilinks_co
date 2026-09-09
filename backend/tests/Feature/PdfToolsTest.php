<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PdfToolsTest extends TestCase
{
    use RefreshDatabase;

    public function test_pdf_tools_are_public_and_have_crawlable_pages(): void
    {
        foreach (['pdf-compressor', 'pdf-merge-split'] as $slug) {
            $this->getJson('/api/v1/tools')->assertOk()->assertJsonFragment(['slug' => $slug]);
            $this->get('/tools/'.$slug)->assertOk()->assertSee('/tools/'.$slug, false);
            $this->get('/sitemap.xml?page=1')->assertOk()->assertSee('/tools/'.$slug, false);
        }
    }

    public function test_disabled_pdf_tool_is_removed_from_directory_and_sitemap(): void
    {
        DB::table('portal_tools')->where('slug', 'pdf-compressor')->update(['enabled' => false]);
        $this->getJson('/api/v1/tools')->assertJsonMissing(['slug' => 'pdf-compressor']);
        $this->get('/tools/pdf-compressor')->assertNotFound();
        $this->get('/sitemap.xml?page=1')->assertDontSee('/tools/pdf-compressor', false);
    }
}
