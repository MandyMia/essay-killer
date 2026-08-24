import { getAuthContext } from '../../_shared/supabase.js';
import { json, options } from '../../_shared/http.js';
export async function onRequest({ request, env, params }) {
  if (request.method === 'OPTIONS') return options();
  const ctx = await getAuthContext(request, env);
  if (!ctx) return json({ success: false, error: '未登录或登录已过期' }, 401);
  const id = params?.id;
  if (request.method === 'GET') {
    const { data, error } = await ctx.client.from('classes').select('id,name,teacher_id,class_code,student_count,max_students,grade').eq('id', id).maybeSingle();
    if (error) return json({ success: false, error: error.message }, 500); if (!data) return json({ success: false, error: '班级不存在' }, 404);
    if (ctx.profile.role === 'teacher' && data.teacher_id !== ctx.user.id) return json({ success: false, error: '无权访问该班级' }, 403);
    const { data: members } = await ctx.client.from('class_members').select('student_id').eq('class_id', id);
    const studentIds = (members || []).map(item => item.student_id).filter(Boolean);
    const { data: students } = studentIds.length ? await ctx.client.from('profiles').select('id,username,role').in('id', studentIds) : { data: [] };
    const { data: assignments } = await ctx.client.from('assignments').select('id,class_id,title,content,deadline,teacher_id').eq('class_id', id);
    return json({ success: true, data: { ...data, students: students || [], assignments: assignments || [] } });
  }
  if (ctx.profile.role !== 'teacher' || request.method !== 'PATCH') return json({ success: false, error: 'Method not allowed' }, 405);
  const { data: own } = await ctx.client.from('classes').select('id').eq('id', id).eq('teacher_id', ctx.user.id).maybeSingle(); if (!own) return json({ success: false, error: '无权操作' }, 403);
  const body = await request.json(); const updates = {}; if (body.name) updates.name = String(body.name).trim(); if (body.grade !== undefined) updates.grade = body.grade; if (body.student_count !== undefined) updates.student_count = Number(body.student_count);
  const { data, error } = await ctx.client.from('classes').update(updates).eq('id', id).select().single(); return error ? json({ success: false, error: error.message }, 500) : json({ success: true, data });
}
