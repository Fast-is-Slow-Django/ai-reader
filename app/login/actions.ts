'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

/**
 * Server Actions - 认证逻辑
 * 
 * 这些函数在服务端执行，可以直接在客户端组件的表单中调用
 */

// 定义返回类型
type AuthResult = {
  error?: string
  success?: boolean
}

/**
 * 登录 Server Action
 * 
 * @param formData - 表单数据，包含 email 和 password
 * @returns 错误信息或成功后重定向
 * 
 * 使用示例：
 * ```tsx
 * <form action={login}>
 *   <input name="email" type="email" required />
 *   <input name="password" type="password" required />
 *   <button type="submit">登录</button>
 * </form>
 * ```
 */
export async function login(formData: FormData): Promise<never> {
  // 1. 获取表单数据
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 2. 数据验证
  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('请输入邮箱和密码'))
  }

  // 3. 创建 Supabase 客户端
  const supabase = await createClient()

  // 4. 执行登录
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // 5. 处理错误
  if (error) {
    console.error('登录失败:', error.message)
    
    // 返回用户友好的错误信息并重定向
    let errorMessage = '登录失败，请稍后重试'
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = '邮箱或密码错误'
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = '请先确认您的邮箱'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    redirect('/login?error=' + encodeURIComponent(errorMessage))
  }

  // 6. 登录成功，重定向到书架或指定页面
  // 检查是否有 redirectTo 参数
  const headersList = await headers()
  const referer = headersList.get('referer')
  let redirectTo = '/dashboard'

  if (referer) {
    try {
      const url = new URL(referer)
      const redirectParam = url.searchParams.get('redirectTo')
      if (redirectParam && redirectParam.startsWith('/')) {
        redirectTo = redirectParam
      }
    } catch {
      // 忽略 URL 解析错误
    }
  }

  redirect(redirectTo)
}

/**
 * 注册 Server Action
 * 
 * @param formData - 表单数据，包含 email 和 password
 * @returns 错误信息或成功后重定向
 * 
 * 注意：
 * - 如果 Supabase 启用了邮件确认，用户需要先确认邮箱才能登录
 * - 如果关闭了邮件确认，注册后会自动登录
 * 
 * 使用示例：
 * ```tsx
 * <form action={signup}>
 *   <input name="email" type="email" required />
 *   <input name="password" type="password" required />
 *   <button type="submit">注册</button>
 * </form>
 * ```
 */
export async function signup(formData: FormData): Promise<never> {
  // 1. 获取表单数据
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 2. 数据验证
  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('请输入邮箱和密码'))
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    redirect('/login?error=' + encodeURIComponent('请输入有效的邮箱地址'))
  }

  // 验证密码强度（至少 6 位）
  if (password.length < 6) {
    redirect('/login?error=' + encodeURIComponent('密码至少需要 6 个字符'))
  }

  // 3. 创建 Supabase 客户端
  const supabase = await createClient()

  // 4. 执行注册
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 邮件重定向 URL（如果启用了邮件确认）
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  // 5. 处理错误
  if (error) {
    console.error('注册失败:', error.message)
    
    // 返回用户友好的错误信息
    let errorMessage = '注册失败，请稍后重试'
    if (error.message.includes('User already registered')) {
      errorMessage = '该邮箱已被注册'
    } else if (error.message.includes('Password should be')) {
      errorMessage = '密码不符合要求（至少 6 个字符）'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    redirect('/login?error=' + encodeURIComponent(errorMessage))
  }

  // 6. 注册成功处理
  // 检查是否需要邮件确认
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    // 用户已存在（可能之前注册过但未确认）
    redirect('/login?error=' + encodeURIComponent('该邮箱已被注册，请检查邮箱确认链接'))
  }

  // 检查用户的 email_confirmed_at 字段
  if (data.user && !data.user.email_confirmed_at) {
    // 需要邮件确认
    redirect('/login?error=' + encodeURIComponent('注册成功！请检查您的邮箱并点击确认链接'))
  }

  // 7. 如果关闭了邮件确认，或者已经自动确认，重定向到书架
  redirect('/dashboard')
}

/**
 * 登出 Server Action
 * 
 * 清除用户会话并重定向到登录页
 * 
 * 使用示例：
 * ```tsx
 * <form action={signout}>
 *   <button type="submit">退出登录</button>
 * </form>
 * ```
 * 
 * 或者：
 * ```tsx
 * <button onClick={() => signout()}>退出登录</button>
 * ```
 */
export async function signout(): Promise<never> {
  // 1. 创建 Supabase 客户端
  const supabase = await createClient()

  // 2. 执行登出
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('登出失败:', error.message)
    // 即使登出失败，也重定向到登录页
  }

  // 3. 重定向到登录页
  redirect('/login')
}
