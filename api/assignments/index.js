/**
 * 作业 API
 * GET /api/assignments - 获取作业列表
 * POST /api/assignments - 创建作业
 */
const db = require('../db');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders()
    });
  }

  // GET - 获取作业列表
  if (request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const filters = {
        classId: url.searchParams.get('classId'),
        status: url.searchParams.get('status')
      };

      const assignments = db.getAssignments(filters);

      return jsonResponse({
        success: true,
        assignments: assignments.map(a => ({
          id: a.id,
          title: a.title,
          type: a.type,
          minWords: a.min_words,
          maxWords: a.max_words,
          points: a.points,
          deadline: a.deadline,
          status: a.status,
          classId: a.class_id,
          createdAt: a.created_at
        }))
      });
    } catch (error) {
      console.error('Get assignments error:', error);
      return jsonResponse({ success: false, error: '获取作业列表失败' }, 500);
    }
  }

  // POST - 创建作业
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const {
        title,
        type,
        classId,
        minWords,
        maxWords,
        points,
        deadline,
        description,
        requirements
      } = body;

      if (!title) {
        return jsonResponse({ success: false, error: '请输入作业标题' }, 400);
      }

      const assignment = db.createAssignment({
        title,
        type: type || '作文',
        class_id: classId,
        min_words: minWords || 200,
        max_words: maxWords || 500,
        points: points || 100,
        deadline: deadline,
        description,
        requirements
      });

      return jsonResponse({
        success: true,
        assignment: {
          id: assignment.id,
          title: assignment.title,
          status: assignment.status
        }
      }, 201);
    } catch (error) {
      console.error('Create assignment error:', error);
      return jsonResponse({ success: false, error: '创建作业失败' }, 500);
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
