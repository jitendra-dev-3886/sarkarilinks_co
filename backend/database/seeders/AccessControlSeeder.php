<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AccessControlSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $content = [];
            foreach (['jobs', 'results', 'admit-cards', 'answer-keys', 'syllabus', 'schemes'] as $type) {
                foreach (['view', 'create', 'update', 'review', 'publish', 'archive'] as $action) {
                    $content[] = "$type.$action";
                }
            }
            $all = [...$content, 'cms.access', 'users.manage', 'roles.view', 'roles.manage', 'audit.view', 'taxonomy.manage', 'tools.manage', 'operations.view', 'settings.manage', 'media.upload', 'media.manage'];
            foreach ($all as $permission) {
                DB::table('permissions')->insertOrIgnore(['name' => $permission]);
            }
            $select = fn (array $actions) => array_values(array_filter($content, fn ($permission) => in_array(explode('.', $permission)[1], $actions)));
            $roles = [
                'user' => ['Registered User', []],
                'author' => ['Content Author', ['cms.access', 'media.upload', ...$select(['view', 'create', 'update'])]],
                'reviewer' => ['Reviewer / Editor', ['cms.access', ...$select(['view', 'review', 'publish', 'archive'])]],
                'tool-manager' => ['Tool Manager', ['cms.access', 'tools.manage']],
                'operations' => ['Support / Operations', ['cms.access', 'operations.view']],
                'administrator' => ['Administrator', $all],
            ];
            foreach ($roles as $name => [$label, $permissions]) {
                $exists = DB::table('roles')->where('name', $name)->exists();
                DB::table('roles')->updateOrInsert(['name' => $name], ['label' => $label]);
                $role = DB::table('roles')->where('name', $name)->value('id');
                if ($exists && $name !== 'administrator') {
                    continue;
                }
                // Seed baseline grants idempotently without silently revoking existing grants.
                foreach (DB::table('permissions')->whereIn('name', $permissions)->pluck('id') as $permission) {
                    DB::table('permission_role')->insertOrIgnore(['role_id' => $role, 'permission_id' => $permission]);
                }
            }
        });
    }
}
