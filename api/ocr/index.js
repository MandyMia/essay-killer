/**
 * OCR 上传 API
 * POST /api/ocr - 识别图片文字
 *
 * 注意：EdgeOne Functions 环境中无法直接调用百度 OCR API
 * 需要通过 HTTP 请求调用外部 OCR 服务
 */
const db = require('../db');
const guestRequests = new Map();

function allowGuestRequest(request) {
  const key = request.headers.get('x-forwarded-for') || 'local-guest';
  const now = Date.now(); const existing = guestRequests.get(key) || { start: now, count: 0 };
  if (now - existing.start >= 60000) { existing.start = now; existing.count = 0; }
  existing.count += 1; guestRequests.set(key, existing);
  return existing.count <= 10;
}


module.exports = async function (request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders()
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  if (!allowGuestRequest(request)) return jsonResponse({ success: false, error: 'OCR请求过于频繁，请稍后再试' }, 429);

  try {
    // 获取上传的图片数据
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // 解析 FormData（EdgeOne 需要使用 formData() 方法）
      const formData = await request.formData();
      const imageFile = formData.get('image') || formData.get('images[]') || findIndexedImage(formData);

      if (!imageFile) {
        return jsonResponse({ success: false, error: '请上传图片' }, 400);
      }

      // 将图片转为 base64
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);

      // 调用 OCR 服务
      const ocrResult = await callOCRService(base64);

      return jsonResponse({
        success: true,
        // 保留 text 与 extractedText 两种字段，兼容不同学生端页面。
        text: ocrResult.text,
        extractedText: ocrResult.text,
        confidence: ocrResult.confidence,
        wordCount: countChineseCharacters(ocrResult.text)
      });
    }

    // JSON 格式发送 base64 图片
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return jsonResponse({ success: false, error: '请提供图片数据' }, 400);
    }

    const ocrResult = await callOCRService(image);

    return jsonResponse({
      success: true,
      extractedText: ocrResult.text,
      confidence: ocrResult.confidence,
      wordCount: countChineseCharacters(ocrResult.text)
    });
  } catch (error) {
    console.error('OCR error:', error);
    return jsonResponse({ success: false, error: 'OCR识别失败' }, 500);
  }
};

// 调用外部 OCR 服务
async function callOCRService(imageData) {
  // 获取环境变量
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;

  if (!apiKey || !secretKey) {
    // 如果没有配置 API，使用模拟数据
    return {
      text: '这是一段示例文字。学生在作文中描写了春天的景色，表达了对大自然的热爱。',
      confidence: 0.85
    };
  }

  // 获取 Access Token。密钥只在服务端环境变量中读取，不发送给前端。
  const tokenResponse = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(secretKey)}`
  );
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!tokenResponse.ok || !accessToken) {
    throw new Error(`Baidu token request failed: ${tokenData.error_description || tokenData.error || tokenResponse.status}`);
  }

  // 调用百度手写文字 OCR。兼容 data URL 格式的 Base64 图片。
  const pureBase64 = String(imageData).replace(/^data:[^;]+;base64,/, '');
  const ocrResponse = await fetch(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `image=${encodeURIComponent(pureBase64)}`
    }
  );

  const ocrData = await ocrResponse.json();

  if (!ocrResponse.ok || ocrData.error_code) {
    throw new Error(`Baidu OCR request failed: ${ocrData.error_msg || ocrData.error_code || ocrResponse.status}`);
  }

  if (Array.isArray(ocrData.words_result)) {
    const text = ocrData.words_result.map(w => w.words || '').filter(Boolean).join('\n');
    const confidenceValues = ocrData.words_result
      .map(w => Number(w.probability?.average))
      .filter(Number.isFinite);
    const confidence = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : 0.9;

    return { text, confidence };
  }

  return { text: '', confidence: 0 };
}

function findIndexedImage(formData) {
  for (const [key, value] of formData.entries()) {
    if (/^images\[\d+\]$/.test(key)) return value;
  }
  return null;
}

// 辅助函数
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function countChineseCharacters(text) {
  return (text.match(/[一-龥]/g) || []).length;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders()
    }
  });
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}
