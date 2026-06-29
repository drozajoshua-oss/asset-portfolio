import { supabase } from './supabase';

const PROXY_BASE = 'https://asset-portfolio-production.up.railway.app';

/**
 * Permanently delete the signed-in user's account and all their data.
 *
 * Deletion needs admin privileges (Supabase service-role key), which must never
 * live in the client — so this calls a server endpoint that performs the delete.
 * The server needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars (see
 * server/index.js). Until those are set the endpoint returns "not configured".
 *
 * Returns { ok: true } on success, or { ok: false, reason?, message? }.
 */
export async function deleteAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, reason: 'no-session' };

  let res;
  try {
    res = await fetch(`${PROXY_BASE}/api/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    return { ok: false, message: err.message };
  }

  if (!res.ok) {
    let message = `Could not delete account (${res.status}).`;
    try {
      const e = await res.json();
      if (e.error) message = e.error;
    } catch (_) {}
    return { ok: false, message };
  }

  // Clear the local session so the app returns to the auth screen.
  await supabase.auth.signOut();
  return { ok: true };
}
