import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

/**
 * Next.js 中间件 - Supabase Session 刷新 + 路由保护
 * 
 * 功能：
 * 1. 自动刷新用户的认证 token
 * 2. 保持用户登录状态
 * 3. 路由保护：
 *    - /dashboard, /read 需要登录
 *    - 未登录访问受保护路由 → 重定向到 /login
 *    - 已登录访问 /login → 重定向到 /dashboard
 */
export async function middleware(request: NextRequest) {
  // 1. 刷新 Session 并获取用户信息
  const { response, user } = await updateSession(request)
  
  const { pathname } = request.nextUrl

  // 2. 定义受保护的路由（需要登录）
  const protectedRoutes = ['/dashboard', '/read']
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // 3. 定义认证路由（登录、注册页面）
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')

  // 4. 路由保护逻辑
  
  // 情况 1: 未登录用户访问受保护路由 → 重定向到登录页
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    // 保存原始访问路径，登录后可以重定向回来
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 情况 2: 已登录用户访问登录页 → 重定向到书架
  if (isAuthRoute && user) {
    // 检查是否有重定向目标
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    if (redirectTo && redirectTo.startsWith('/')) {
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
    // 默认重定向到书架
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 5. 其他情况：返回正常响应（已包含刷新后的 cookies）
  return response
}

/**
 * 配置中间件匹配规则
 * 
 * 包含：所有路由
 * 排除：
 * - _next/static (静态文件)
 * - _next/image (图片优化)
 * - favicon.ico
 * - 静态资源 (svg, png, jpg, jpeg, gif, webp, ico, css, js)
 * - api 路由（API 路由有自己的认证逻辑）
 */
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico
     * - public 文件夹中的静态资源
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
