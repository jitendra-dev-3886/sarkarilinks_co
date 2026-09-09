<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach ([
            ['pdf-compressor', 'PDF Compressor', 'Reduce PDF size with local optimization or image-only scanned compression. Compare real sizes and download without uploading your document.'],
            ['pdf-merge-split', 'PDF Merge & Split', 'Merge PDFs in your chosen order or extract selected pages into a new PDF. Preview and download locally without an account.'],
        ] as [$slug, $name, $help]) {
            DB::table('portal_tools')->insertOrIgnore(['slug' => $slug, 'name' => $name, 'help' => $help, 'enabled' => true, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        DB::table('portal_tools')->whereIn('slug', ['pdf-compressor', 'pdf-merge-split'])->delete();
    }
};
