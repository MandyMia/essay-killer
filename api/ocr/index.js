/**
 * OCR 上传 API
 * POST /api/ocr - 识别图片文字
 *
 * 注意：EdgeOne Functions 环境中无法直接调用百度 OCR API
 * 需要通过 HTTP 请求调用外部 OCR 服务
 */
const db = require('../db');

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

  try {
    // 获取上传的图片数据
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // 解析 FormData（EdgeOne 需要使用 formData() 方法）
      const formData = await request.formData();
      const imageFile = formData.get('image') || formData.get('images[]');

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

  // 获取 Access Token
  const tokenResponse = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  );
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error('Failed to get access token');
  }

  // 调用百度 OCR
  const ocrResponse = await fetch(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `image=${encodeURIComponent(imageData)}`
    }
  );

  const ocrData = await ocrResponse.json();

  if (ocrData.words_result) {
    const text = ocrData.words_result.map(w => w.words).join('\n');
    const avgConfidence = ocrData.words_result.reduce((sum, w) => sum + (w probability?.average || 0.9), 0) / ocrData.words_result.length;

    return {
      text,
      confidence: avgConfidence
    };
  }

  return {
    text: '',
    confidence: 0
  };
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
