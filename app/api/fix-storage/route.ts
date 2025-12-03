import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Storage CORS 修复 API
 * 
 * 通过服务端 API 配置 Storage Bucket
 */
export async function POST() {
  try {
    // 1. 验证用户身份
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    console.log('🔧 开始修复 Storage CORS...')
    console.log('👤 用户:', user.email)

    // 2. 尝试更新 Bucket 配置
    const { data, error } = await supabase.storage.updateBucket('user_books', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/epub+zip', 'application/octet-stream'],
    })

    if (error) {
      console.error('❌ updateBucket 失败:', error)
      
      // 如果 updateBucket 失败，尝试其他方法
      return NextResponse.json({
        success: false,
        error: error.message,
        suggestion: 'updateBucket API 可能需要 Service Role Key，请使用 Dashboard 手动配置',
        dashboardUrl: 'https://supabase.com/dashboard/project/_/storage/buckets',
        corsConfig: {
          note: '在 Supabase Dashboard → Storage → Buckets → user_books → Configuration 中设置',
          public: true,
          allowedOrigins: ['*'],
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          allowedHeaders: ['range', 'content-type', 'authorization'],
        }
      })
    }

    console.log('✅ Storage Bucket 配置成功:', data)

    return NextResponse.json({
      success: true,
      message: 'CORS 配置成功',
      config: data,
      nextSteps: [
        '清除浏览器缓存（Ctrl+Shift+Delete）',
        '强制刷新阅读器页面（Ctrl+F5）',
        '重新打开书籍测试',
      ]
    })

  } catch (error: any) {
    console.error('❌ 意外错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '未知错误',
        suggestion: '请检查 Supabase 配置和权限'
      },
      { status: 500 }
    )
  }
}

/**
 * 获取当前 Bucket 信息
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    // 尝试获取 Bucket 信息
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    const userBooksBucket = buckets?.find(b => b.name === 'user_books')

    return NextResponse.json({
      success: true,
      bucket: userBooksBucket,
      allBuckets: buckets?.map(b => b.name),
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
