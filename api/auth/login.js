const { createAnonClient } = require('../_supabase');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  try {
    const { email, password } = await request.json();
    if (!email || !password) return json({ success: false, error: '请输入邮箱和密码' }, 400);
    const client = createAnonClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) return json({ success: false, error: error?.message || '邮箱或密码错误' }, 401);
    const { data: profile, error: profileError } = await client.from('profiles').select('id, username, role').eq('id', data.user.id).single();
    if (profileError || !profile) return json({ success: false, error: '用户资料不存在' }, 403);
    return json({ success: true, session: data.session, user: profile });
  } catch (error) {
    console.error('Supabase login error:', error.message);
    return json({ success: false, error: '登录服务暂时不可用' }, 500);
  }
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
