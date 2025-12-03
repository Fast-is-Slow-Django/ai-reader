# 认证系统快速开始

5 分钟快速了解和使用 AI-Reader 认证系统。

## 🚀 快速开始

### 1. 确保环境变量已配置

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. 导入认证函数

```typescript
// 登录/注册（客户端表单）
import { login, signup } from '@/app/login/actions'

// 全局功能（任何地方）
import { signOut, getCurrentUser } from '@/app/actions/auth'
```

### 3. 使用

#### 登录表单
```tsx
<form action={login}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">登录</button>
</form>
```

#### 注册表单
```tsx
<form action={signup}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">注册</button>
</form>
```

#### 退出按钮
```tsx
<form action={signOut}>
  <button type="submit">退出</button>
</form>
```

#### 获取当前用户（Server Component）
```tsx
const user = await getCurrentUser()
if (!user) redirect('/login')
```

---

## 📁 文件清单

| 文件 | 用途 | 何时使用 |
|------|------|---------|
| `app/login/actions.ts` | 登录/注册 | 登录页、注册页 |
| `app/actions/auth.ts` | 全局认证功能 | 任何地方 |
| `app/auth/callback/route.ts` | 邮件确认回调 | 自动触发 |
| `types/auth.ts` | TypeScript 类型 | 类型提示 |

---

## 🎯 常用代码片段

### 检查登录状态

```tsx
// Server Component
import { getCurrentUser } from '@/app/actions/auth'

export default async function Page() {
  const user = await getCurrentUser()
  
  return (
    <div>
      {user ? (
        <p>欢迎，{user.email}</p>
      ) : (
        <p>请先登录</p>
      )}
    </div>
  )
}
```

### 受保护页面

```tsx
import { getCurrentUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  
  return <div>受保护的内容</div>
}
```

### 带加载状态的登录表单

```tsx
'use client'

import { login } from '@/app/login/actions'
import { useFormState, useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button disabled={pending}>
      {pending ? '登录中...' : '登录'}
    </button>
  )
}

export default function LoginForm() {
  const [state, formAction] = useFormState(login, undefined)

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state?.error && <p className="text-red-500">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}
```

### 客户端调用 Server Action

```tsx
'use client'

import { signOut } from '@/app/actions/auth'
import { useTransition } from 'react'

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
    >
      {isPending ? '退出中...' : '退出登录'}
    </button>
  )
}
```

---

## 🛡️ 路由保护

### 自动路由保护

以下路由**自动受保护**（在 `middleware.ts` 中配置）：

- ✅ `/dashboard` - 书架
- ✅ `/read/*` - 阅读器

未登录访问会自动重定向到 `/login`

### 添加新的受保护路由

编辑 `middleware.ts`：

```typescript
const protectedRoutes = [
  '/dashboard',
  '/read',
  '/settings',    // 新增
]
```

---

## 🔄 工作流程

### 登录流程

```
用户输入邮箱密码
    ↓
提交表单
    ↓
调用 login() Server Action
    ↓
Supabase 验证
    ↓
成功 → 重定向到 /dashboard
失败 → 显示错误信息
```

### 注册流程（关闭邮件确认）

```
用户输入邮箱密码
    ↓
提交表单
    ↓
调用 signup() Server Action
    ↓
Supabase 创建用户
    ↓
自动登录
    ↓
重定向到 /dashboard
```

### 注册流程（启用邮件确认）

```
用户输入邮箱密码
    ↓
提交表单
    ↓
调用 signup() Server Action
    ↓
Supabase 发送确认邮件
    ↓
显示提示信息
    ↓
用户点击邮件链接
    ↓
/auth/callback 处理
    ↓
重定向到 /dashboard
```

---

## ⚠️ 常见错误

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| "邮箱或密码错误" | 凭证不匹配 | 检查输入 |
| "该邮箱已被注册" | 邮箱重复 | 尝试登录 |
| "请先确认您的邮箱" | 邮件未确认 | 检查邮箱 |
| "密码至少需要 6 个字符" | 密码太短 | 增加密码长度 |

---

## 📚 完整文档

- [详细认证文档](./AUTH.md) - 完整 API 和示例
- [路由保护文档](./MIDDLEWARE.md) - 中间件工作原理
- [环境变量配置](./ENV.md) - 配置说明

---

## ✅ 检查清单

开始开发前确认：

- [ ] 环境变量已配置
- [ ] Supabase 数据库已创建（运行 schema.sql）
- [ ] 中间件已配置（已完成）
- [ ] 了解基本的 Server Actions 用法

---

**准备就绪！** 现在可以开始实现登录和注册页面 UI 了。
