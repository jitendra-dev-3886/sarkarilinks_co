<?php

namespace App\Domain\Content;

use App\Models\AdvertisementImport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Content extends Model
{
    use SoftDeletes;

    protected $table = 'contents';

    protected $guarded = ['id'];

    protected $appends = ['term_ids', 'has_advertisement'];

    public function getHasAdvertisementAttribute(): bool
    {
        return AdvertisementImport::where('content_id', $this->id)->exists();
    }

    public function getTermIdsAttribute(): array
    {
        return DB::table('content_term')->where('content_id', $this->id)->pluck('term_id')->all();
    }

    public function syncTerms(array $ids): void
    {
        DB::table('content_term')->where('content_id', $this->id)->delete();
        foreach ($ids as $id) {
            DB::table('content_term')->insert(['content_id' => $this->id, 'term_id' => $id]);
        }
    }

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'status' => ContentStatus::class,
            'published_at' => 'immutable_datetime',
            'verified_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'closing_date' => 'immutable_date',
        ];
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->where('status', ContentStatus::Published->value)
            ->whereNotNull('verified_at')
            ->where('published_at', '<=', now())
            ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }
}
