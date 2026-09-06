<?php

namespace App\Policies;

use App\Domain\Content\Content;
use App\Domain\Content\ContentStatus;
use App\Models\User;

class ContentPolicy
{
    public function view(User $user, Content $content): bool
    {
        return $user->hasPermission($content->type.'.view') && (
            $content->author_id === $user->id || $user->hasPermission($content->type.'.review')
        );
    }

    public function update(User $user, Content $content): bool
    {
        return $content->status === ContentStatus::Draft
            && $user->hasPermission($content->type.'.update')
            && ($content->author_id === $user->id || $user->roles()->where('name', 'administrator')->exists());
    }

    public function submit(User $user, Content $content): bool
    {
        return $this->update($user, $content);
    }

    public function review(User $user, Content $content): bool
    {
        return $user->id !== $content->author_id && $user->hasPermission($content->type.'.review');
    }

    public function publish(User $user, Content $content): bool
    {
        return $user->id !== $content->author_id && $user->hasPermission($content->type.'.publish');
    }

    public function archive(User $user, Content $content): bool
    {
        return $user->hasPermission($content->type.'.archive');
    }
}
