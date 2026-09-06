<?php

namespace App\Http\Controllers;

use App\Application\Content\SearchContent;
use App\Domain\Content\Content;
use App\Http\Requests\ListContentRequest;
use App\Http\Resources\ContentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ContentController extends Controller
{
    public function index(ListContentRequest $request, SearchContent $search): AnonymousResourceCollection
    {
        return ContentResource::collection($search->execute($request->validated()));
    }

    public function show(Request $request, string $type, string $slug): ContentResource
    {
        $input = $request->validate(['locale' => ['sometimes', Rule::in(['en', 'hi'])]]);

        return new ContentResource(Content::query()->publiclyVisible()
            ->where('locale', $input['locale'] ?? 'en')->where('type', $type)->where('slug', $slug)->firstOrFail());
    }
}
