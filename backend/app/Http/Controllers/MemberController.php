<?php

namespace App\Http\Controllers;

use App\Application\Content\SearchContent;
use App\Domain\Access\Role;
use App\Domain\Content\Content;
use App\Http\Resources\ContentResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class MemberController extends Controller
{
    public function register(Request $request)
    {
        $input = $request->validate(['name' => ['required', 'string', 'max:100'], 'email' => ['required', 'email', 'lowercase', 'max:255', 'unique:users,email'], 'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()]]);
        $user = DB::transaction(function () use ($input) {
            $user = User::create(collect($input)->only(['name', 'email', 'password'])->all());
            $user->roles()->attach(Role::where('name', 'user')->firstOrFail());

            return $user;
        });
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['data' => ['id' => $user->id, 'name' => $user->name]], 201);
    }

    public function profile(Request $request)
    {
        $user = $request->user();

        return ['data' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'preferences' => $user->job_preferences ?? [], 'bookmark_ids' => DB::table('bookmarks')->where('user_id', $user->id)->pluck('content_id')]];
    }

    public function update(Request $request)
    {
        $input = $request->validate(['name' => ['required', 'string', 'max:100'], 'preferences' => ['present', 'array:state,qualification,department,locale'], 'preferences.locale' => ['required', Rule::in(['en', 'hi'])]] + collect(['state', 'qualification', 'department'])->mapWithKeys(fn ($group) => ['preferences.'.$group => ['nullable', 'string', 'max:100', Rule::exists('terms', 'slug')->where('taxonomy', $group)->where('locale', $request->input('preferences.locale', 'en'))]])->all());
        $request->user()->forceFill(['name' => $input['name'], 'job_preferences' => array_filter($input['preferences'])])->save();

        return $this->profile($request);
    }

    public function password(Request $request)
    {
        $input = $request->validate(['current_password' => ['required', 'current_password:web'], 'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()]]);
        $request->user()->forceFill(['password' => $input['password']])->save();
        $request->session()->regenerate();

        return ['message' => 'Password updated.'];
    }

    public function recommendations(Request $request, SearchContent $search)
    {
        $request->validate(['page' => ['sometimes', 'integer', 'min:1', 'max:100000']]);

        return ContentResource::collection($search->execute([...($request->user()->job_preferences ?? []), 'type' => 'jobs', 'per_page' => 12]));
    }

    public function bookmarks(Request $request)
    {
        $request->validate(['page' => ['sometimes', 'integer', 'min:1', 'max:100000']]);

        return ContentResource::collection(Content::publiclyVisible()->whereIn('id', DB::table('bookmarks')->where('user_id', $request->user()->id)->select('content_id'))->latest('published_at')->paginate(15));
    }

    public function bookmark(Request $request, Content $content)
    {
        abort_unless(Content::publiclyVisible()->whereKey($content->id)->exists(), 404);
        DB::table('bookmarks')->insertOrIgnore(['user_id' => $request->user()->id, 'content_id' => $content->id, 'created_at' => now()]);

        return response()->noContent();
    }

    public function removeBookmark(Request $request, int $content)
    {
        DB::table('bookmarks')->where('user_id', $request->user()->id)->where('content_id', $content)->delete();

        return response()->noContent();
    }

    public function resume(Request $request)
    {
        $record = DB::table('member_resumes')->where('user_id', $request->user()->id)->first();

        return ['data' => $record ? json_decode($record->document, true) : null];
    }

    public function saveResume(Request $request)
    {
        $input = $request->validate(['document' => ['required', 'array:name,email,phone,location,headline,summary,experience,education,skills,template,certifications,projects,achievements'], 'document.template' => ['required', Rule::in(['modern', 'classic', 'minimal'])], 'document.name' => ['required', 'string', 'max:150'], 'document.email' => ['nullable', 'email', 'max:255'], 'document.phone' => ['nullable', 'string', 'max:50'], 'document.location' => ['nullable', 'string', 'max:200'], 'document.headline' => ['nullable', 'string', 'max:200'], 'document.summary' => ['nullable', 'string', 'max:3000'], 'document.experience' => ['nullable', 'string', 'max:10000'], 'document.education' => ['nullable', 'string', 'max:5000'], 'document.skills' => ['nullable', 'string', 'max:3000'], 'document.certifications' => ['nullable', 'string', 'max:3000'], 'document.projects' => ['nullable', 'string', 'max:3000'], 'document.achievements' => ['nullable', 'string', 'max:3000']]);
        DB::table('member_resumes')->upsert([['user_id' => $request->user()->id, 'document' => json_encode($input['document']), 'updated_at' => now(), 'created_at' => now()]], ['user_id'], ['document', 'updated_at']);

        return ['message' => 'Resume saved to your account.'];
    }

    public function deleteResume(Request $request)
    {
        DB::table('member_resumes')->where('user_id', $request->user()->id)->delete();

        return response()->noContent();
    }
}
