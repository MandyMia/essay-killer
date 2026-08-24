import { createAnonClient, createServiceClient } from '../../_shared/supabase.js';
import { json, options } from '../../_shared/http.js';
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return options();
  if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  try {
    const { email, password, username, role } = await request.json();
    if (!email || !password || !username || !['teacher', 'student'].includes(role)) return json({ success: false, error: '注册信息不完整' }, 400);
    const anon = createAnonClient(env); const { data, error } = await anon.auth.signUp({ email, password });
    if (error || !data.user) return json({ success: false, error: error?.message || '注册失败' }, 400);
    const { data: profile, error: profileError } = await createServiceClient(env).from('profiles').insert({ id: data.user.id, username, role }).select('id,username,role').single();
    if (profileError) return json({ success: false, error: '账号已创建，但用户资料保存失败' }, 500);
    return json({ success: true, session: data.session, user: profile, requiresEmailConfirmation: !data.session });
  } catch (error) { console.error('[functions/auth/register]', error); return json({ success: false, error: error.message }, 500); }
}
