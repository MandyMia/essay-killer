import { createAnonClient } from '../../_shared/supabase.js';
import { json, options } from '../../_shared/http.js';
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return options();
  if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  try {
    const { email, password } = await request.json();
    if (!email || !password) return json({ success: false, error: '请输入邮箱和密码' }, 400);
    const { data, error } = await createAnonClient(env).auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) return json({ success: false, error: error?.message || '邮箱或密码错误' }, 401);
    const { data: profile, error: profileError } = await createAnonClient(env).from('profiles').select('id,username,role').eq('id', data.user.id).single();
    if (profileError || !profile) return json({ success: false, error: '用户资料不存在' }, 403);
    return json({ success: true, session: data.session, user: profile });
  } catch (error) { console.error('[functions/auth/login]', error); return json({ success: false, error: error.message }, 500); }
}
