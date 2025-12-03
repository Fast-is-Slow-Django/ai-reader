import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * 首页 - 根据用户状态自动重定向
 * 
 * - 已登录用户 → /dashboard（书架）
 * - 未登录用户 → /login（登录页）
 */
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // 已登录，跳转到书架
    redirect('/dashboard')
  } else {
    // 未登录，跳转到登录页
    redirect('/login')
  }
}
