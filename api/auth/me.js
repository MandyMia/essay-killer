const { getAuthContext } = require('../_supabase');
module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  if (request.method !== 'GET') return json({ success: false, error: 'Method not allowed' }, 405);
  try {
    const context = await getAuthContext(request);
    if (!context) return json({ success: false, error: '未登录或登录已过期' }, 401);
    return json({ success: true, user: { id: context.user.id, email: context.user.email, ...context.profile } });
  } catch (error) { console.error('Supabase me error:', error.message); return json({ success: false, error: '认证状态检查失败' }, 500); }
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
