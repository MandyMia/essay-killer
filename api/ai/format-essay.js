const MAX_TEXT_LENGTH = 12000;
const REQUEST_TIMEOUT_MS = 30000;
const guestRequests = new Map();
function allowAiRequest(request) {
  const key = request.headers.get('x-forwarded-for') || 'guest';
  const now = Date.now(); const item = guestRequests.get(key) || { start: now, count: 0 };
  if (now - item.start >= 60000) { item.start = now; item.count = 0; }
  item.count += 1; guestRequests.set(key, item); return item.count <= 10;
}


module.exports = async function (request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }
  if (!allowAiRequest(request)) return json({ success: false, error: 'AI请求过于频繁，请稍后再试' }, 429);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return json({ success: false, error: 'AI整理服务未配置' }, 503);

  try {
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const grade = typeof body.grade === 'string' ? body.grade.trim() : '';
    if (!text) return json({ success: false, error: '缺少待整理的作文内容' }, 400);
    if (text.length > MAX_TEXT_LENGTH) return json({ success: false, error: `作文内容不能超过${MAX_TEXT_LENGTH}字` }, 400);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat', temperature: 0.1, response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: '你是小学语文作文整理助手。只整理OCR识别出的作文：恢复合理分段、标点和句子连接，保留原文事实、语气和内容，不添加原文没有的信息，不评分、不点评。输出必须是JSON对象，格式为 {"content":"整理后的作文"}。' },
            { role: 'user', content: `题目：${title || '未提供'}\n年级：${grade || '未提供'}\nOCR原文：\n${text}` }
          ]
        })
      });
    } finally { clearTimeout(timer); }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('DeepSeek request failed:', response.status, data.error?.message || 'unknown error');
      return json({ success: false, error: 'AI整理服务暂时不可用，请保留OCR原文或稍后重试' }, 502);
    }
    const formatted = parseContent(data.choices?.[0]?.message?.content);
    if (!formatted) return json({ success: false, error: 'AI未返回有效的整理结果' }, 502);
    return json({ success: true, content: formatted });
  } catch (error) {
    console.error('Essay formatting error:', error.name === 'AbortError' ? 'timeout' : error.message);
    return json({ success: false, error: error.name === 'AbortError' ? 'AI整理超时，请稍后重试' : 'AI整理失败，请保留OCR原文' }, 502);
  }
};

function parseContent(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return typeof parsed.content === 'string' ? parsed.content.trim() : '';
  } catch { return cleaned; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
}
function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
}
