<?php

namespace App\Http\Controllers;

use App\Application\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SitePageController extends Controller
{
    public static function current(): array
    {
        $record = DB::table('site_information')->where('id', 1)->first();

        return ['document' => json_decode($record->document, true, 512, JSON_THROW_ON_ERROR), 'version' => $record->version];
    }

    public static function pages(): array
    {
        return self::current()['document']['pages'];
    }

    public static function page(string $slug): ?array
    {
        $document = self::current()['document'];
        $page = $document['pages'][$slug] ?? null;
        if ($page && in_array($slug, ['about-us', 'contact-us', 'privacy-policy', 'terms-of-use'])) {
            $owner = $document['owner'];
            $email = $document['support_email'];
            $page['sections'][] = ['heading' => 'Site operator and support', 'text' => $owner && $email ? $owner.' — '.$email : 'Public operator and support details have not yet been supplied.'];
            $page['support_email'] = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
            if ($document['address']) {
                $page['sections'][] = ['heading' => 'Public address', 'text' => $document['address']];
            }
        }

        return $page;
    }

    public function show(string $slug)
    {
        $page = self::page($slug);
        abort_unless($page, 404);

        return response()->json(['data' => $page]);
    }

    public function manage(Request $request)
    {
        $this->authorizeAdministrator($request);

        return response()->json(['data' => self::current()]);
    }

    public function update(Request $request)
    {
        $this->authorizeAdministrator($request);
        $keys = array_keys(json_decode(file_get_contents(resource_path('site-pages.json')), true));
        $rules = ['version' => ['required', 'integer', 'min:1'], 'document' => ['required', 'array:owner,support_email,address,pages'], 'document.owner' => ['present', 'nullable', 'string', 'max:180'], 'document.support_email' => ['present', 'nullable', 'email', 'max:254'], 'document.address' => ['present', 'nullable', 'string', 'max:1000'], 'document.pages' => ['required', 'array:'.implode(',', $keys)]];
        foreach ($keys as $key) {
            $prefix = 'document.pages.'.$key;
            $rules[$prefix] = ['required', 'array:title,description,sections,review_required'];
            $rules[$prefix.'.title'] = ['required', 'string', 'max:120'];
            $rules[$prefix.'.description'] = ['required', 'string', 'max:250'];
            $rules[$prefix.'.review_required'] = ['sometimes', 'boolean'];
            $rules[$prefix.'.sections'] = ['present', 'array', 'max:20'];
            $rules[$prefix.'.sections.*'] = ['array:heading,text'];
            $rules[$prefix.'.sections.*.heading'] = ['required', 'string', 'max:180'];
            $rules[$prefix.'.sections.*.text'] = ['required', 'string', 'max:10000'];
        }
        $input = $request->validate($rules);
        foreach (['owner', 'support_email', 'address'] as $field) {
            $input['document'][$field] = $input['document'][$field] ?? '';
        }
        foreach (['privacy-policy', 'terms-of-use'] as $key) {
            if (! ($input['document']['pages'][$key]['review_required'] ?? false)) {
                abort_unless($input['document']['owner'] && $input['document']['support_email'], 422, 'Add the site operator and support email before marking policies reviewed.');
            }
        }
        DB::transaction(function () use ($input, $request) {
            $before = DB::table('site_information')->where('id', 1)->lockForUpdate()->first();
            abort_unless((int) $before->version === (int) $input['version'], 409, 'Another administrator updated these pages. Reload saved settings before saving.');
            DB::table('site_information')->where('id', 1)->update(['document' => json_encode($input['document'], JSON_THROW_ON_ERROR), 'version' => $before->version + 1]);
            Audit::record($request->user()->id, 'site-information.updated', 'portal', 1, json_decode($before->document, true), $input['document']);
        });

        return $this->manage($request);
    }

    private function authorizeAdministrator(Request $request): void
    {
        abort_unless($request->user()->roles()->where('name', 'administrator')->exists() && $request->user()->hasPermission('settings.manage'), 403);
    }
}
