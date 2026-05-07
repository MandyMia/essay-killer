# 小学生作文批改平台 - EdgeOne Pages 版本

基于腾讯云 EdgeOne Pages 部署的作文批改平台。

## 功能特性

- 家长端：提交作文、查看批改结果、背诵模式
- 教师端：布置作业、批改作文、班级管理
- AI 辅助：OCR 文字识别、智能评分建议

## 技术栈

- **前端**：HTML5 + Bootstrap 5 + Vanilla JS
- **后端**：EdgeOne Functions (Node.js)
- **存储**：Cloudflare KV（可选）
- **OCR**：百度 OCR API

## 快速开始

### 安装依赖

```bash
npm install
```

### 登录 EdgeOne

首次使用需要登录腾讯云 EdgeOne 账号：

```bash
npx edgeone login
```

登录后浏览器会自动打开腾讯云登录页面。

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:8788（或 EdgeOne 分配的端口）
```

### 部署

```bash
# 部署到 EdgeOne Pages
npm run deploy
```

## 示例账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 教师 | teacher001 | 123456 |
| 家长 | parent001 | 123456 |

## 项目结构

```
essay-app-edgeone/
├── public/           # 前端静态文件
├── api/              # 云函数
│   ├── auth/         # 认证 API
│   ├── essays/       # 作文 API
│   ├── grading/      # 批改 API
│   ├── assignments/  # 作业 API
│   ├── classes/      # 班级 API
│   └── ocr/          # OCR API
├── wrangler.jsonc    # 部署配置
└── DEPLOY-EDGEONE.md # 部署指南
```

## 配置

1. 复制 `.env.example` 为 `.env`
2. 填写百度 OCR API 密钥
3. 配置 Cloudflare KV（可选）

## 文档

- [部署指南](DEPLOY-EDGEONE.md)
- [项目文档](../essay-app 批改作文/PROJECT.md)

## License

ISC
