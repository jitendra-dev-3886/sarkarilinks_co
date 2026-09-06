<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_information', function (Blueprint $table) {
            $table->id();
            $table->json('document');
            $table->unsignedInteger('version')->default(1);
        });
        DB::table('site_information')->insert(['id' => 1, 'version' => 1, 'document' => json_encode(['owner' => '', 'support_email' => '', 'address' => '', 'pages' => json_decode(file_get_contents(resource_path('site-pages.json')), true)], JSON_THROW_ON_ERROR)]);
    }

    public function down(): void
    {
        Schema::dropIfExists('site_information');
    }
};
