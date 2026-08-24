const { getAuthContext } = require('../_supabase');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  const ctx = await getAuthContext(request, { role: 'teacher' });
  if (!ctx) return json({ success: false, error: '未登录或无教师权限' }, 401);
  try {
    const { data: classes, error: classError } = await ctx.client.from('classes').select('id').eq('teacher_id', ctx.user.id);
    if (classError) throw classError;
    const classIds = (classes || []).map(item => item.id);
    if (!classIds.length) return json({ success: true, data: { classCount: 0, studentCount: 0, assignmentCount: 0, pendingCount: 0, gradedCount: 0, averageScore: null } });
    const [{ data: members, error: memberError }, { data: assignments, error: assignmentError }] = await Promise.all([
      ctx.client.from('class_members').select('student_id').in('class_id', classIds),
      ctx.client.from('assignments').select('id').in('class_id', classIds)
    ]);
    if (memberError || assignmentError) throw memberError || assignmentError;
    const assignmentIds = (assignments || []).map(item => item.id);
    const { data: submissions, error: submissionError } = assignmentIds.length
      ? await ctx.client.from('submissions').select('status,score').in('assignment_id', assignmentIds)
      : { data: [], error: null };
    if (submissionError) throw submissionError;
    const graded = (submissions || []).filter(item => item.status === 'graded' && Number.isFinite(Number(item.score)));
    const sum = graded.reduce((total, item) => total + Number(item.score), 0);
    return json({ success: true, data: {
      classCount: classIds.length,
      studentCount: new Set((members || []).map(item => item.student_id)).size,
      assignmentCount: assignmentIds.length,
      pendingCount: (submissions || []).filter(item => item.status === 'submitted').length,
      gradedCount: (submissions || []).filter(item => item.status === 'graded').length,
      averageScore: graded.length ? Math.round(sum / graded.length) : null
    } });
  } catch (error) { console.error('Dashboard stats error:', error.message); return json({ success: false, error: '获取统计数据失败' }, 500); }
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
