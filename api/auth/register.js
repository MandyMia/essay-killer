/**
 * 注册 API
 * POST /api/auth/register
 */
const db = require('../../db');

module.exports = async function (request) {
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
    const { username, password, role, realName, grade, className, subject, school } = body;

    if (!username || !password || !role) {
      return jsonResponse({ success: false, error: '请填写完整信息' }, 400);
    }

    // 检查用户是否已存在
    const existingUser = db.findUser(username);
    if (existingUser) {
      return jsonResponse({ success: false, error: '用户名已存在' }, 409);
    }

    // 创建用户
    const userData = {
      username,
      password,
      role,
      realName: realName || username
    };

    if (role === 'parent') {
      userData.grade = grade;
      userData.className = className;
    } else if (role === 'teacher') {
      userData.subject = subject || '语文';
      userData.school = school;
    }

    const user = db.createUser(userData);

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse({ success: false, error: '注册失败' }, 500);
  }
};

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
