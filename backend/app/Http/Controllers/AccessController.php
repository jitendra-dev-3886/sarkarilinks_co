<?php

namespace App\Http\Controllers;

use App\Application\Audit;
use App\Domain\Access\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

class AccessController extends Controller
{
    public function permissions()
    {
        return ['data' => DB::table('permissions')->orderBy('name')->pluck('name')];
    }

    public function updateRole(Request $request, Role $role)
    {
        abort_if($role->name === 'administrator' || $request->user()->roles()->where('roles.id', $role->id)->exists(), 403, 'You cannot modify the administrator role or a role assigned to yourself.');
        $input = $request->validate(['permissions' => ['present', 'array'], 'permissions.*' => ['required', 'string', 'distinct', 'exists:permissions,name']]);
        abort_if(array_diff($input['permissions'], $request->user()->permissionNames()) !== [], 403, 'You cannot grant permissions you do not hold.');
        DB::transaction(function () use ($request, $role, $input) {
            Role::query()->lockForUpdate()->findOrFail($role->id);
            $before = DB::table('permission_role')->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')->where('role_id', $role->id)->pluck('permissions.name')->all();
            DB::table('permission_role')->where('role_id', $role->id)->delete();
            foreach (DB::table('permissions')->whereIn('name', $input['permissions'])->pluck('id') as $id) {
                DB::table('permission_role')->insert(['role_id' => $role->id, 'permission_id' => $id]);
            }
            Audit::record($request->user()->id, 'role.permissions_changed', 'role', $role->id, ['permissions' => $before], $input);
        });

        return response()->json(['message' => 'Role permissions updated.']);
    }

    public function createUser(Request $request)
    {
        $input = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'lowercase', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::min(12)->mixedCase()->numbers()],
            'roles' => ['required', 'array', 'min:1'], 'roles.*' => ['string', 'distinct', 'exists:roles,name'],
        ]);
        $this->authorizeRoleGrants($request, $input['roles']);
        $user = DB::transaction(function () use ($request, $input) {
            $user = User::create(collect($input)->only(['name', 'email', 'password'])->all());
            $user->roles()->sync(Role::whereIn('name', $input['roles'])->pluck('id'));
            Audit::record($request->user()->id, 'user.created', 'user', $user->id, null, ['roles' => $input['roles']]);

            return $user;
        });

        return response()->json(['data' => ['id' => $user->id, 'name' => $user->name]], 201);
    }

    public function roles()
    {
        return ['data' => Role::all()->map(fn ($role) => [
            'id' => $role->id, 'name' => $role->name, 'label' => $role->label,
            'permissions' => DB::table('permission_role')->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')->where('role_id', $role->id)->pluck('permissions.name'),
        ])];
    }

    public function users()
    {
        return User::with('roles')->select('id', 'name', 'email')->orderBy('id')->paginate(30);
    }

    public function assign(Request $request, User $user)
    {
        $input = $request->validate(['roles' => ['required', 'array', 'min:1'], 'roles.*' => ['required', 'string', 'distinct', 'exists:roles,name']]);
        $this->authorizeRoleGrants($request, $input['roles']);
        abort_if(array_diff($user->permissionNames(), $request->user()->permissionNames()) !== [], 403, 'You cannot change a user with permissions beyond your own.');
        // Privilege changes need a second administrator; no self-escalation or self-lockout.
        abort_if($request->user()->id === $user->id, 403, 'Another administrator must change your roles.');
        DB::transaction(function () use ($request, $user, $input) {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $before = $user->roles()->pluck('name')->all();
            $user->roles()->sync(Role::whereIn('name', $input['roles'])->pluck('id'));
            Audit::record($request->user()->id, 'user.roles_changed', 'user', $user->id, ['roles' => $before], ['roles' => $input['roles']]);
        });

        return response()->json(['data' => ['id' => $user->id, 'roles' => $user->roles()->pluck('name')]]);
    }

    public function audit()
    {
        return DB::table('audit_logs')->orderByDesc('id')->paginate(30);
    }

    private function authorizeRoleGrants(Request $request, array $roles): void
    {
        $grants = DB::table('permissions')->join('permission_role', 'permission_role.permission_id', '=', 'permissions.id')
            ->join('roles', 'roles.id', '=', 'permission_role.role_id')->whereIn('roles.name', $roles)->pluck('permissions.name')->all();
        abort_if(array_diff($grants, $request->user()->permissionNames()) !== [], 403, 'You cannot assign roles with permissions beyond your own.');
    }
}
