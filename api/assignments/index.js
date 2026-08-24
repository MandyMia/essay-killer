const { getAuthContext } = require('../_supabase');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors() });
  const ctx = await getAuthContext(request);
  if (!ctx) return json({ success: false, error: '未登录或登录已过期' }, 401);
  const url = new URL(request.url);
  try {
    if (request.method === 'GET') {
      let query = ctx.client.from('assignments').select('id,class_id,title,content,deadline,teacher_id,essay_type,min_words,max_words,reference_essay,need_handwriting,need_recitation,submit_as_model');
      if (ctx.profile.role === 'teacher') {
        const { data: classes, error } = await ctx.client.from('classes').select('id').eq('teacher_id', ctx.user.id);
        if (error) throw error;
        query = query.in('class_id', (classes || []).map(c => c.id));
      } else {
        const { data: members, error } = await ctx.client.from('class_members').select('class_id').eq('student_id', ctx.user.id);
        if (error) throw error;
        const classIds = (members || []).map(m => m.class_id);
        query = classIds.length ? query.in('class_id', classIds) : query.eq('class_id', '__none__');
      }
      const classId = url.searchParams.get('classId') || url.searchParams.get('class_id');
      if (classId) query = query.eq('class_id', classId);
      const pathId = url.pathname.split('/').filter(Boolean)[1];
      const assignmentId = url.searchParams.get('assignment_id') || url.searchParams.get('assignmentId') || (pathId && pathId !== 'assignments' ? pathId : null);
      if (assignmentId) query = query.eq('id', assignmentId);
      const { data, error } = await query.order('deadline', { ascending: true });
      if (error) throw error;
      if (ctx.profile.role === 'student') {
        console.log('[作业列表] 学生ID:', ctx.user.id);
        const { data: submissions, error: submissionError } = await ctx.client.from('submissions').select('id,assignment_id,student_id,status,score,teacher_score,teacher_feedback,feedback').eq('student_id', ctx.user.id);
        if (submissionError) {
          console.error('[作业列表] submissions查询失败:', submissionError);
          throw submissionError;
        }
        console.log('[作业列表] submissions数量:', submissions?.length || 0);
        console.log('[作业列表] 第一条submission:', JSON.stringify(submissions?.[0] || null));
        const submissionMap = {};
        (submissions || []).forEach(s => { submissionMap[String(s.assignment_id)] = s; });
        const result = (data || []).map(a => ({ ...a, submission: submissionMap[String(a.id)] || null }));
        console.log('[作业列表] 第一条作业submission:', JSON.stringify(result[0]?.submission || null));
        console.log('[作业列表] 返回作业数量:', result.length);
        return json({ success: true, assignments: result, data: result });
      }
      console.log('[作业列表] 教师ID:', ctx.user.id);
      return json({ success: true, assignments: data || [], data: data || [] });
    }
    if (request.method === 'POST') {
      if (ctx.profile.role !== 'teacher') return json({ success: false, error: '只有老师可以布置作业' }, 403);
      const body = await request.json();
      const classId = body.class_id || body.classId;
      if (!classId || !body.title) return json({ success: false, error: '缺少班级或作业标题' }, 400);
      const { data: cls } = await ctx.client.from('classes').select('id').eq('id', classId).eq('teacher_id', ctx.user.id).maybeSingle();
      if (!cls) return json({ success: false, error: '无权在该班级布置作业' }, 403);
      const { data, error } = await ctx.client.from('assignments').insert({ class_id: classId, title: body.title, content: body.content || body.description || '', deadline: body.deadline || null, teacher_id: ctx.user.id }).select().single();
      if (error) throw error;
      return json({ success: true, assignment: data, data }, 201);
    }
    return json({ success: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('[Assignments API] 完整错误:', error);
    return json({ success: false, error: error.message || '作业服务失败' }, 500);
  }
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
