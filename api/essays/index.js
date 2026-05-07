/**
 * 作文列表 API
 * GET /api/essays - 获取作文列表
 * POST /api/essays - 提交作文
 */
const db = require('../db');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders()
    });
  }

  // GET - 获取作文列表
  if (request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const filters = {
        studentId: url.searchParams.get('studentId'),
        assignmentId: url.searchParams.get('assignmentId'),
        status: url.searchParams.get('status'),
        grade: url.searchParams.get('grade')
      };

      const essays = db.getEssays(filters);

      return jsonResponse({
        success: true,
        essays: essays.map(e => ({
          id: e.id,
          title: e.title,
          originalText: e.original_text,
          status: e.status,
          createdAt: e.created_at,
          userId: e.user_id,
          assignmentId: e.assignment_id
        }))
      });
    } catch (error) {
      console.error('Get essays error:', error);
      return jsonResponse({ success: false, error: '获取作文列表失败' }, 500);
    }
  }

  // POST - 提交作文
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { title, originalText, userId, assignmentId, grade, className } = body;

      if (!originalText) {
        return jsonResponse({ success: false, error: '请输入作文内容' }, 400);
      }

      const essay = db.createEssay({
        title: title || '无标题',
        original_text: originalText,
        user_id: userId || 1,
        assignment_id: assignmentId,
        grade: grade || '三年级',
        class_name: className
      });

      return jsonResponse({
        success: true,
        essay: {
          id: essay.id,
          title: essay.title,
          status: essay.status
        }
      }, 201);
    } catch (error) {
      console.error('Create essay error:', error);
      return jsonResponse({ success: false, error: '提交作文失败' }, 500);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
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
