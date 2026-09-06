<?php

namespace App\Application\Content;

use App\Application\Audit;
use App\Domain\Content\Content;
use App\Domain\Content\ContentStatus;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class TransitionContent
{
    public function execute(User $actor, Content $content, string $action, ?string $reason, ?string $publishAt): Content
    {
        return DB::transaction(function () use ($actor, $content, $action, $reason, $publishAt) {
            $content = Content::query()->lockForUpdate()->findOrFail($content->id);
            $ability = match ($action) {
                'submit' => 'submit', 'return', 'approve' => 'review',
                'publish', 'schedule' => 'publish', 'archive' => 'archive',
            };
            Gate::forUser($actor)->authorize($ability, $content);
            $allowed = match ($action) {
                'submit' => ['draft'], 'return', 'approve' => ['in_review'],
                'publish', 'schedule' => ['approved'], 'archive' => ['published', 'scheduled'],
            };
            if (! in_array($content->status->value, $allowed, true)) {
                throw ValidationException::withMessages(['action' => 'This transition is not allowed from '.$content->status->value.'.']);
            }
            if (in_array($action, ['approve', 'publish', 'schedule']) && (! $content->source_url || ! $content->body || ! $content->organization)) {
                throw ValidationException::withMessages(['source_url' => 'Official source and complete content are required.']);
            }
            if (in_array($action, ['publish', 'schedule']) && (! $content->reviewer_id || ! $content->verified_at || ($content->expires_at && $content->expires_at <= now()))) {
                throw ValidationException::withMessages(['action' => 'Content requires an independent review and a future expiry.']);
            }
            $before = $content->toArray();
            $content->status = match ($action) {
                'submit' => ContentStatus::InReview, 'return' => ContentStatus::Draft,
                'approve' => ContentStatus::Approved, 'publish' => ContentStatus::Published,
                'schedule' => ContentStatus::Scheduled, 'archive' => ContentStatus::Archived,
            };
            if ($action === 'approve') {
                $content->reviewer_id = $actor->id;
                $content->verified_at = now();
            }
            if ($action === 'return') {
                $content->reviewer_id = null;
                $content->verified_at = null;
            }
            if ($action === 'publish') {
                $content->published_at = now();
            }
            if ($action === 'schedule') {
                $time = CarbonImmutable::parse($publishAt)->utc();
                if ($time <= now() || ($content->expires_at && $time >= $content->expires_at)) {
                    throw ValidationException::withMessages(['published_at' => 'Choose a future time before expiry.']);
                }
                $content->published_at = $time;
            }
            $content->save();
            Audit::record($actor->id, 'content.'.$action, 'content', $content->id, $before, $content->toArray(), $reason);

            return $content;
        });
    }
}
