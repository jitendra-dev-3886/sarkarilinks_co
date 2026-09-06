<?php

namespace App\Http\Controllers;

use App\Application\Audit;
use App\Application\Content\TransitionContent;
use App\Domain\Content\Content;
use App\Http\Requests\SaveContentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AdminContentController extends Controller
{
    public function index(Request $request)
    {
        $input = $request->validate(['status' => ['nullable', Rule::in(['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived'])], 'page' => ['integer', 'min:1']]);
        $user = $request->user();
        $query = Content::query()->where(function ($query) use ($user) {
            $query->whereRaw('1 = 0');
            foreach (['jobs', 'results', 'admit-cards', 'answer-keys', 'syllabus', 'schemes', 'admissions', 'certificate-verification'] as $type) {
                if ($user->hasPermission($type.'.view')) {
                    $query->orWhere(function ($query) use ($user, $type) {
                        $query->where('type', $type);
                        if (! $user->hasPermission($type.'.review')) {
                            $query->where('author_id', $user->id);
                        }
                    });
                }
            }
        });
        if (! empty($input['status'])) {
            $query->where('status', $input['status']);
        }

        return $query->latest('id')->paginate(20);
    }

    public function show(Content $content)
    {
        Gate::authorize('view', $content);

        return response()->json(['data' => $content]);
    }

    public function store(SaveContentRequest $request)
    {
        $input = $request->validated();
        $termIds = $input['term_ids'] ?? [];
        unset($input['term_ids']);
        Gate::authorize($input['type'].'.create');
        $content = DB::transaction(function () use ($request, $input, $termIds) {
            $content = Content::create([...$input, 'status' => 'draft', 'author_id' => $request->user()->id]);
            $content->syncTerms($termIds);
            Audit::record($request->user()->id, 'content.create', 'content', $content->id, null, $content->toArray());

            return $content;
        });

        return response()->json(['data' => $content], 201);
    }

    public function update(SaveContentRequest $request, Content $content)
    {
        $content = DB::transaction(function () use ($request, $content) {
            $content = Content::query()->lockForUpdate()->findOrFail($content->id);
            Gate::authorize('update', $content);
            $input = $request->validated();
            abort_if($input['type'] !== $content->type || $input['locale'] !== $content->locale, 422, 'Type and locale cannot change after creation.');
            $before = $content->toArray();
            $termIds = $input['term_ids'] ?? $content->term_ids;
            unset($input['term_ids']);
            $content->fill($input)->save();
            $content->syncTerms($termIds);
            Audit::record($request->user()->id, 'content.update', 'content', $content->id, $before, $content->toArray());

            return $content;
        });

        return response()->json(['data' => $content]);
    }

    public function transition(Request $request, Content $content, TransitionContent $transition)
    {
        $input = $request->validate([
            'action' => ['required', Rule::in(['submit', 'return', 'approve', 'publish', 'schedule', 'archive'])],
            'reason' => ['required_if:action,return,archive', 'nullable', 'string', 'min:5', 'max:2000'],
            'published_at' => ['required_if:action,schedule', 'nullable', 'date', 'after:now'],
        ]);

        return response()->json(['data' => $transition->execute($request->user(), $content, $input['action'], $input['reason'] ?? null, $input['published_at'] ?? null)]);
    }
}
