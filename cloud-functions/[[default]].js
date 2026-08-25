import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const env = process.env;
function service() { return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }); }
function anon() { return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } }); }
async function auth(req, role) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user }, error } = await anon().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await service().from('profiles').select('id,username,role').eq('id', user.id).maybeSingle();
  return profile && (!role || profile.role === role) ? { user, profile, db: service() } : null;
}
function json(res, data, status = 200) { return res.status(status).json(data); }
function idOf(req) { return req.params.id || req.params.assignmentId; }

app.get('/health', (_req, res) => json(res, { ok: true, service: 'essay-killer-cloud-functions' }));

app.post('/api/auth/register', async (req, res) => { try { const { email, password, username, role } = req.body; if (!email || !password || !username || !['teacher','student'].includes(role)) return json(res, { success:false,error:'注册信息不完整' },400); const { data, error } = await anon().auth.signUp({ email, password }); if (error || !data.user) return json(res,{success:false,error:error?.message||'注册失败'},400); const p=await service().from('profiles').insert({id:data.user.id,username,role}).select().single(); if(p.error)return json(res,{success:false,error:'用户资料保存失败'},500); return json(res,{success:true,session:data.session,user:p.data,requiresEmailConfirmation:!data.session}); } catch(e){ console.error(e); return json(res,{success:false,error:e.message},500); } });
app.post('/api/auth/login', async (req,res)=>{try{const {email,password}=req.body;const r=await anon().auth.signInWithPassword({email,password});if(r.error||!r.data.session)return json(res,{success:false,error:r.error?.message||'登录失败'},401);const p=await service().from('profiles').select('id,username,role').eq('id',r.data.user.id).single();return json(res,{success:true,session:r.data.session,user:p.data});}catch(e){return json(res,{success:false,error:e.message},500);}});
app.get('/api/auth/me', async(req,res)=>{const c=await auth(req);return c?json(res,{success:true,user:{id:c.user.id,email:c.user.email,...c.profile}}):json(res,{success:false,error:'未登录'},401);});
app.post('/api/auth/refresh',async(req,res)=>{try{const r=await anon().auth.refreshSession({refresh_token:req.body.refresh_token});if(r.error||!r.data.session)return json(res,{success:false,error:'登录已过期'},401);return json(res,{success:true,access_token:r.data.session.access_token,refresh_token:r.data.session.refresh_token,session:r.data.session});}catch(e){return json(res,{success:false,error:e.message},500);}});

app.get('/api/classes', async(req,res)=>{try{const c=await auth(req);if(!c)return json(res,{success:false,error:'未登录'},401);let data=[];if(c.profile.role==='teacher'){const r=await c.db.from('classes').select('*').eq('teacher_id',c.user.id);data=r.data||[];}else{const r=await c.db.from('class_members').select('class_id,classes(*)').eq('student_id',c.user.id);data=(r.data||[]).map(x=>x.classes).filter(Boolean);}return json(res,{success:true,classes:data,data});}catch(e){return json(res,{success:false,error:e.message},500);}});
app.post('/api/classes',async(req,res)=>{try{const c=await auth(req,'teacher');if(!c)return json(res,{success:false,error:'无教师权限'},401);const code=Math.random().toString(36).slice(2,8).toUpperCase();const r=await c.db.from('classes').insert({name:req.body.name||req.body.class_name,teacher_id:c.user.id,class_code:code,student_count:Number(req.body.student_count||0)}).select().single();return r.error?json(res,{success:false,error:r.error.message},500):json(res,{success:true,class:r.data,data:r.data},201);}catch(e){return json(res,{success:false,error:e.message},500);}});
app.post('/api/classes/join',async(req,res)=>{try{const c=await auth(req,'student');if(!c)return json(res,{success:false,error:'无学生权限'},401);const r=await c.db.from('classes').select('*').eq('class_code',String(req.body.class_code||req.body.classCode).toUpperCase()).single();if(r.error)return json(res,{success:false,error:'班级码不存在'},404);const x=await c.db.from('class_members').upsert({class_id:r.data.id,student_id:c.user.id},{onConflict:'class_id,student_id'});return x.error?json(res,{success:false,error:x.error.message},500):json(res,{success:true,class:r.data});}catch(e){return json(res,{success:false,error:e.message},500);}});
app.get('/api/classes/:id',async(req,res)=>{try{const c=await auth(req);if(!c)return json(res,{success:false,error:'未登录'},401);const r=await c.db.from('classes').select('*').eq('id',req.params.id).single();if(r.error)return json(res,{success:false,error:r.error.message},404);const m=await c.db.from('class_members').select('student_id,profiles:student_id(id,username,role)').eq('class_id',req.params.id);const a=await c.db.from('assignments').select('*').eq('class_id',req.params.id);return json(res,{success:true,data:{...r.data,students:(m.data||[]).map(x=>x.profiles).filter(Boolean),assignments:a.data||[]}});}catch(e){return json(res,{success:false,error:e.message},500);}});

app.get('/api/assignments',async(req,res)=>{try{const c=await auth(req);if(!c)return json(res,{success:false,error:'未登录'},401);let q=c.db.from('assignments').select('*');if(c.profile.role==='teacher'){const cs=await c.db.from('classes').select('id').eq('teacher_id',c.user.id);q=q.in('class_id',(cs.data||[]).map(x=>x.id));}else{const ms=await c.db.from('class_members').select('class_id').eq('student_id',c.user.id);q=q.in('class_id',(ms.data||[]).map(x=>x.class_id));}if(req.query.class_id)q=q.eq('class_id',req.query.class_id);if(req.query.assignment_id)q=q.eq('id',req.query.assignment_id);const r=await q.order('deadline',{ascending:true});if(r.error)return json(res,{success:false,error:r.error.message},500);if(c.profile.role==='student'){const s=await c.db.from('submissions').select('*').eq('student_id',c.user.id);const map=new Map((s.data||[]).map(x=>[String(x.assignment_id),x]));r.data.forEach(x=>x.submission=map.get(String(x.id))||null);}return json(res,{success:true,assignments:r.data||[],data:r.data||[]});}catch(e){return json(res,{success:false,error:e.message},500);}});
app.post('/api/assignments',async(req,res)=>{try{const c=await auth(req,'teacher');if(!c)return json(res,{success:false,error:'无教师权限'},401);const r=await c.db.from('assignments').insert({...req.body,teacher_id:c.user.id,class_id:req.body.class_id}).select().single();return r.error?json(res,{success:false,error:r.error.message},500):json(res,{success:true,assignment:r.data,data:r.data},201);}catch(e){return json(res,{success:false,error:e.message},500);}});

app.get('/api/submissions',async(req,res)=>{try{const c=await auth(req);if(!c)return json(res,{success:false,error:'未登录'},401);let q=c.db.from('submissions').select('*');if(c.profile.role==='student')q=q.eq('student_id',c.user.id);if(req.query.assignment_id)q=q.eq('assignment_id',req.query.assignment_id);if(req.query.status)q=q.eq('status',req.query.status);const r=await q.order('id',{ascending:false});return r.error?json(res,{success:false,error:r.error.message},500):json(res,{success:true,submissions:r.data||[],data:r.data||[]});}catch(e){return json(res,{success:false,error:e.message},500);}});
app.post('/api/submissions',async(req,res)=>{try{const c=await auth(req,'student');if(!c)return json(res,{success:false,error:'无学生权限'},401);const p={assignment_id:req.body.assignment_id,student_id:c.user.id,essay_text:req.body.essay_text,ocr_text:req.body.ocr_text||'',score:req.body.score??null,feedback:req.body.feedback||null,status:'submitted'};const r=await c.db.from('submissions').upsert(p,{onConflict:'assignment_id,student_id'}).select().single();return r.error?json(res,{success:false,error:r.error.message},500):json(res,{success:true,submission:r.data,data:r.data},201);}catch(e){return json(res,{success:false,error:e.message},500);}});
app.get('/api/submissions/:id',async(req,res)=>{try{const c=await auth(req);if(!c)return json(res,{success:false,error:'未登录'},401);const r=await c.db.from('submissions').select('*').eq('id',req.params.id).single();return r.error?json(res,{success:false,error:r.error.message},404):json(res,{success:true,submission:r.data,data:r.data});}catch(e){return json(res,{success:false,error:e.message},500);}});
app.patch('/api/submissions/:id',async(req,res)=>{try{const c=await auth(req,'teacher');if(!c)return json(res,{success:false,error:'无教师权限'},401);const u={teacher_score:Number(req.body.teacher_score),teacher_feedback:req.body.teacher_feedback||'',status:'graded'};const r=await c.db.from('submissions').update(u).eq('id',req.params.id).select().single();return r.error?json(res,{success:false,error:r.error.message},500):json(res,{success:true,submission:r.data,data:r.data});}catch(e){return json(res,{success:false,error:e.message},500);}});

app.post('/api/ocr', upload.any(), async(req,res)=>{try{const file=req.files?.[0];if(!file)return json(res,{success:false,error:'未找到上传文件'},400);const token=await (await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${process.env.BAIDU_API_KEY}&client_secret=${process.env.BAIDU_SECRET_KEY}`,{method:'POST'})).json();const params=new URLSearchParams({image:file.buffer.toString('base64')});const d=await (await fetch(`https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token.access_token}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params})).json();const text=(d.words_result||[]).map(x=>x.words).join('\n');return json(res,{success:true,text,extractedText:text});}catch(e){console.error(e);return json(res,{success:false,error:e.message},500);}});

const AI_MAX_TEXT = 12000;
const AI_TIMEOUT_MS = 30000;
const aiRateMap = new Map();
function allowAi(req) {
  const key = req.headers['x-forwarded-for'] || req.ip || 'guest';
  const now = Date.now();
  const item = aiRateMap.get(key) || { start: now, count: 0 };
  if (now - item.start >= 60000) { item.start = now; item.count = 0; }
  item.count += 1;
  aiRateMap.set(key, item);
  return item.count <= 10;
}
function parseAiContent(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return typeof parsed.content === 'string' ? parsed.content.trim() : '';
  } catch { return cleaned; }
}
app.post('/api/ai/format-essay', async (req, res) => {
  try {
    if (!allowAi(req)) return json(res, { success: false, error: 'AI请求过于频繁，请稍后再试' }, 429);
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return json(res, { success: false, error: 'AI整理服务未配置' }, 503);
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const grade = typeof req.body.grade === 'string' ? req.body.grade.trim() : '';
    if (!text) return json(res, { success: false, error: '缺少待整理的作文内容' }, 400);
    if (text.length > AI_MAX_TEXT) return json(res, { success: false, error: `作文内容不能超过${AI_MAX_TEXT}字` }, 400);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    let response;
    try {
      response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: '你是小学语文作文整理助手。只整理OCR识别出的作文：恢复合理分段、标点和句子连接，保留原文事实、语气和内容，不添加原文没有的信息，不评分、不点评。输出必须是JSON对象，格式为 {"content":"整理后的作文"}。' },
            { role: 'user', content: `题目：${title || '未提供'}\n年级：${grade || '未提供'}\nOCR原文：\n${text}` }
          ]
        })
      });
    } finally { clearTimeout(timer); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('DeepSeek error:', response.status, data.error?.message || 'unknown');
      return json(res, { success: false, error: 'AI整理服务暂时不可用，请稍后重试' }, 502);
    }
    const formatted = parseAiContent(data.choices?.[0]?.message?.content);
    if (!formatted) return json(res, { success: false, error: 'AI未返回有效的整理结果' }, 502);
    return json(res, { success: true, content: formatted });
  } catch (e) {
    console.error('format-essay error:', e.message);
    return json(res, { success: false, error: e.name === 'AbortError' ? 'AI整理超时，请稍后重试' : 'AI整理失败，请保留原文' }, 502);
  }
});
app.all('/api/*splat',(_req,res)=>json(res,{success:false,error:'API route not found'},404));
export default app;
