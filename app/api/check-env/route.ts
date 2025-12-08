import { NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * 环境检查端点 - 用于诊断配置问题
 */
export async function GET() {
  const checks = {
    // 检查环境变量
    hasGoogleApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    googleApiKeyLength: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    
    // 检查前几个字符（安全地显示）
    googleApiKeyPreview: process.env.GOOGLE_GENERATIVE_AI_API_KEY 
      ? `${process.env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 7)}...` 
      : 'NOT SET',
  }

  // 测试 Gemini API
  let geminiTest = 'NOT TESTED'
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent('Say "API OK" in 3 words or less')
      geminiTest = result.response.text() || 'RESPONSE EMPTY'
    } catch (error: any) {
      geminiTest = `ERROR: ${error?.message || 'Unknown error'}`
    }
  }

  return NextResponse.json({
    status: 'Environment Check',
    timestamp: new Date().toISOString(),
    checks,
    geminiTest,
    recommendation: !checks.hasGoogleApiKey 
      ? '⚠️ GOOGLE_GENERATIVE_AI_API_KEY is not configured in Vercel environment variables'
      : geminiTest.includes('ERROR')
      ? '⚠️ API key exists but may be invalid or expired'
      : '✅ Configuration looks good'
  })
}
