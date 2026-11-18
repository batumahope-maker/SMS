/**
 * Client-side helper for the admin Transport & Library write dialogs.
 * Wraps fetch against the admin-gated routes: parses the friendly error the
 * routes return, and gives expired sessions a clear message. The buttons
 * themselves carry no authority — the routes enforce the admin session.
 */

export type WriteResult = { ok: true } | { ok: false; error: string };

export async function tlWrite(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<WriteResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
  if (response.ok) return { ok: true };
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (response.status === 401) {
    return { ok: false, error: 'Your session has expired. Sign in again as an admin.' };
  }
  return { ok: false, error: payload?.error ?? `The action failed (HTTP ${response.status}).` };
}
