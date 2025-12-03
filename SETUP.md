# AI-Reader 项目初始化指南

## 📦 步骤 1: 创建 Next.js 15 项目

在 `ireader` 目录的**父目录**中运行以下命令（会创建新的项目文件夹）：

```bash
npx create-next-app@latest ai-reader --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

**或者**，如果你想在当前目录 `ireader` 中初始化（推荐）：

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

### 安装向导选项：
当提示时，选择以下选项：
- ✅ Would you like to use TypeScript? → **Yes**
- ✅ Would you like to use ESLint? → **Yes**
- ✅ Would you like to use Tailwind CSS? → **Yes**
- ✅ Would you like to use `src/` directory? → **No**
- ✅ Would you like to use App Router? → **Yes**
- ✅ Would you like to customize the default import alias? → **No** (默认 @/*)

---

## 📚 步骤 2: 安装核心依赖

项目创建完成后，安装以下依赖：

### Supabase 相关
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### UI 和工具库
```bash
npm install lucide-react clsx tailwind-merge
```

### EPUB 阅读器
```bash
npm install epubjs react-reader
npm install --save-dev @types/react-reader
```

### 一键安装所有依赖（推荐）
```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react clsx tailwind-merge epubjs react-reader && npm install --save-dev @types/react-reader
```

---

## 🔧 步骤 3: 创建环境变量文件

在项目根目录创建 `.env.local` 文件：

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> 从 Supabase Dashboard → Settings → API 中获取这两个值

---

## ✅ 验证安装

运行开发服务器：

```bash
npm run dev
```

访问 `http://localhost:3000` 查看是否正常运行。

---

## 📋 依赖说明

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| `@supabase/supabase-js` | latest | Supabase 客户端 SDK |
| `@supabase/ssr` | latest | Next.js SSR 支持 |
| `lucide-react` | latest | 图标库 |
| `react-reader` | latest | EPUB 阅读器组件 |
| `epubjs` | latest | EPUB 解析库（react-reader 依赖） |
| `clsx` | latest | 条件类名工具 |
| `tailwind-merge` | latest | Tailwind 类名合并 |

---

## 🗂️ 预期项目结构

```
ireader/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── public/
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── supabase-schema.sql
```

---

**下一步**: 完成上述步骤后，我们将开始创建 Supabase 客户端配置和认证系统。
