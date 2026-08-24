module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  return json({ success: true, message: '请在客户端清除 Supabase session' });
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
