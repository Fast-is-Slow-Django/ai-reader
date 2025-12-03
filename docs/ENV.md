# 环境变量配置指南

AI-Reader 项目所需的环境变量配置说明。

## 📋 必需的环境变量

### `.env.local` 文件配置

在项目根目录创建 `.env.local` 文件，添加以下配置：

```env
# Supabase 配置（必需）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 网站 URL（可选，默认 http://localhost:3000）
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🔑 获取 Supabase 凭证

### 步骤 1: 登录 Supabase

访问 [Supabase Dashboard](https://app.supabase.com/)

### 步骤 2: 选择项目

选择你的 AI-Reader 项目

### 步骤 3: 获取 API 凭证

1. 点击左侧菜单的 **Settings** ⚙️
2. 选择 **API**
3. 复制以下两个值：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🌍 环境变量说明

### `NEXT_PUBLIC_SUPABASE_URL`

**必需：** ✅

**说明：** Supabase 项目的 API URL

**格式：** `https://xxxxx.supabase.co`

**示例：**
```env
NEXT_PUBLIC_SUPABASE_URL=https://ybjswwpdyppahxhhylij.supabase.co
```

---

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**必需：** ✅

**说明：** Supabase 匿名/公开密钥（Anon Key）

**格式：** JWT Token（很长的字符串）

**示例：**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**安全性：**
- ✅ 可以在客户端使用（前缀 `NEXT_PUBLIC_`）
- ✅ 受 Supabase RLS 策略保护
- ❌ 不要使用 Service Role Key（那个是服务端专用的）

---

### `NEXT_PUBLIC_SITE_URL`

**必需：** ❌（可选）

**说明：** 应用的公开 URL，用于邮件确认重定向

**默认值：** `http://localhost:3000`

**开发环境：**
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**生产环境：**
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

**用途：**
- 邮件确认回调 URL
- 密码重置回调 URL
- OAuth 重定向 URL

---

## 🔧 不同环境的配置

### 本地开发环境

**文件：** `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

### 预览/测试环境

**文件：** `.env.preview`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
NEXT_PUBLIC_SITE_URL=https://preview.your-domain.com
```

---

### 生产环境

**文件：** `.env.production`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## 📦 部署平台配置

### Vercel

1. 进入项目设置
2. 选择 **Environment Variables**
3. 添加以下变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. 选择环境：Production / Preview / Development

---

### Netlify

1. 进入 **Site settings**
2. 选择 **Environment variables**
3. 添加相同的变量
4. 部署时会自动加载

---

### Docker

创建 `.env` 文件或在 `docker-compose.yml` 中配置：

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
```

---

## 🔒 安全注意事项

### ✅ 安全做法

1. **不要提交 `.env.local` 到 Git**
   - 已在 `.gitignore` 中排除
   - 只提交 `.env.example`

2. **使用不同的密钥**
   - 开发环境和生产环境使用不同的 Supabase 项目
   - 永远不要在代码中硬编码密钥

3. **定期轮换密钥**
   - 定期在 Supabase 后台重新生成密钥
   - 更新所有环境的配置

### ❌ 不安全做法

- ❌ 在代码中硬编码密钥
- ❌ 将 `.env.local` 提交到 Git
- ❌ 在客户端日志中打印密钥
- ❌ 在公开仓库中暴露密钥

---

## 🧪 验证配置

### 检查环境变量是否正确加载

创建测试页面 `app/test-env/page.tsx`：

```tsx
export default function TestEnvPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">环境变量检查</h1>
      
      <div className="space-y-2">
        <div>
          <strong>SUPABASE_URL:</strong>{' '}
          {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已配置' : '❌ 未配置'}
        </div>
        
        <div>
          <strong>SUPABASE_ANON_KEY:</strong>{' '}
          {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已配置' : '❌ 未配置'}
        </div>
        
        <div>
          <strong>SITE_URL:</strong>{' '}
          {process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000 (默认)'}
        </div>
      </div>
    </div>
  )
}
```

访问 `http://localhost:3000/test-env` 检查配置。

---

## 🐛 常见问题

### Q: 修改 `.env.local` 后没有生效

**原因：** Next.js 开发服务器缓存了旧的环境变量

**解决：**
```bash
# 停止开发服务器（Ctrl+C）
# 删除 .next 缓存
rm -rf .next
# 重新启动
npm run dev
```

---

### Q: "Invalid API Key" 错误

**原因：**
- Anon Key 配置错误
- 项目 URL 不匹配

**解决：**
1. 重新从 Supabase Dashboard 复制密钥
2. 确保 URL 和 Key 来自同一个项目
3. 重启开发服务器

---

### Q: 邮件确认链接重定向错误

**原因：** `NEXT_PUBLIC_SITE_URL` 未配置或配置错误

**解决：**
```env
# 开发环境
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 生产环境
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## 📋 检查清单

部署前确认：

- [ ] `.env.local` 文件存在且配置正确
- [ ] `.env.local` 已添加到 `.gitignore`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 正确
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确
- [ ] `NEXT_PUBLIC_SITE_URL` 匹配当前环境
- [ ] 生产环境使用独立的 Supabase 项目
- [ ] 在部署平台配置了环境变量
- [ ] 重启开发服务器后配置生效

---

## 📚 相关文档

- [Next.js 环境变量文档](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase 项目设置](https://supabase.com/docs/guides/getting-started)

---

**完成！** 环境变量配置已说明清楚。
