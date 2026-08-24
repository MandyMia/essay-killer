import { getAuthContext } from '../../_shared/supabase.js';
import { json, options } from '../../_shared/http.js';
export async function onRequest({request,env}) {
 if(request.method==='OPTIONS') return options();
 const ctx=await getAuthContext(request,env); if(!ctx)return json({success:false,error:'未登录或登录已过期'},401);
 const id=new URL(request.url).pathname.split('/').filter(Boolean).pop();
 const r=await ctx.client.from('submissions').select('id,assignment_id,student_id,essay_text,ocr_text,score,feedback,teacher_score,teacher_feedback,status,grading_detail').eq('id',id).maybeSingle();
 if(r.error)return json({success:false,error:r.error.message},500); if(!r.data)return json({success:false,error:'提交不存在'},404);
 if(request.method==='GET') {if(ctx.profile.role==='student'&&r.data.student_id!==ctx.user.id)return json({success:false,error:'无权访问'},403);return json({success:true,submission:r.data,data:r.data});}
 if(request.method==='PATCH'&&ctx.profile.role==='teacher'){const a=await ctx.client.from('assignments').select('class_id').eq('id',r.data.assignment_id).maybeSingle();const own=await ctx.client.from('classes').select('id').eq('id',a.data?.class_id).eq('teacher_id',ctx.user.id).maybeSingle();if(!own.data)return json({success:false,error:'无权批改'},403);const b=await request.json();const u={teacher_score:Number(b.teacher_score),teacher_feedback:b.teacher_feedback||'',status:'graded'};const x=await ctx.client.from('submissions').update(u).eq('id',id).select().single();return x.error?json({success:false,error:x.error.message},500):json({success:true,submission:x.data,data:x.data});}
 return json({success:false,error:'Method not allowed'},405);
}
