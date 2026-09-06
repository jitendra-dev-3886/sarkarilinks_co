<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'locale' => $this->locale,
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,
            'body' => $this->when($request->routeIs('content.show'), $this->body),
            'details' => $this->when($request->routeIs('content.show'), $this->details),
            'organization' => $this->organization,
            'source_url' => $this->source_url,
            'verified_at' => $this->verified_at?->toIso8601String(),
            'published_at' => $this->published_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'closing_date' => $this->closing_date?->format('Y-m-d'),
            'deadline_timezone' => $this->deadline_timezone,
        ];
    }
}
