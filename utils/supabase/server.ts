import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 创建 Supabase 服务端客户端 - 用于服务端组件和 Server Actions
 * 
 * 使用场景：
 * - Server Components（默认）
 * - Server Actions
 * - Route Handlers
 * 
 * 示例 1 - Server Component：
 * ```tsx
 * import { createClient } from '@/utils/supabase/server'
 * 
 * export default async function ServerComponent() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('books').select()
 *   return <div>{data}</div>
 * }
 * ```
 * 
 * 示例 2 - Server Action：
 * ```tsx
 * 'use server'
 * import { createClient } from '@/utils/supabase/server'
 * 
 * export async function uploadBook(formData: FormData) {
 *   const supabase = await createClient()
 *   // 执行上传操作
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 在 Server Components 中调用时，setAll 可能会失败
            // 这是正常的，因为 Server Components 是只读的
            // 可以忽略此错误
          }
        },
      },
    }
  )
}
