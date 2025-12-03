import { createClient } from '@/utils/supabase/server'

/**
 * EPUB 文件代理 API
 * 
 * 用于解决 EPUB.js 跨域加载问题
 * 将 Supabase Storage 的 EPUB 文件通过 API 代理返回
 */
export async function GET(request: Request) {
  try {
    // 1. 获取查询参数中的文件 URL
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')
    
    if (!fileUrl) {
      return new Response('Missing url parameter', { status: 400 })
    }

    // 2. 验证用户登录（可选，根据需求决定）
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 3. 从 Supabase Storage 获取文件
    const response = await fetch(fileUrl, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch EPUB:', response.status, response.statusText)
      return new Response('Failed to fetch EPUB file', { status: response.status })
    }

    // 4. 获取文件内容
    const buffer = await response.arrayBuffer()

    // 5. 返回文件，设置正确的 CORS 和 Content-Type 头
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/epub+zip',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('EPUB proxy error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * 处理 OPTIONS 预检请求
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
