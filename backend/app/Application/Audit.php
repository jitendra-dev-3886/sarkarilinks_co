<?php

namespace App\Application;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Audit
{
    public static function record(?int $actor, string $action, string $type, int|string $id, ?array $before = null, ?array $after = null, ?string $reason = null): void
    {
        DB::table('audit_logs')->insert([
            'id' => (string) Str::ulid(), 'actor_id' => $actor, 'action' => $action,
            'target_type' => $type, 'target_id' => (string) $id,
            'before' => $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR),
            'after' => $after === null ? null : json_encode($after, JSON_THROW_ON_ERROR),
            'reason' => $reason, 'ip' => app()->runningInConsole() ? null : request()->ip(),
            'created_at' => now(),
        ]);
    }
}
