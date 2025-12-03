import type { User } from '@supabase/supabase-js'

/**
 * 认证相关的 TypeScript 类型定义
 */

/**
 * Server Action 返回结果类型
 */
export type ActionResult = {
  error?: string
  success?: boolean
  message?: string
}

/**
 * 登录表单数据类型
 */
export type LoginFormData = {
  email: string
  password: string
  redirectTo?: string
}

/**
 * 注册表单数据类型
 */
export type SignupFormData = {
  email: string
  password: string
  confirmPassword?: string
}

/**
 * 用户认证状态类型
 */
export type AuthState = {
  user: User | null
  loading: boolean
  error: string | null
}

/**
 * 密码重置请求类型
 */
export type PasswordResetRequest = {
  email: string
}

/**
 * 密码更新请求类型
 */
export type PasswordUpdateRequest = {
  newPassword: string
  confirmPassword: string
}

/**
 * 认证错误类型
 */
export enum AuthError {
  INVALID_CREDENTIALS = '邮箱或密码错误',
  EMAIL_NOT_CONFIRMED = '请先确认您的邮箱',
  USER_ALREADY_EXISTS = '该邮箱已被注册',
  WEAK_PASSWORD = '密码不符合要求',
  NETWORK_ERROR = '网络错误，请稍后重试',
  UNKNOWN_ERROR = '发生未知错误',
}

/**
 * 认证提供商类型
 */
export type AuthProvider = 'google' | 'github' | 'email'
