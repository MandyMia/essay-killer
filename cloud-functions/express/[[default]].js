import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'essay-killer-edgeone' }));

const guestCounters = new Map();
function allowGuestRequest(req) {
  const key = req.headers['x-forwarded-for'] || req.ip || 'guest';
  const now = Date.now();
  const record = guestCounters.get(key) || { start: now, count: 0 };
  if (now - record.start >= 60_000) { record.start = now; record.count = 0; }
  record.count += 1;
  guestCounters.set(key, record);
  return record.count <= 10;
}

function toBase64(buffer) {
  return buffer.toString('base64');
}

app.post('/api/ocr', upload.any(), async (req, res) => {
  if (!allowGuestRequest(req)) return res.status(429).json({ success: false, error: 'OCR请求过于频繁，请稍后再试' });
  try {
    const file = req.files?.find(item => item.fieldname === 'file' || item.fieldname === 'image' || item.fieldname.startsWith('images['));
    const image = file ? toBase64(file.buffer) : req.body?.image;
    if (!image) return res.status(400).json({ success: false, error: '未找到文件' });
    const tokenResponse = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(process.env.BAIDU_API_KEY || '')}&client_secret=${encodeURIComponent(process.env.BAIDU_SECRET_KEY || '')}`, { method: 'POST' });
    const token = await tokenResponse.json();
    if (!token.access_token) return res.status(502).json({ success: false, error: 'OCR授权失败' });
    const params = new URLSearchParams({ image });
    const ocrResponse = await fetch(`https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${encodeURIComponent(token.access_token)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
    const result = await ocrResponse.json();
    if (!ocrResponse.ok || result.error_code) return res.status(502).json({ success: false, error: result.error_msg || 'OCR识别失败' });
    const text = (result.words_result || []).map(item => item.words || '').filter(Boolean).join('\n');
    return res.json({ success: true, text, extractedText: text, wordCount: text.length, confidence: 0.9 });
  } catch (error) {
    console.error('[edgeone cloud /api/ocr]', error);
    return res.status(500).json({ success: false, error: 'OCR识别失败' });
  }
});

app.post('/api/ai/format-essay', async (req, res) => {
  if (!allowGuestRequest(req)) return res.status(429).json({ success: false, error: 'AI请求过于频繁，请稍后再试' });
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ success: false, error: '缺少待整理的作文内容' });
    if (text.length > 12_000) return res.status(400).json({ success: false, error: '作文内容过长' });
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY || ''}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你是小学语文作文整理助手。只整理OCR文本，恢复合理分段、标点和句子连接，保留原意，不添加信息。输出JSON：{"content":"整理后的作文"}。' },
          { role: 'user', content: `题目：${req.body.title || '未提供'}\n年级：${req.body.grade || '未提供'}\nOCR原文：\n${text}` }
        ]
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { console.error('[edgeone cloud /api/ai/format-essay]', response.status, result.error); return res.status(502).json({ success: false, error: 'AI整理服务暂时不可用' }); }
    const raw = result.choices?.[0]?.message?.content || '';
    let content = raw.trim().replace(/^```json\s*|\s*```$/gi, '').trim();
    try { content = JSON.parse(content).content || content; } catch { /* keep plain response */ }
    return res.json({ success: true, content });
  } catch (error) {
    console.error('[edgeone cloud /api/ai/format-essay]', error);
    return res.status(502).json({ success: false, error: 'AI整理失败' });
  }
});

// Prevent missing-function routes from falling through to the static site as HTML.
app.all('/api/*splat', (req, res) => res.status(404).json({ success: false, error: 'API route not found' }));

export default app;
