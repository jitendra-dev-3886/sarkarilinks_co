<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->json('job_preferences')->nullable());
        Schema::create('bookmarks', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('content_id')->constrained('contents')->cascadeOnDelete();
            $table->timestamp('created_at');
            $table->primary(['user_id', 'content_id']);
        });
        Schema::create('member_resumes', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->json('document');
            $table->timestamps();
        });
        Schema::create('media_downloads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('url', 2048);
            $table->string('format', 10);
            $table->string('status', 20)->default('queued');
            $table->string('title')->nullable();
            $table->string('path')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
        foreach ([
            ['image-converter', 'Image converter', 'Convert JPG, PNG and WebP images directly in your browser.'],
            ['image-compressor', 'Image compressor', 'Reduce image file size and dimensions for application forms.'],
            ['background-remover', 'AI background remover', 'Remove portrait backgrounds locally with the MODNet AI model.'],
            ['image-to-text', 'Image & PDF to text', 'Extract English and Hindi text from images or scanned PDFs.'],
            ['resume-builder', 'CV & resume builder', 'Import text with OCR, choose a template and export a polished resume.'],
            ['media-downloader', 'Video & audio downloader', 'Download supported public YouTube, Instagram and Facebook links.'],
            ['image-to-pdf', 'Image to PDF', 'Turn an image into a printable A4 PDF on your device.'],
        ] as [$slug, $name, $help]) {
            DB::table('portal_tools')->insert(['slug' => $slug, 'name' => $name, 'help' => $help, 'enabled' => true, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('media_downloads');
        Schema::dropIfExists('member_resumes');
        Schema::dropIfExists('bookmarks');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('job_preferences'));
        DB::table('portal_tools')->whereIn('slug', ['image-converter', 'image-compressor', 'background-remover', 'image-to-text', 'resume-builder', 'media-downloader', 'image-to-pdf'])->delete();
    }
};
