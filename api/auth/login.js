/**
 * 登录 API
 * POST /api/auth/login
 */
const db = require('../db');

module.exports = async function (request) {
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders()
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse({ success: false, error: '请输入用户名和密码' }, 400);
    }

    const user = db.findUser(username);

    if (!user || user.password !== password) {
      return jsonResponse({ success: false, error: '用户名或密码错误' }, 401);
    }

    // 生成简单会话 token
    const token = generateToken(user.id, user.role);

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role
      },
      token: token
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ success: false, error: '登录失败' }, 500);
  }
};

// 辅助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders()
    }
  });
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

function generateToken(userId, role) {
  // 简化版 token，实际生产应使用 JWT
  const payload = { userId, role, exp: Date.now() + 86400000 };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
