<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cms.access') ?? false;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['jobs', 'results', 'admit-cards', 'answer-keys', 'syllabus', 'schemes', 'admissions', 'certificate-verification'])],
            'locale' => ['required', Rule::in(['en', 'hi'])],
            'slug' => ['required', 'string', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('contents')->where('type', $this->input('type'))->where('locale', $this->input('locale'))->ignore($this->route('content')?->id)],
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['required', 'string', 'max:2000'],
            'body' => ['required', 'string', 'max:100000'],
            'organization' => ['required', 'string', 'max:255'],
            'source_url' => ['required', 'url:http,https', 'max:2048'],
            'closing_date' => ['nullable', 'date_format:Y-m-d'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'details' => ['nullable', 'array:vacancies,eligibility,fees,important_dates,application_process,benefits,exam_details'],
            'term_ids' => ['sometimes', 'array', 'max:30'],
            'term_ids.*' => ['integer', 'distinct', Rule::exists('terms', 'id')->where('locale', $this->input('locale'))],
            'details.vacancies' => ['nullable', 'string', 'max:2000'],
            'details.eligibility' => ['nullable', 'string', 'max:10000'],
            'details.fees' => ['nullable', 'string', 'max:5000'],
            'details.important_dates' => ['nullable', 'string', 'max:10000'],
            'details.application_process' => ['nullable', 'string', 'max:10000'],
            'details.benefits' => ['nullable', 'string', 'max:10000'],
            'details.exam_details' => ['nullable', 'string', 'max:10000'],
        ];
    }
}
