<?php

namespace App\Http\Controllers;

use App\Application\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WorkspaceController extends Controller
{
    public function tools()
    {
        return ['data' => DB::table('portal_tools')->where('enabled', true)->orderBy('name')->get(['slug', 'name', 'help'])];
    }

    public function manageTools()
    {
        return ['data' => DB::table('portal_tools')->orderBy('name')->get()];
    }

    public function saveTool(Request $request, string $slug)
    {
        $input = $request->validate(['name' => ['required', 'string', 'max:255'], 'help' => ['required', 'string', 'max:2000'], 'enabled' => ['required', 'boolean']]);
        DB::transaction(function () use ($request, $slug, $input) {
            $before = DB::table('portal_tools')->where('slug', $slug)->lockForUpdate()->first();
            abort_unless($before, 404);
            DB::table('portal_tools')->where('slug', $slug)->update([...$input, 'updated_at' => now()]);
            Audit::record($request->user()->id, 'tool.updated', 'tool', $slug, (array) $before, $input);
        });

        return ['message' => 'Tool settings saved.'];
    }

    public function operations()
    {
        return ['data' => [
            'imports' => DB::table('advertisement_imports')->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
            'failed_jobs' => DB::table('failed_jobs')->count(),
            'scheduled_content' => DB::table('contents')->whereNull('deleted_at')->where('status', 'scheduled')->count(),
            'checked_at' => now()->toIso8601String(),
        ]];
    }

    public function terms(Request $request)
    {
        $input = $request->validate(['locale' => ['sometimes', Rule::in(['en', 'hi'])]]);

        return ['data' => DB::table('terms')->where('locale', $input['locale'] ?? 'en')->orderBy('taxonomy')->orderBy('label')->get(['id', 'taxonomy', 'slug', 'label', 'locale'])];
    }

    public function saveTerm(Request $request)
    {
        $input = $request->validate([
            'taxonomy' => ['required', Rule::in(['state', 'qualification', 'department', 'category'])],
            'locale' => ['required', Rule::in(['en', 'hi'])],
            'slug' => ['required', 'max:100', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'label' => ['required', 'string', 'max:255'],
        ]);
        $id = DB::transaction(function () use ($input, $request) {
            $key = array_intersect_key($input, array_flip(['taxonomy', 'locale', 'slug']));
            $before = DB::table('terms')->where($key)->first();
            if ($before) {
                DB::table('terms')->where('id', $before->id)->update(['label' => $input['label'], 'updated_at' => now()]);
                $id = $before->id;
            } else {
                $id = DB::table('terms')->insertGetId([...$input, 'created_at' => now(), 'updated_at' => now()]);
            }
            Audit::record($request->user()->id, 'taxonomy.saved', 'term', $id, $before ? (array) $before : null, $input);

            return $id;
        });

        return response()->json(['data' => ['id' => $id, ...$input]]);
    }
}
