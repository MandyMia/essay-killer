const { createAnonClient, createServiceClient } = require('../_supabase');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  try {
    const body = await request.json();
    const { email, password, username, role } = body;
    if (!email || !password || !username || !['teacher', 'student'].includes(role)) {
      return json({ success: false, error: '请填写邮箱、密码、用户名并选择正确角色' }, 400);
    }
    if (password.length < 6) return json({ success: false, error: '密码至少需要6位' }, 400);
    const client = createAnonClient();
    const { data: authData, error: authError } = await client.auth.signUp({ email, password });
    if (authError) return json({ success: false, error: authError.message }, 400);
    if (!authData.user) return json({ success: false, error: '注册失败' }, 400);
    const profileClient = createServiceClient() || client;
    const { data: profile, error: profileError } = await profileClient.from('profiles').insert({
      id: authData.user.id, username, role
    }).select('id, username, role').single();
    if (profileError) {
      console.error('Supabase profiles insert failed:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        usedServiceRole: Boolean(createServiceClient())
      });
      return json({ success: false, error: '账号已创建，但用户资料保存失败，请联系管理员' }, 500);
    }
    return json({ success: true, session: authData.session, user: profile, requiresEmailConfirmation: !authData.session });
  } catch (error) {
    console.error('Supabase register error:', error.message);
    return json({ success: false, error: '注册服务暂时不可用' }, 500);
  }
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
