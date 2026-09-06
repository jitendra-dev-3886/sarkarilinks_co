<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:150'],
            'type' => ['nullable', Rule::in(['jobs', 'results', 'admit-cards', 'answer-keys', 'syllabus', 'schemes', 'admissions', 'certificate-verification'])],
            'locale' => ['sometimes', Rule::in(['en', 'hi'])],
            'sort' => ['sometimes', Rule::in(['newest', 'closing-soon'])],
            'page' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'state' => ['sometimes', 'string', 'max:100'],
            'qualification' => ['sometimes', 'string', 'max:100'],
            'department' => ['sometimes', 'string', 'max:100'],
            'category' => ['sometimes', 'string', 'max:100'],
        ];
    }
}
