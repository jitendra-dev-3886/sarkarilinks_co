<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['admissions', 'certificate-verification'] as $type) {
            foreach (['view', 'create', 'update', 'review', 'publish', 'archive'] as $action) {
                DB::table('permissions')->insertOrIgnore(['name' => $type.'.'.$action]);
                $permission = DB::table('permissions')->where('name', $type.'.'.$action)->value('id');
                // Extend only standard editorial roles with their existing job-action boundary.
                $roles = DB::table('roles')->whereIn('name', ['administrator', 'author', 'reviewer'])->get();
                foreach ($roles as $role) {
                    $hasAction = DB::table('permission_role')->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')->where('role_id', $role->id)->where('permissions.name', 'jobs.'.$action)->exists();
                    if ($role->name === 'administrator' || $hasAction) {
                        DB::table('permission_role')->insertOrIgnore(['role_id' => $role->id, 'permission_id' => $permission]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        // Preserve published categories and deliberate permission assignments on rollback.
    }
};
