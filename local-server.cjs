const express = require('express');
const path = require('path');
const fs = require('fs');
const Module = require('module');
const { pathToFileURL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || process.env.API_PORT || 8080);

loadDotEnv(path.join(ROOT, '.env'));
const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'essay-killer-local-api' }));
app.use(express.static(path.join(ROOT, 'public')));

const handlers = {
  authLogin: loadFunction('api/auth/login.js'),
  authRegister: loadFunction('api/auth/register.js'),
  authMe: loadFunction('api/auth/me.js'),
  authRefresh: loadFunction('api/auth/refresh.js'),
  authLogout: loadFunction('api/auth/logout.js'),
  dashboardStats: loadFunction('api/dashboard/stats.js'),
  essays: loadFunction('api/essays/index.js'),
  essayById: loadFunction('api/essays/[id].js'),
  assignments: loadFunction('api/assignments/index.js'),
  classes: loadFunction('api/classes/index.js'),
  classById: loadFunction('api/classes/[id].js'),
  grading: loadFunction('api/grading/index.js'),
  ocr: loadFunction('api/ocr/index.js'),
  formatEssay: loadFunction('api/ai/format-essay.js'),
  assignmentSubmissions: loadFunction('api/assignments/submissions.js'),
  submissions: loadFunction('api/submissions/index.js'),
  submissionById: loadFunction('api/submissions/[id].js')
};

app.all('/api/auth/:role/login', forward(handlers.authLogin));
app.all('/api/auth/login', forward(handlers.authLogin));
app.all('/api/auth/:role/register', forward(handlers.authRegister));
app.all('/api/auth/register', forward(handlers.authRegister));
app.all('/api/auth/me', forward(handlers.authMe));
app.all('/api/auth/refresh', forward(handlers.authRefresh));
app.all('/api/auth/logout', forward(handlers.authLogout));
app.all('/api/dashboard/stats', forward(handlers.dashboardStats));
app.all('/api/essays/:id', forward(handlers.essayById));
app.all('/api/essays', forward(handlers.essays));
app.all('/api/assignments/:id/submissions', forward(handlers.assignmentSubmissions));
app.all('/api/assignments/*splat', forward(handlers.assignments));
app.all('/api/assignments', forward(handlers.assignments));
app.all('/api/ai/format-essay', forward(handlers.formatEssay));
// 具体路径必须注册在动态 :id 之前，避免 join/stats 被当作资源 ID。
app.all('/api/classes/join', forward(handlers.classes));
app.all('/api/classes/:id', forward(handlers.classById));
app.all('/api/classes', forward(handlers.classes));
app.all('/api/submissions/stats', forward(handlers.submissions));
app.all('/api/submissions/:id', forward(handlers.submissionById));
app.all('/api/submissions', forward(handlers.submissions));
app.all('/api/grading/*splat', forward(handlers.grading));
app.all('/api/grading', forward(handlers.grading));
app.all('/api/ocr/upload', forward(handlers.ocr));
app.all('/api/ocr', forward(handlers.ocr));

app.use((err, _req, res, _next) => {
  console.error('[local-api]', err);
  res.status(500).json({ success: false, error: '本地 API 服务器错误' });
});

app.listen(PORT, () => {
  console.log(`Local API server: http://localhost:${PORT}`);
  console.log('Health check: http://localhost:' + PORT + '/health');
});

function forward(handler) {
  return async (req, res) => {
    try {
      const request = await toWebRequest(req);
      const response = await handler(request);
      const body = await response.arrayBuffer();
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.status(response.status).send(Buffer.from(body));
    } catch (error) {
      console.error('[local-api route]', req.method, req.originalUrl, error);
      res.status(500).json({ success: false, error: error.message || '请求失败' });
    }
  };
}

async function toWebRequest(req) {
  const protocol = req.protocol || 'http';
  const url = `${protocol}://${req.get('host')}${req.originalUrl}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(item => headers.append(key, item));
    else if (value !== undefined) headers.set(key, value);
  }

  const contentType = String(req.headers['content-type'] || '');
  let body;
  if (contentType.includes('multipart/form-data')) {
    body = await readRawBody(req);
  } else if (req.body && Object.keys(req.body).length) {
    body = contentType.includes('application/x-www-form-urlencoded')
      ? new URLSearchParams(req.body).toString()
      : JSON.stringify(req.body);
  }
  return new Request(url, { method: req.method, headers, body, duplex: body ? 'half' : undefined });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function loadFunction(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return loadCommonJS(absolutePath);
}

function loadCommonJS(absolutePath, cache = new Map()) {
  if (cache.has(absolutePath)) return cache.get(absolutePath).exports;
  const source = fs.readFileSync(absolutePath, 'utf8');
  const loaded = new Module(absolutePath, module);
  loaded.filename = absolutePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  cache.set(absolutePath, loaded);
  loaded.require = request => {
    if (request.startsWith('.')) {
      let dependency = path.resolve(path.dirname(absolutePath), request.endsWith('.js') ? request : `${request}.js`);
      // EdgeOne 的函数打包器会把相对 db 引用解析到 api/db.js；本地 loader 显式保持相同映射。
      if (!fs.existsSync(dependency) && path.basename(dependency) === 'db.js') {
        dependency = path.join(ROOT, 'api', 'db.js');
      }
      return loadCommonJS(dependency, cache);
    }
    return require(request);
  };
  loaded._compile(source, absolutePath);
  return loaded.exports;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
