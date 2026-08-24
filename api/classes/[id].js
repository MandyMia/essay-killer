const { getAuthContext } = require('../_supabase');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  const ctx = await getAuthContext(request);
  if (!ctx) return json({ success: false, error: '未登录或登录已过期' }, 401);
  if (ctx.profile.role !== 'teacher') return json({ success: false, error: '只有老师可以管理班级' }, 403);

  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean).pop();
  try {
    const { data: cls, error: classError } = await ctx.client.from('classes')
      .select('id,name,teacher_id,class_code,student_count,max_students,grade').eq('id', id).maybeSingle();
    if (classError) throw classError;
    if (!cls) return json({ success: false, error: '班级不存在' }, 404);
    if (cls.teacher_id !== ctx.user.id) return json({ success: false, error: '无权操作该班级' }, 403);

    if (request.method === 'GET') {
      const { data: assignments, error: assignmentsError } = await ctx.client
        .from('assignments').select('id,class_id,title,content,deadline,teacher_id').eq('class_id', id);
      if (assignmentsError) throw assignmentsError;

      console.log('[班级详情] 查询学生, classId:', id);
      const { data: members, error: membersError } = await ctx.client
        .from('class_members').select('student_id').eq('class_id', id);
      console.log('[班级详情] class_members查询结果:', members, '错误:', membersError);
      if (membersError) throw membersError;

      const studentIds = [...new Set((Array.isArray(members) ? members : [])
        .map(member => member.student_id).filter(Boolean))];
      let students = [];
      if (studentIds.length) {
        const { data: profiles, error: profilesError } = await ctx.client
          .from('profiles').select('id,username,role').in('id', studentIds);
        console.log('[班级详情] profiles查询结果:', profiles, '错误:', profilesError);
        if (profilesError) throw profilesError;
        const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
        students = studentIds.map(studentId => profileMap.get(studentId) || {
          id: studentId, username: '未完成资料', role: 'student'
        });
      }
      return json({ success: true, data: { ...cls, assignments: Array.isArray(assignments) ? assignments : [], students } });
    }

    if (request.method === 'PATCH') {
      const body = await request.json();
      const updates = {};
      if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
      if (typeof body.grade === 'string') updates.grade = body.grade.trim();
      if (body.student_count !== undefined || body.studentCount !== undefined || body.max_students !== undefined) {
        const count = Number(body.student_count ?? body.studentCount ?? body.max_students);
        if (!Number.isInteger(count) || count < 0) return json({ success: false, error: '请输入有效的学生数量' }, 400);
        updates.student_count = count;
      }
      if (!Object.keys(updates).length) return json({ success: false, error: '没有可更新的字段' }, 400);
      const { data, error } = await ctx.client.from('classes').update(updates).eq('id', id).select('id,name,teacher_id,class_code,student_count,max_students,grade').single();
      if (error) throw error;
      return json({ success: true, class: data, data });
    }

    if (request.method === 'DELETE') {
      const { count: submissionCount, error: countError } = await ctx.client.from('submissions')
        .select('id, assignments!inner(class_id)', { count: 'exact', head: true }).eq('assignments.class_id', id);
      if (countError) throw countError;
      if (url.searchParams.get('confirm') !== 'true') {
        return json({ success: false, requiresConfirmation: true, submissionCount: submissionCount || 0, error: `该班级下有${submissionCount || 0}份提交记录，确认后才可删除` }, 409);
      }
      const { data: assignments } = await ctx.client.from('assignments').select('id').eq('class_id', id);
      const assignmentIds = (assignments || []).map(item => item.id);
      if (assignmentIds.length) {
        const { error } = await ctx.client.from('submissions').delete().in('assignment_id', assignmentIds);
        if (error) throw error;
        const { error: assignmentError } = await ctx.client.from('assignments').delete().eq('class_id', id);
        if (assignmentError) throw assignmentError;
      }
      const { error: memberError } = await ctx.client.from('class_members').delete().eq('class_id', id);
      if (memberError) throw memberError;
      const { error: deleteError } = await ctx.client.from('classes').delete().eq('id', id);
      if (deleteError) throw deleteError;
      return json({ success: true, deletedClassId: id, deletedSubmissionCount: submissionCount || 0 });
    }
    return json({ success: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('[班级详情] 完整错误:', error);
    return json({ success: false, error: error.message || '班级操作失败' }, 500);
  }
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
