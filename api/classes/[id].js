/**
 * 班级详情 API
 * GET /api/classes/[id] - 获取班级详情
 */
const db = require('../../db');

module.exports = async function (request) {
  // 提取班级 ID
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = parseInt(pathParts[pathParts.length - 1]);

  if (isNaN(id)) {
    return jsonResponse({ error: 'Invalid class ID' }, 400);
  }

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
    const cls = db.findClass(id);

    if (!cls) {
      return jsonResponse({ success: false, error: '班级不存在' }, 404);
    }

    // 获取班级的作业列表及统计
    const assignments = db.getAssignments({ classId: id });
    const essays = db.getEssays({ assignmentId: id });

    const assignmentStats = assignments.map(a => {
      const submittedCount = essays.filter(e => e.assignment_id === a.id).length;
      const gradedEssays = essays.filter(e => e.status === 'completed');
      const avgScore = gradedEssays.length > 0
        ? Math.round(gradedEssays.reduce((sum, e) => {
            const g = db.findGrading(e.id);
            return sum + (g ? g.total_score : 0);
          }, 0) / gradedEssays.length)
        : null;

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        deadline: a.deadline,
        status: a.status,
        createdAt: a.created_at,
        stats: {
          total: 0,
          submitted: submittedCount,
          graded: gradedEssays.length,
          avgScore
        }
      };
    });

    return jsonResponse({
      success: true,
      data: {
        id: cls.id,
        name: cls.name,
        description: cls.description,
        teacherId: cls.teacher_id,
        createdAt: cls.created_at,
        assignments: assignmentStats
      }
    });
  } catch (error) {
    console.error('Get class detail error:', error);
    return jsonResponse({ success: false, error: '获取班级详情失败' }, 500);
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
