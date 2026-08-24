const { getAuthContext } = require('../_supabase');

module.exports = async function (request) {
  if (request.method === 'OPTIONS') return response(null, 200);
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const action = parts[2] || '';
  try {
    if (request.method === 'POST' && action === 'join') return await joinClass(request);
    const ctx = await getAuthContext(request);
    if (!ctx) return json({ success: false, error: '未登录或登录已过期' }, 401);
    if (request.method === 'GET' && !action) return await listClasses(ctx);
    if (request.method === 'POST' && !action) return await createClass(request, ctx);
    if (request.method === 'GET' && action) return await getClass(request, ctx, action);
    return json({ success: false, error: 'Method not allowed' }, 405);
  } catch (error) { console.error('Classes API:', error.message); return json({ success: false, error: '班级服务失败' }, 500); }
};
async function listClasses(ctx) {
  if (ctx.profile.role === 'teacher') {
    const { data, error } = await ctx.client.from('classes').select('id,name,teacher_id,class_code,student_count,max_students,grade').eq('teacher_id', ctx.user.id);
    if (error) throw error;
    const classes = (data || []).map(cls => ({ ...cls, student_count: cls.student_count ?? cls.max_students ?? 0, studentCount: cls.student_count ?? cls.max_students ?? 0 }));
    return json({ success: true, classes, data: classes });
  }
  const { data, error } = await ctx.client.from('class_members').select('class_id, classes(id,name,teacher_id,class_code,student_count,max_students,grade, profiles:teacher_id(username))').eq('student_id', ctx.user.id);
  if (error) throw error; const classes = (data || []).map(row => row.classes).filter(Boolean);
  return json({ success: true, classes, data: classes });
}
async function addStudentCounts(client, classes) {
  return classes.map(cls => ({ ...cls, student_count: cls.student_count ?? cls.max_students ?? 0, studentCount: cls.student_count ?? cls.max_students ?? 0 }));
}
async function createClass(request, ctx) {
  if (ctx.profile.role !== 'teacher') return json({ success: false, error: '只有老师可以创建班级' }, 403);
  const body = await request.json(); const name = body.name || body.class_name || body.className;
  const studentCount = Number(body.student_count ?? body.studentCount ?? body.max_students ?? body.maxStudents);
  if (!name) return json({ success: false, error: '请输入班级名称' }, 400);
  if (!Number.isInteger(studentCount) || studentCount < 0) return json({ success: false, error: '请输入有效的学生数量' }, 400);
  let code, exists;
  do { code = randomCode(); const result = await ctx.client.from('classes').select('id').eq('class_code', code).maybeSingle(); exists = result.data; } while (exists);
  const { data, error } = await ctx.client.from('classes').insert({ name, teacher_id: ctx.user.id, class_code: code, student_count: studentCount }).select('id,name,teacher_id,class_code,student_count,max_students,grade').single();
  if (error) throw error; return json({ success: true, class: data, data });
}
async function joinClass(request) {
  const ctx = await getAuthContext(request, { role: 'student' });
  if (!ctx) return json({ success: false, error: '只有学生可以加入班级' }, 403);
  const body = await request.json(); const code = String(body.classCode || body.class_code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return json({ success: false, error: '请输入6位班级码' }, 400);
  const { data: cls, error } = await ctx.client.from('classes').select('id,name,class_code').eq('class_code', code).maybeSingle();
  if (error) throw error; if (!cls) return json({ success: false, error: '班级码不存在' }, 404);
  const { data: existing } = await ctx.client.from('class_members').select('id').eq('class_id', cls.id).eq('student_id', ctx.user.id).maybeSingle();
  if (!existing) { const result = await ctx.client.from('class_members').insert({ class_id: cls.id, student_id: ctx.user.id }); if (result.error) throw result.error; }
  return json({ success: true, class: cls });
}
async function getClass(request, ctx, id) { const { data, error } = await ctx.client.from('classes').select('id,name,teacher_id,class_code').eq('id', id).maybeSingle(); if (error) throw error; if (!data) return json({ success: false, error: '班级不存在' }, 404); return json({ success: true, data, class: data }); }
function randomCode() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
function json(data, status = 200) { return response(JSON.stringify(data), status, { 'Content-Type': 'application/json' }); }
function response(body, status, extra = {}) { return new Response(body, { status, headers: { ...extra, ...cors() } }); }
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }; }
