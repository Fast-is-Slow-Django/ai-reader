import { createBrowserClient } from '@supabase/ssr'

/**
 * 创建 Supabase 客户端 - 用于客户端组件
 * 
 * 使用场景：
 * - 'use client' 组件
 * - 客户端交互逻辑
 * - 实时订阅
 * 
 * 示例：
 * ```tsx
 * 'use client'
 * import { createClient } from '@/utils/supabase/client'
 * 
 * export default function Component() {
 *   const supabase = createClient()
 *   // 使用 supabase 进行操作
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
