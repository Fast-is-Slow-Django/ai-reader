'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * 全局认证 Actions
 * 
 * 可以在应用的任何地方导入使用
 */

/**
 * 获取当前登录用户
 * 
 * @returns 用户对象或 null
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('获取用户失败:', error.message)
    return null
  }
  
  return user
}

/**
 * 登出 Server Action（全局版本）
 * 
 * 可以在导航栏、设置页面等任何地方调用
 * 
 * 使用示例：
 * ```tsx
 * import { signOut } from '@/app/actions/auth'
 * 
 * <form action={signOut}>
 *   <button type="submit">退出登录</button>
 * </form>
 * ```
 */
export async function signOut(): Promise<never> {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('登出失败:', error.message)
  }

  // 重新验证所有路径的缓存
  revalidatePath('/', 'layout')
  
  redirect('/login')
}

/**
 * 检查用户是否已登录
 * 
 * @returns true 如果已登录，false 如果未登录
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * 获取用户的邮箱
 * 
 * @returns 用户邮箱或 null
 */
export async function getUserEmail(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.email ?? null
}

/**
 * 更新用户密码
 * 
 * @param newPassword - 新密码
 * @returns 成功或错误信息
 */
export async function updatePassword(newPassword: string): Promise<{
  success?: boolean
  error?: string
}> {
  if (!newPassword || newPassword.length < 6) {
    return { error: '密码至少需要 6 个字符' }
  }

  const supabase = await createClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    console.error('更新密码失败:', error.message)
    return { error: error.message || '更新密码失败' }
  }

  return { success: true }
}

/**
 * 发送密码重置邮件
 * 
 * @param email - 用户邮箱
 * @returns 成功或错误信息
 */
export async function sendPasswordResetEmail(email: string): Promise<{
  success?: boolean
  error?: string
}> {
  if (!email) {
    return { error: '请输入邮箱地址' }
  }

  const supabase = await createClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  if (error) {
    console.error('发送密码重置邮件失败:', error.message)
    return { error: error.message || '发送失败，请稍后重试' }
  }

  return { success: true }
}
