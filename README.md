# ✈ 沙中航班监控 — Vercel 部署指南

## 项目结构

```
flight-vercel/
├── api/
│   └── flights.js       ← Vercel 代理函数（隐藏 API Key，解决 CORS）
├── src/
│   ├── main.jsx
│   └── App.jsx          ← React 看板
├── index.html
├── vite.config.js
├── package.json
├── vercel.json
└── .env.example
```

---

## 部署步骤（10分钟完成）

### 第一步：上传到 GitHub

```bash
git init
git add .
git commit -m "init"
# 在 github.com 新建仓库，然后：
git remote add origin https://github.com/你的用户名/flight-tracker.git
git push -u origin main
```

### 第二步：连接 Vercel

1. 打开 https://vercel.com，用 GitHub 账号登录
2. 点击 **Add New Project** → 选择刚推的仓库
3. Framework Preset 选 **Vite**，其余默认
4. 点击 **Deploy**（先不填环境变量，等第三步）

### 第三步：设置 API Key（重要）

部署完成后：
1. 进入项目 → **Settings** → **Environment Variables**
2. 添加：
   - Name: `AVIATIONSTACK_KEY`
   - Value: `你的AviationStack Key`
   - Environment: ✅ Production ✅ Preview ✅ Development
3. 点击 **Save**
4. 回到 **Deployments** → 点击最新部署右侧 `···` → **Redeploy**

完成！访问 Vercel 分配的域名即可看到看板。

---

## 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env.local
# 编辑 .env.local 填入你的 Key

# 启动（需要先安装 Vercel CLI 以支持 /api 代理）
npm install -g vercel
vercel dev

# 或者只启动前端（/api 会报错，但页面可以看）
npm run dev
```

---

## 说明

| 文件 | 作用 |
|------|------|
| `api/flights.js` | 服务端代理，API Key 不暴露给浏览器，自动处理 CORS |
| `src/App.jsx` | 前端看板，请求 `/api/flights` 而非直接请求 AviationStack |
| `vercel.json` | SPA 路由支持，确保刷新页面不 404 |
