import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 测试 Supabase Storage 上传权限
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 创建一个测试文件
    const testContent = 'test cover upload'
    const testBuffer = Buffer.from(testContent)
    const testPath = `${user.id}/covers/test.txt`

    // 尝试上传
    const { data, error } = await supabase.storage
      .from('user_books')
      .upload(testPath, testBuffer, {
        contentType: 'text/plain',
        upsert: true
      })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        path: testPath
      })
    }

    // 尝试获取公开URL
    const { data: urlData } = supabase.storage
      .from('user_books')
      .getPublicUrl(testPath)

    return NextResponse.json({
      success: true,
      message: '上传成功！',
      uploadData: data,
      publicUrl: urlData.publicUrl,
      path: testPath,
      instruction: '请在 Supabase Storage 中检查是否看到这个文件'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
