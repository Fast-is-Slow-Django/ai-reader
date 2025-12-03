# AI-Reader

📚 智能电子书阅读器 - 使用 AI 技术增强你的阅读体验

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)

## ✨ 核心功能

- 📤 **上传 EPUB 电子书** - 支持拖拽上传，最大 50MB
- 📱 **移动端阅读体验** - 响应式设计，完美适配手机和平板
- 🤖 **AI 智能解释** - 点击文字触发 AI 解释（即将实现）
- 📖 **个人书架管理** - 查看、管理你的电子书收藏
- 🔐 **用户认证系统** - 安全的登录和注册功能

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **后端/数据库**: Supabase (Postgres, Auth, Storage)
- **图标**: Lucide React
- **EPUB 阅读**: React-Reader, EPUB.js

## 📁 项目结构

```
ireader/
├── app/
│   ├── login/                  # 登录页面
│   │   ├── page.tsx           # 登录 UI
│   │   └── actions.ts         # 登录/注册 Server Actions
│   ├── dashboard/              # 书架页面
│   │   ├── page.tsx           # 书架 UI
│   │   ├── actions.ts         # 书籍管理 Actions
│   │   └── upload/
│   │       └── actions.ts     # 文件上传 Actions
│   ├── actions/
│   │   └── auth.ts            # 全局认证 Actions
│   └── auth/
│       └── callback/
│           └── route.ts       # 邮件确认回调
├── components/
│   ├── auth/
│   │   └── SignOutButton.tsx  # 登出按钮组件
│   └── dashboard/
│       ├── BookUploader.tsx                    # 基础上传组件
│       └── BookUploaderWithProgress.tsx        # 增强版上传组件
├── utils/
│   └── supabase/
│       ├── client.ts          # 客户端 Supabase
│       ├── server.ts          # 服务端 Supabase
│       ├── middleware.ts      # Session 刷新
│       └── types.ts           # 数据库类型定义
├── types/
│   └── auth.ts                # 认证类型定义
├── docs/                       # 📚 完整文档
│   ├── AUTH.md                # 认证系统文档
│   ├── DASHBOARD_ACTIONS.md   # Server Actions 文档
│   ├── BOOK_UPLOADER.md       # 上传组件文档
│   ├── DASHBOARD_PAGE.md      # 书架页面文档
│   ├── MIDDLEWARE.md          # 中间件文档
│   ├── ROUTES.md              # 路由规划
│   └── ...
├── middleware.ts               # 路由保护中间件
├── supabase-schema.sql         # 数据库 Schema
└── .env.local                  # 环境变量（需手动创建）
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/ai-reader.git
cd ai-reader
```

> 💡 将 `YOUR_USERNAME` 替换为你的 GitHub 用户名

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量模板：

```bash
cp env.example .env.local
```

然后编辑 `.env.local` 填写实际配置：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-api-key
```

**获取配置：**
- 📘 Supabase: [Dashboard](https://app.supabase.com/) → Your Project → Settings → API
- 🤖 Google AI: [AI Studio](https://aistudio.google.com/app/apikey)

### 4. 配置数据库

在 Supabase SQL Editor 中运行 `supabase-schema.sql`：

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `supabase-schema.sql` 内容
4. 点击 Run 执行

这将创建：
- ✅ `books` 表 - 存储书籍信息
- ✅ `notes` 表 - 存储笔记和高亮
- ✅ `user_books` Storage Bucket - 存储 EPUB 文件
- ✅ Row Level Security (RLS) 策略
- ✅ Storage Policies

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 📖 使用指南

### **注册/登录**

1. 访问 `/login`
2. 输入邮箱和密码
3. 点击"登录"或"创建新账号"

### **上传书籍**

1. 登录后访问 `/dashboard`
2. 点击"上传书籍"卡片
3. 选择 EPUB 文件（或拖拽到卡片）
4. 等待上传完成
5. 书籍自动出现在书架

### **管理书籍**

- 📚 查看所有书籍
- 🔍 点击书籍进入阅读器（即将实现）
- 🗑️ 删除书籍（即将实现）
- ✏️ 编辑书名（即将实现）

## 🔐 安全特性

- ✅ **用户认证** - Supabase Auth
- ✅ **Row Level Security (RLS)** - 数据隔离
- ✅ **文件隔离** - 每个用户独立的 Storage 目录
- ✅ **Session 自动刷新** - 保持登录状态
- ✅ **路由保护** - 中间件验证权限
- ✅ **类型安全** - TypeScript 完整支持

## 📚 完整文档

| 文档 | 描述 |
|------|------|
| [SETUP.md](./SETUP.md) | 项目初始化指南 |
| [AUTH.md](./docs/AUTH.md) | 认证系统完整文档 |
| [DASHBOARD_ACTIONS.md](./docs/DASHBOARD_ACTIONS.md) | Server Actions API 文档 |
| [BOOK_UPLOADER.md](./docs/BOOK_UPLOADER.md) | 上传组件使用指南 |
| [DASHBOARD_PAGE.md](./docs/DASHBOARD_PAGE.md) | 书架页面文档 |
| [MIDDLEWARE.md](./docs/MIDDLEWARE.md) | 路由保护原理 |
| [ROUTES.md](./docs/ROUTES.md) | 路由规划文档 |

## ✅ 已完成功能

### 🔐 认证系统
- [x] 用户登录
- [x] 用户注册
- [x] 邮箱确认（可选）
- [x] 退出登录
- [x] Session 自动刷新
- [x] 路由保护中间件
- [x] 密码重置（准备中）

### 📚 书架管理
- [x] 查看书籍列表
- [x] 上传 EPUB 文件
- [x] 拖拽上传（增强版）
- [x] 上传进度显示（增强版）
- [x] 文件类型验证
- [x] 文件大小限制
- [x] 自动提取书名
- [x] 响应式网格布局
- [x] 空状态提示

### 📖 阅读器功能
- [x] 加载 EPUB 文件
- [x] 渲染书籍内容
- [x] 翻页功能（按钮）
- [x] 进度显示
- [x] 章节标题显示
- [x] 返回书架
- [x] 权限验证
- [x] 字号调整（小/中/大）
- [x] 主题切换（日间/夜间）
- [x] 两点选词交互
- [x] 文本高亮显示
- [ ] 进度保存
- [ ] AI 解释集成

### 🗄️ 数据库
- [x] Books 表（书籍信息）
- [x] Notes 表（笔记和高亮）
- [x] Row Level Security
- [x] Storage Policies
- [x] 级联删除

### 🎨 UI/UX
- [x] 登录页面
- [x] 书架页面
- [x] 上传组件（2个版本）
- [x] 退出按钮组件
- [x] 响应式设计
- [x] 移动端优化
- [x] 加载状态
- [x] 错误提示

## 🚧 待实现功能

### 📖 阅读器增强
- [ ] 阅读进度保存和恢复
- [ ] 键盘快捷键（← / → 翻页）
- [ ] 字体大小调整
- [ ] 主题切换（日间/夜间）
- [ ] 目录导航
- [ ] 书签功能

### 🤖 AI 功能
- [ ] 文字选择
- [ ] AI 解释生成
- [ ] 笔记管理
- [ ] 高亮显示

### 🔧 增强功能
- [ ] 书籍封面提取
- [ ] 书籍元数据编辑
- [ ] 书籍删除确认
- [ ] 搜索功能
- [ ] 书籍分类
- [ ] 阅读统计

## 🐛 故障排除

### 上传失败

**问题**: 上传书籍时提示失败

**解决**:
1. 检查文件格式是否为 `.epub`
2. 检查文件大小是否超过 50MB
3. 检查 Supabase Storage Bucket 是否正确创建
4. 检查 Storage Policies 是否正确配置

### 页面无法访问

**问题**: 访问 `/dashboard` 被重定向到 `/login`

**解决**:
1. 确认已登录
2. 清除浏览器 Cookies
3. 重新登录

### 书籍不显示

**问题**: 上传成功但书架没有显示

**解决**:
1. 手动刷新页面 (Ctrl+R)
2. 检查 Supabase RLS 策略
3. 查看浏览器控制台错误信息

## 📦 部署

### Vercel 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ai-reader)

或手动部署：

1. Fork 本项目到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
4. 点击 Deploy

### 环境变量配置

在 Vercel 项目设置中添加环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-api-key
```

⚠️ **生产环境注意事项：**
- `NEXT_PUBLIC_SITE_URL` 必须是你的 Vercel 域名
- 在 Supabase → Authentication → URL Configuration 添加 Vercel 域名到重定向白名单

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Supabase](https://supabase.com/) - 后端服务
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Lucide](https://lucide.dev/) - 图标库
- [EPUB.js](https://github.com/futurepress/epub.js/) - EPUB 解析

---

## 🌟 项目特色

- 🎯 **AI 驱动**：集成 Google Gemini，提供智能词汇解释
- 📱 **移动优先**：完美适配手机和平板设备
- 🔒 **安全可靠**：Row Level Security 确保数据隔离
- 💾 **进度保存**：自动保存阅读位置和设置
- 📚 **词汇管理**：智能缓存和词汇列表功能
- 🎨 **现代 UI**：简洁优雅的用户界面

---

**开发状态**: ✅ v1.0 完成 - 核心功能可用，可投入生产

**当前版本**: v1.0  
**完成度**: 95% （认证✅ + 书架✅ + 阅读器✅ + AI✅ + 词汇管理✅）

**最后更新**: 2025-12-03
