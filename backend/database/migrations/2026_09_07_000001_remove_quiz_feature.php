<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('quiz_questions');
        Schema::dropIfExists('quiz_question_imports');
        DB::table('permissions')->where('name', 'quiz.manage')->delete();
    }

    public function down(): void
    {
        // The removed quiz feature is not restored by rollback.
    }
};
