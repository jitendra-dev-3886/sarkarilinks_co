<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portal_appearance', function (Blueprint $table) {
            $table->string('home_layout', 20)->default('theme');
        });
    }

    public function down(): void
    {
        Schema::table('portal_appearance', function (Blueprint $table) {
            $table->dropColumn('home_layout');
        });
    }
};
