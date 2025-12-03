import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Supabase 邮件确认回调路由
 * 
 * 当用户点击邮件中的确认链接时，Supabase 会重定向到此路由
 * 此路由会交换 code 为 session，然后重定向到应用
 * 
 * 路由：/auth/callback?code=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // 获取用户想要跳转的页面（如果有）
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    // 使用 code 交换 session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 确认成功，重定向到目标页面
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // 开发环境：重定向到 localhost
        return NextResponse.redirect(`http://localhost:3000${next}`)
      } else if (forwardedHost) {
        // 生产环境：使用 forwarded host
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        // 默认：使用 origin
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // 如果没有 code 或确认失败，重定向到错误页面
  return NextResponse.redirect(`${origin}/login?error=邮箱确认失败，请重试`)
}
