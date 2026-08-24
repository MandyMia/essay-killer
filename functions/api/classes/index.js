import { getAuthContext } from '../../_shared/supabase.js';
import { json, options } from '../../_shared/http.js';
function code() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join(''); }
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return options();
  if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/join')) {
    const ctx = await getAuthContext(request, env, 'student'); if (!ctx) return json({ success:false,error:'只有学生可以加入班级' },403);
    const body=await request.json(); const classCode=String(body.class_code||body.classCode||'').toUpperCase(); const {data: cls}=await ctx.client.from('classes').select('id,name,class_code').eq('class_code',classCode).maybeSingle(); if(!cls)return json({success:false,error:'班级码不存在'},404);
    const {error}=await ctx.client.from('class_members').upsert({class_id:cls.id,student_id:ctx.user.id},{onConflict:'class_id,student_id'}); if(error)return json({success:false,error:error.message},500); return json({success:true,class:cls});
  }
  const ctx=await getAuthContext(request,env); if(!ctx)return json({success:false,error:'未登录或登录已过期'},401);
  if(request.method==='GET') { let data=[]; if(ctx.profile.role==='teacher'){const r=await ctx.client.from('classes').select('id,name,teacher_id,class_code,student_count,max_students,grade').eq('teacher_id',ctx.user.id); data=r.data||[];} else {const r=await ctx.client.from('class_members').select('class_id,classes(id,name,teacher_id,class_code,student_count,max_students,grade)').eq('student_id',ctx.user.id); data=(r.data||[]).map(x=>x.classes).filter(Boolean);} return json({success:true,classes:data,data}); }
  if(request.method==='POST'&&ctx.profile.role==='teacher'){const b=await request.json();const r=await ctx.client.from('classes').insert({name:b.name||b.class_name,teacher_id:ctx.user.id,class_code:code(),student_count:Number(b.student_count||0)}).select().single();return r.error?json({success:false,error:r.error.message},500):json({success:true,class:r.data,data:r.data},201);}
  return json({success:false,error:'Method not allowed'},405);
}
