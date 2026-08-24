const { createAnonClient } = require('../_supabase');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  try {
    const body = await request.json();
    const refreshToken = body.refresh_token || body.refreshToken;
    if (!refreshToken) return json({ success: false, error: '缺少 refresh token' }, 400);
    const client = createAnonClient();
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return json({ success: false, error: '登录已过期，请重新登录' }, 401);
    return json({ success: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at, session: data.session });
  } catch (error) { console.error('Supabase refresh error:', error.message); return json({ success: false, error: '刷新登录状态失败' }, 500); }
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
