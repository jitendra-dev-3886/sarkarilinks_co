<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contents', function (Blueprint $table) {
            $table->id();
            $table->string('type', 30);
            $table->string('locale', 10)->default('en');
            $table->string('slug', 180);
            $table->string('title');
            $table->text('summary');
            $table->longText('body');
            $table->string('organization');
            $table->string('identifier')->nullable();
            $table->string('status', 20)->default('draft');
            $table->string('source_url', 2048);
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->date('closing_date')->nullable();
            $table->string('deadline_timezone')->default('Asia/Kolkata');
            $table->foreignId('author_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['slug', 'locale', 'type']);
            $table->index(['type', 'status', 'published_at']);
            $table->index(['status', 'closing_date']);
        });

        Schema::create('terms', function (Blueprint $table) {
            $table->id();
            $table->string('taxonomy', 40);
            $table->string('slug', 100);
            $table->string('locale', 10)->default('en');
            $table->string('label');
            $table->timestamps();
            $table->unique(['taxonomy', 'slug', 'locale']);
        });

        Schema::create('content_term', function (Blueprint $table) {
            $table->foreignId('content_id')->constrained('contents')->cascadeOnDelete();
            $table->foreignId('term_id')->constrained('terms')->restrictOnDelete();
            $table->primary(['content_id', 'term_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_term');
        Schema::dropIfExists('terms');
        Schema::dropIfExists('contents');
    }
};
