<?php

namespace App\Console\Commands;

use App\Application\Audit;
use App\Domain\Content\Content;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PublishDueContent extends Command
{
    protected $signature = 'content:publish-due';

    protected $description = 'Publish independently reviewed due content and archive expired records';

    public function handle(): int
    {
        Content::query()->whereIn('status', ['scheduled', 'published'])->chunkById(100, function ($items) {
            foreach ($items as $item) {
                DB::transaction(function () use ($item) {
                    $content = Content::query()->lockForUpdate()->find($item->id);
                    if (! $content || ! in_array($content->status->value, ['scheduled', 'published'])) {
                        return;
                    }
                    $before = $content->toArray();
                    if ($content->expires_at && $content->expires_at <= now()) {
                        $content->status = 'archived';
                    } elseif ($content->status->value === 'scheduled' && $content->published_at && $content->published_at <= now()
                        && $content->verified_at && $content->reviewer_id && $content->reviewer_id !== $content->author_id) {
                        $content->status = 'published';
                    } else {
                        return;
                    }
                    $content->save();
                    Audit::record(null, 'content.scheduler.'.$content->status->value, 'content', $content->id, $before, $content->toArray());
                });
            }
        });

        return self::SUCCESS;
    }
}
