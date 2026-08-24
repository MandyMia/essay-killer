import { json, options } from '../../_shared/http.js';
const counters = new Map();
function allow(request) { const key = request.headers.get('x-forwarded-for') || 'guest'; const now = Date.now(); const item = counters.get(key) || { start: now, count: 0 }; if (now - item.start >= 60000) { item.start = now; item.count = 0; } item.count += 1; counters.set(key, item); return item.count <= 10; }
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return options();
  if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  if (!allow(request)) return json({ success: false, error: 'OCR请求过于频繁，请稍后再试' }, 429);
  try {
    const type = request.headers.get('content-type') || '';
    let image = '';
    if (type.includes('multipart/form-data')) { const form = await request.formData(); const file = form.get('image') || form.get('images[]') || [...form.entries()].find(([k]) => /^images\\[\\d+\\]$/.test(k))?.[1]; if (!file) return json({ success: false, error: '请上传图片' }, 400); image = Buffer.from(await file.arrayBuffer()).toString('base64'); }
    else { image = (await request.json()).image || ''; }
    if (!image) return json({ success: false, error: '请提供图片数据' }, 400);
    const token = await (await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(env.BAIDU_API_KEY)}&client_secret=${encodeURIComponent(env.BAIDU_SECRET_KEY)}`)).json();
    const result = await (await fetch(`https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting?access_token=${encodeURIComponent(token.access_token)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `image=${encodeURIComponent(image)}` })).json();
    if (result.error_code) return json({ success: false, error: result.error_msg || 'OCR识别失败' }, 502);
    const text = (result.words_result || []).map(x => x.words || '').filter(Boolean).join('\n'); return json({ success: true, text, extractedText: text, wordCount: text.length, confidence: 0.9 });
  } catch (error) { console.error('[functions/ocr]', error); return json({ success: false, error: 'OCR识别失败' }, 500); }
}
