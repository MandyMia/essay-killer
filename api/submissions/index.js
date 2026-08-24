const { getAuthContext } = require('../_supabase');
module.exports = async function (request) {
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  const ctx = await getAuthContext(request); if (!ctx) return json({ success: false, error: '未登录或登录已过期' }, 401);
  const url = new URL(request.url); const parts = url.pathname.split('/').filter(Boolean); const action = parts[2] || '';
  if (request.method === 'GET' && action === 'stats') return await completionStats(request, ctx);
  if (request.method === 'GET') {
    let query = ctx.client.from('submissions').select('id,assignment_id,student_id,essay_text,ocr_text,score,feedback,teacher_score,teacher_feedback,status,grading_detail');
    if (ctx.profile.role === 'student') query = query.eq('student_id', ctx.user.id);
    if (url.searchParams.get('assignmentId') || url.searchParams.get('assignment_id')) query = query.eq('assignment_id', url.searchParams.get('assignmentId') || url.searchParams.get('assignment_id'));
    if (url.searchParams.get('status')) query = query.eq('status', url.searchParams.get('status'));
    const { data, error } = await query.order('id'); if (error) throw error;
    return json({ success: true, submissions: data || [], data: data || [] });
  }
  if (request.method === 'POST') {
    if (ctx.profile.role !== 'student') return json({ success: false, error: '只有学生可以提交作文' }, 403);
    const body = await request.json(); const assignmentId = body.assignment_id || body.assignmentId; const essayText = body.essay_text || body.essayText; if (!assignmentId || !essayText) return json({ success: false, error: '缺少作业或作文内容' }, 400);
    const { data: assignment } = await ctx.client.from('assignments').select('id,class_id').eq('id', assignmentId).maybeSingle(); if (!assignment) return json({ success: false, error: '作业不存在' }, 404);
    const { data: member } = await ctx.client.from('class_members').select('id').eq('class_id', assignment.class_id).eq('student_id', ctx.user.id).maybeSingle(); if (!member) return json({ success: false, error: '请先加入该班级' }, 403);
    const { data: existing, error: existingError } = await ctx.client.from('submissions').select('id,assignment_id,student_id').eq('assignment_id', assignmentId).eq('student_id', ctx.user.id).order('id', { ascending: false });
    if (existingError) throw existingError;
    console.log('[提交作业] 当前 student_id:', ctx.user.id, 'assignment_id:', assignmentId, '已有记录:', JSON.stringify(existing));
    const payload = { assignment_id: assignmentId, student_id: ctx.user.id, essay_text: essayText, ocr_text: body.ocr_text || body.ocrText || '', score: body.score ?? null, feedback: body.feedback || null, teacher_score: null, teacher_feedback: null, status: 'submitted' };
    const { data, error } = await ctx.client.from('submissions').upsert(payload, { onConflict: 'assignment_id,student_id' }).select().single(); if (error) throw error;
    return json({ success: true, submission: data, data }, 201);
  }
  if (request.method === 'GET' && action === 'stats') return await completionStats(request, ctx);
  return json({ success: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('[Submissions API] 完整错误:', error);
    return json({ success: false, error: error.message || '提交服务失败' }, 500);
  }
};
async function completionStats(request, ctx) {
  if (ctx.profile.role !== 'teacher') return json({ success: false, error: '只有老师可以查看完成率' }, 403);
  const url = new URL(request.url); const classId = url.searchParams.get('classId');
  if (!classId) return json({ success: false, error: '缺少班级ID' }, 400);
  const { data: cls } = await ctx.client.from('classes').select('id').eq('id', classId).eq('teacher_id', ctx.user.id).maybeSingle();
  if (!cls) return json({ success: false, error: '班级不存在或无权访问' }, 403);
  const [{ data: members, error: membersError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    ctx.client.from('class_members').select('student_id').eq('class_id', classId),
    ctx.client.from('assignments').select('id').eq('class_id', classId)
  ]);
  if (membersError || assignmentsError) throw membersError || assignmentsError;
  const assignmentIds = (assignments || []).map(item => item.id);
  const { data: submissions, error: submissionsError } = assignmentIds.length
    ? await ctx.client.from('submissions').select('assignment_id,student_id').in('assignment_id', assignmentIds)
    : { data: [], error: null };
  if (submissionsError) throw submissionsError;
  const submitted = new Set((submissions || []).map(item => `${item.assignment_id}:${item.student_id}`));
  const total = (members || []).length * assignmentIds.length;
  const completed = submitted.size;
  return json({ success: true, data: { classId, totalStudents: (members || []).length, totalAssignments: assignmentIds.length, submittedCount: completed, completionRate: total ? Math.round(completed / total * 100) : 0 } });
}
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
