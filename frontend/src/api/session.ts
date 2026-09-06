export interface StaffUser { id: number; name: string; email: string; roles: string[]; permissions: string[]; }

export async function staffApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    const csrf = await fetch('/api/v1/session/csrf', { credentials: 'same-origin', headers });
    if (!csrf.ok) throw new Error('Could not establish a secure session. Please reload and try again.');
    const session = await csrf.json().catch(() => null);
    if (!session?.token) throw new Error('The API returned an invalid response. Check that the Laravel server is running.');
    headers['X-CSRF-TOKEN'] = session.token;
    if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`/api/v1${path}`, { method, credentials: 'same-origin', headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const errors = result?.errors ? Object.values(result.errors).flat().join(' ') : null;
    throw new Error(errors || result?.message || (response.status === 401 ? 'Please sign in to continue.' : 'The request failed. Please try again.'));
  }
  return result as T;
}
