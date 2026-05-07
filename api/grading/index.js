/**
 * 批改 API
 * POST /api/grading - 提交批改
 */
const db = require('../db');

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
    const {
      essayId,
      teacherId,
      contentScore,
      structureScore,
      languageScore,
      creativityScore,
      positiveComments,
      suggestions,
      overallComments
    } = body;

    if (!essayId) {
      return jsonResponse({ success: false, error: '缺少作文ID' }, 400);
    }

    // 检查作文是否存在
    const essay = db.findEssay(essayId);
    if (!essay) {
      return jsonResponse({ success: false, error: '作文不存在' }, 404);
    }

    // 验证分数
    const scores = { contentScore, structureScore, languageScore, creativityScore };
    for (const [key, value] of Object.entries(scores)) {
      if (value !== undefined && (value < 0 || value > 25)) {
        return jsonResponse({ success: false, error: `${key}必须在0-25分之间` }, 400);
      }
    }

    // 计算总分
    const totalScore = (contentScore || 0) + (structureScore || 0) +
                       (languageScore || 0) + (creativityScore || 0);

    // 检查是否已有批改
    const existingGrading = db.findGrading(essayId);

    let grading;
    if (existingGrading) {
      // 更新批改
      grading = db.updateGrading(existingGrading.id, {
        content_score: contentScore,
        structure_score: structureScore,
        language_score: languageScore,
        creativity_score: creativityScore,
        total_score: totalScore,
        positive_comments: positiveComments,
        suggestions: suggestions,
        overall_comments: overallComments,
        grading_status: 'submitted'
      });

      // 更新作文状态
      db.updateEssay(essayId, {
        status: 'completed',
        reviewed_at: new Date().toISOString(),
        teacher_comment: overallComments
      });
    } else {
      // 创建新批改
      grading = db.createGrading({
        essay_id: essayId,
        teacher_id: teacherId || 1,
        content_score: contentScore || 0,
        structure_score: structureScore || 0,
        language_score: languageScore || 0,
        creativity_score: creativityScore || 0,
        total_score: totalScore,
        positive_comments: positiveComments,
        suggestions: suggestions,
        overall_comments: overallComments
      });

      // 更新作文状态
      db.updateEssay(essayId, {
        status: 'completed',
        reviewed_at: new Date().toISOString(),
        teacher_comment: overallComments
      });
    }

    return jsonResponse({
      success: true,
      message: '批改成功',
      grading: {
        id: grading.id,
        totalScore: grading.total_score,
        contentScore: grading.content_score,
        structureScore: grading.structure_score,
        languageScore: grading.language_score,
        creativityScore: grading.creativity_score,
        overallComments: grading.overall_comments
      }
    }, 201);
  } catch (error) {
    console.error('Grading error:', error);
    return jsonResponse({ success: false, error: '批改失败' }, 500);
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
