<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portal_appearance', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('theme', 30)->default('ocean');
            $table->string('text_size', 20)->default('standard');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        DB::table('portal_appearance')->insert(['id' => 1, 'theme' => 'ocean', 'text_size' => 'standard', 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_appearance');
    }
};
