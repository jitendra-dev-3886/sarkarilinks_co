<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portal_tools', function (Blueprint $table) {
            $table->string('slug')->primary();
            $table->string('name');
            $table->text('help');
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
        foreach ([['age', 'Age Calculator', 'Calculate your age on an examination cut-off date. Check the official notice for age relaxation rules.'], ['percentage', 'Percentage Calculator', 'Calculate marks obtained as a percentage of the maximum marks.'], ['emi', 'EMI Calculator', 'Estimate monthly repayment with a fixed annual interest rate. Actual lender fees and terms may differ.']] as [$slug, $name, $help]) {
            DB::table('portal_tools')->insert(['slug' => $slug, 'name' => $name, 'help' => $help, 'enabled' => true, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_tools');
    }
};
