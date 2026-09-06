<?php

namespace App\Application\Content;

use App\Domain\Content\Content;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class SearchContent
{
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Content::query()->publiclyVisible()->where('locale', $filters['locale'] ?? 'en');

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        $search = trim($filters['q'] ?? '');
        if ($search !== '') {
            // Escape SQL wildcards so user input is a literal substring.
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(function (Builder $query) use ($pattern) {
                foreach (['title', 'identifier', 'organization', 'summary', 'body'] as $column) {
                    $query->orWhereRaw("LOWER({$column}) LIKE LOWER(?) ESCAPE '!'", [$pattern]);
                }
            });
        }

        foreach (['state', 'qualification', 'department', 'category'] as $taxonomy) {
            if (! empty($filters[$taxonomy])) {
                $query->whereExists(function ($subquery) use ($taxonomy, $filters) {
                    $subquery->selectRaw('1')->from('content_term')->join('terms', 'terms.id', '=', 'content_term.term_id')
                        ->whereColumn('content_term.content_id', 'contents.id')
                        ->where('terms.taxonomy', $taxonomy)->where('terms.slug', $filters[$taxonomy]);
                });
            }
        }

        if (($filters['sort'] ?? 'newest') === 'closing-soon') {
            $query->whereNotNull('closing_date')->whereDate('closing_date', '>=', now('Asia/Kolkata')->toDateString())
                ->orderBy('closing_date');
        }

        return $query->orderByDesc('published_at')->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 15)->withQueryString();
    }
}
