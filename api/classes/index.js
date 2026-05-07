/**
 * 班级 API
 * GET /api/classes - 获取班级列表
 */
const db = require('../db');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders()
    });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const classes = db.getClasses();

    return jsonResponse({
      success: true,
      classes: classes.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        teacherId: c.teacher_id,
        studentCount: 0,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('Get classes error:', error);
    return jsonResponse({ success: false, error: '获取班级列表失败' }, 500);
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
