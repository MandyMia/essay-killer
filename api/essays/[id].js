/**
 * 作文详情 API
 * GET /api/essays/[id] - 获取作文详情
 * PUT /api/essays/[id] - 更新作文
 */
const db = require('../../db');

module.exports = async function (request) {
  // 提取作文 ID
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = parseInt(pathParts[pathParts.length - 1]);

  if (isNaN(id)) {
    return jsonResponse({ error: 'Invalid essay ID' }, 400);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders()
    });
  }

  // GET - 获取作文详情
  if (request.method === 'GET') {
    try {
      const essay = db.findEssay(id);

      if (!essay) {
        return jsonResponse({ success: false, error: '作文不存在' }, 404);
      }

      // 获取关联的批改信息
      const grading = db.findGrading(id);

      return jsonResponse({
        success: true,
        data: {
          id: essay.id,
          title: essay.title,
          originalText: essay.original_text,
          status: essay.status,
          createdAt: essay.created_at,
          author: essay.user_id ? {
            id: essay.user_id,
            grade: essay.grade,
            className: essay.class_name
          } : null,
          grading: grading ? {
            id: grading.id,
            totalScore: grading.total_score,
            contentScore: grading.content_score,
            structureScore: grading.structure_score,
            languageScore: grading.language_score,
            creativityScore: grading.creativity_score,
            positiveComments: grading.positive_comments,
            suggestions: grading.suggestions,
            overallComments: grading.overall_comments
          } : null,
          images: essay.image_path ? essay.image_path.split(',').map(p => `/uploads/${p}`) : []
        }
      });
    } catch (error) {
      console.error('Get essay error:', error);
      return jsonResponse({ success: false, error: '获取作文详情失败' }, 500);
    }
  }

  // PUT - 更新作文
  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      const essay = db.updateEssay(id, body);

      if (!essay) {
        return jsonResponse({ success: false, error: '作文不存在' }, 404);
      }

      return jsonResponse({
        success: true,
        data: essay
      });
    } catch (error) {
      console.error('Update essay error:', error);
      return jsonResponse({ success: false, error: '更新作文失败' }, 500);
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
