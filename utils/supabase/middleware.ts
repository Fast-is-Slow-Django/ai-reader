import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

/**
 * 创建 Supabase 中间件客户端 - 用于刷新用户 Session
 * 
 * 功能：
 * 1. 自动刷新过期的 access token
 * 2. 保持用户登录状态
 * 3. 在请求之间同步认证状态
 * 4. 返回用户信息和响应对象，供路由保护使用
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse
  user: User | null
}> {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 重要：调用 supabase.auth.getUser() 会自动刷新 session（如果需要）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    response: supabaseResponse,
    user,
  }
}
