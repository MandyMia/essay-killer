const { getAuthContext } = require("../_supabase");
module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  const ctx = await getAuthContext(request, { role: 'teacher' });
  if (!ctx) return json({ success: false, error: '未登录或无教师权限' }, 401);
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const assignmentId = parts[2];
  try {
    const { data: assignment, error: assignmentError } = await ctx.client.from('assignments').select('id,class_id,title').eq('id', assignmentId).maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment) return json({ success: false, error: '作业不存在' }, 404);
    const { data: ownedClass } = await ctx.client.from('classes').select('id').eq('id', assignment.class_id).eq('teacher_id', ctx.user.id).maybeSingle();
    if (!ownedClass) return json({ success: false, error: '无权查看该作业' }, 403);
    const [{ data: members, error: membersError }, { data: submissions, error: submissionsError }] = await Promise.all([
      ctx.client.from('class_members').select('student_id, profiles:student_id(id,username,role)').eq('class_id', assignment.class_id),
      ctx.client.from('submissions').select('id,assignment_id,student_id,essay_text,ocr_text,score,feedback,teacher_score,teacher_feedback,status,grading_detail').eq('assignment_id', assignmentId)
    ]);
    if (membersError || submissionsError) throw membersError || submissionsError;
    const submissionMap = new Map((submissions || []).map(item => [item.student_id, item]));
    const rows = (members || []).map(member => {
      const profile = member.profiles || { id: member.student_id, username: '未知学生', role: 'student' };
      const submission = submissionMap.get(member.student_id) || null;
      return { student_id: profile.id, username: profile.username, submission };
    });
    return json({ success: true, assignment, submissions: rows, data: rows });
  } catch (error) { console.error('Assignment submissions API:', error.message); return json({ success: false, error: '获取提交列表失败' }, 500); }
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
