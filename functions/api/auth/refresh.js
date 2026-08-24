import { createAnonClient } from '../../_shared/supabase.js';
import { json, options } from '../../_shared/http.js';
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return options();
  if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  try {
    const { refresh_token } = await request.json();
    if (!refresh_token) return json({ success: false, error: '缺少 refresh token' }, 400);
    const { data, error } = await createAnonClient(env).auth.refreshSession({ refresh_token });
    if (error || !data.session) return json({ success: false, error: '登录已过期，请重新登录' }, 401);
    return json({ success: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at, session: data.session });
  } catch (error) { return json({ success: false, error: error.message }, 500); }
}
