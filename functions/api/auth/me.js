import { getAuthContext } from '../../_shared/supabase.js';
import { json, options } from '../../_shared/http.js';
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return options();
  const ctx = await getAuthContext(request, env);
  if (!ctx) return json({ success: false, error: '未登录或登录已过期' }, 401);
  return json({ success: true, user: { id: ctx.user.id, email: ctx.user.email, ...ctx.profile } });
}
