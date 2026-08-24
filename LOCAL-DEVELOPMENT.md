# 本地开发联调说明

## 排查结论

- `edgeone.json` 是合法 JSON，路由配置本身没有语法错误。
- `api/` 下的 JavaScript 文件均已通过 `node --check`。
- EdgeOne 本地 CLI 在当前环境中会反复启动代理并出现 `431`、`Connection reset` 或 `Bad Gateway`，因此本地联调建议使用下面的 Express 方案。
- 项目 API 文件使用 CommonJS，而 `package.json` 声明了 `type: module`；`local-server.cjs` 已提供兼容加载器，不需要修改 API 文件格式。

## 启动方式

打开两个终端窗口。

### 终端一：API 服务

```bash
cd /Users/bytedance/Desktop/essay-killer
npm run dev:api
```

API 地址：<http://localhost:3003>

健康检查：<http://localhost:3003/health>

### 终端二：静态前端

```bash
cd /Users/bytedance/Desktop/essay-killer
npm run dev:static
```

前端地址：<http://localhost:8080>

正式首页：<http://localhost:8080/正式首页.html>

## OCR 测试

登录本地开发免登录入口后，打开学生端功能中心并上传作文图片：

<http://localhost:8080/dev-bypass.html>

点击“以测试家长身份进入”，然后进入作文批改/上传功能。

学生端上传页：

<http://localhost:8080/submit-essay-with-images.html>

OCR 请求会发送到：

```text
http://localhost:3003/api/ocr
```

## 常见问题

### 端口占用

```bash
lsof -ti:3003 | xargs kill
lsof -ti:8080 | xargs kill
```

### OCR 凭据

百度 OCR 凭据只应放在项目根目录 `.env`，不要写进前端文件，也不要提交到 Git。`.env` 已被 `.gitignore` 忽略。

### 仅打开静态页面

如果只启动 8080 而没有启动 3003，页面可以打开，但登录、OCR 和其他 API 交互会失败。
