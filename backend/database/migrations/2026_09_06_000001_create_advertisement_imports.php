<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('advertisement_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('content_id')->nullable()->unique()->constrained('contents')->restrictOnDelete();
            $table->string('filename');
            $table->string('path');
            $table->string('mime', 80);
            $table->unsignedInteger('size');
            $table->string('sha256', 64);
            $table->string('source_url', 2048);
            $table->string('status', 30)->default('queued')->index();
            $table->longText('extracted_text')->nullable();
            $table->json('suggestions')->nullable();
            $table->json('extraction')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'sha256']);
        });
        Schema::table('contents', fn (Blueprint $table) => $table->json('details')->nullable());
        foreach (['media.upload', 'media.manage'] as $name) {
            DB::table('permissions')->insertOrIgnore(['name' => $name]);
            $permission = DB::table('permissions')->where('name', $name)->value('id');
            $roles = $name === 'media.upload' ? ['author', 'administrator'] : ['administrator'];
            foreach (DB::table('roles')->whereIn('name', $roles)->pluck('id') as $role) {
                DB::table('permission_role')->insertOrIgnore(['permission_id' => $permission, 'role_id' => $role]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('advertisement_imports');
        Schema::table('contents', fn (Blueprint $table) => $table->dropColumn('details'));
    }
};
