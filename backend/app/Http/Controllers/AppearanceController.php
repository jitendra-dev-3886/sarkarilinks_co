<?php

namespace App\Http\Controllers;

use App\Application\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AppearanceController extends Controller
{
    public const THEMES = ['ocean', 'forest', 'studio', 'editorial', 'focus'];

    public static function current(): array
    {
        $record = DB::table('portal_appearance')->where('id', 1)->first();

        return ['theme' => $record->theme, 'text_size' => $record->text_size, 'version' => $record->version];
    }

    public function show()
    {
        return response()->json(['data' => self::current()])->header('Cache-Control', 'no-store');
    }

    public function manage(Request $request)
    {
        $this->requireAdministrator($request);

        return $this->show();
    }

    public function update(Request $request)
    {
        $this->requireAdministrator($request);
        $input = $request->validate(['theme' => ['required', Rule::in(self::THEMES)], 'text_size' => ['required', Rule::in(['standard', 'large'])], 'version' => ['required', 'integer', 'min:1']]);
        DB::transaction(function () use ($input, $request) {
            $before = DB::table('portal_appearance')->where('id', 1)->lockForUpdate()->first();
            abort_unless((int) $before->version === (int) $input['version'], 409, 'Another administrator changed the design. Reload the saved settings before applying your selection.');
            $after = ['theme' => $input['theme'], 'text_size' => $input['text_size'], 'version' => $before->version + 1];
            DB::table('portal_appearance')->where('id', 1)->update([...$after, 'updated_at' => now()]);
            Audit::record($request->user()->id, 'appearance.updated', 'portal', 1, ['theme' => $before->theme, 'text_size' => $before->text_size, 'version' => $before->version], $after);
        });

        return $this->show();
    }

    private function requireAdministrator(Request $request): void
    {
        // The existing administrator role is this project's highest (superadmin) role.
        abort_unless($request->user()->roles()->where('name', 'administrator')->exists() && $request->user()->hasPermission('settings.manage'), 403);
    }
}
