const { getAuthContext } = require('../_supabase');
module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  const ctx = await getAuthContext(request); if (!ctx) return json({ success: false, error: '未登录或登录已过期' }, 401);
  const parts = new URL(request.url).pathname.split('/').filter(Boolean); const id = parts[2];
  const { data: submission, error } = await ctx.client.from('submissions').select('id,assignment_id,student_id,essay_text,ocr_text,score,feedback,teacher_score,teacher_feedback,status,grading_detail').eq('id', id).maybeSingle();
  if (error) return json({ success: false, error: '获取提交失败' }, 500); if (!submission) return json({ success: false, error: '提交不存在' }, 404);
  if (request.method === 'GET') {
    if (ctx.profile.role === 'student' && submission.student_id !== ctx.user.id) return json({ success: false, error: '无权访问' }, 403);
    return json({ success: true, data: submission, submission });
  }
  if (request.method === 'PATCH' && ctx.profile.role === 'teacher') {
    const { data: assignment } = await ctx.client.from('assignments').select('id,class_id').eq('id', submission.assignment_id).maybeSingle();
    if (!assignment) return json({ success: false, error: '关联作业不存在' }, 404);
    const { data: ownedClass } = await ctx.client.from('classes').select('id').eq('id', assignment.class_id).eq('teacher_id', ctx.user.id).maybeSingle();
    if (!ownedClass) return json({ success: false, error: '无权批改该提交' }, 403);
    const body = await request.json();
    const teacherScore = Number(body.teacher_score ?? body.teacherScore);
    if (!Number.isInteger(teacherScore) || teacherScore < 0 || teacherScore > 100) return json({ success: false, error: '老师评分必须是0-100的整数' }, 400);
    const allowed = { teacher_score: teacherScore, teacher_feedback: body.teacher_feedback ?? body.teacherFeedback ?? '', status: 'graded' };
    const { data, error: updateError } = await ctx.client.from('submissions').update(allowed).eq('id', id).select().single(); if (updateError) return json({ success: false, error: '批改失败' }, 500);
    return json({ success: true, data, submission: data });
  }
  return json({ success: false, error: '无权操作' }, 403);
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
