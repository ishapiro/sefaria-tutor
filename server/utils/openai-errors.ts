import { createError } from 'h3'

export type OpenAIErrorInfo = {
  status: number
  message: string
  code?: string
  type?: string
  isOutOfCredit: boolean
  isRateLimited: boolean
  isAuthError: boolean
  isModelError: boolean
}

function normalizeStatus (err: unknown): number {
  const status = (err as { statusCode?: number; status?: number })?.statusCode ?? (err as { status?: number })?.status
  return typeof status === 'number' ? status : 500
}

function normalizeString (value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function parseOpenAIError (err: unknown): OpenAIErrorInfo {
  const status = normalizeStatus(err)
  const openaiError = (err as { data?: { error?: { message?: string; code?: string; type?: string } } })?.data?.error
  const message = normalizeString(openaiError?.message) || (err instanceof Error ? err.message : 'OpenAI request failed')
  const code = normalizeString(openaiError?.code) || undefined
  const type = normalizeString(openaiError?.type) || undefined
  const lower = message.toLowerCase()

  const isOutOfCredit =
    code === 'insufficient_quota' ||
    code === 'billing_hard_limit_reached' ||
    type === 'insufficient_quota' ||
    lower.includes('insufficient_quota') ||
    lower.includes('insufficient quota') ||
    lower.includes('out of credits') ||
    (lower.includes('billing') && lower.includes('limit'))

  const isRateLimited =
    (!isOutOfCredit && status === 429) ||
    code === 'rate_limit_exceeded' ||
    lower.includes('rate limit')

  const isAuthError =
    status === 401 ||
    code === 'invalid_api_key' ||
    lower.includes('invalid api key') ||
    lower.includes('incorrect api key')

  const isModelError =
    status === 404 ||
    (lower.includes('model') && (lower.includes('not found') || lower.includes('does not exist') || lower.includes('invalid')))

  return {
    status,
    message,
    code,
    type,
    isOutOfCredit,
    isRateLimited,
    isAuthError,
    isModelError,
  }
}

function friendlyOpenAIMessage (info: OpenAIErrorInfo): { message: string; code: string; statusCode: number; statusMessage: string } {
  if (info.isOutOfCredit) {
    return {
      message: 'OpenAI account is out of credits. Please add billing credits or increase the project spending limit.',
      code: 'OPENAI_OUT_OF_CREDIT',
      statusCode: 402,
      statusMessage: 'Payment Required',
    }
  }
  if (info.isRateLimited) {
    return {
      message: 'OpenAI rate limit reached. Please wait a moment and try again.',
      code: 'OPENAI_RATE_LIMIT',
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    }
  }
  if (info.isAuthError) {
    return {
      message: 'OpenAI API key is invalid or unauthorized. Please check server configuration.',
      code: 'OPENAI_AUTH_ERROR',
      statusCode: 502,
      statusMessage: 'Bad Gateway',
    }
  }
  if (info.isModelError) {
    return {
      message: 'The configured OpenAI model is unavailable. Please select a different model.',
      code: 'OPENAI_MODEL_UNAVAILABLE',
      statusCode: 502,
      statusMessage: 'Bad Gateway',
    }
  }
  if (info.status >= 500) {
    return {
      message: 'OpenAI service is temporarily unavailable. Please try again soon.',
      code: 'OPENAI_UPSTREAM_ERROR',
      statusCode: 502,
      statusMessage: 'Bad Gateway',
    }
  }
  return {
    message: info.message || 'OpenAI request failed.',
    code: 'OPENAI_REQUEST_FAILED',
    statusCode: info.status >= 400 && info.status < 500 ? info.status : 502,
    statusMessage: info.status === 400 ? 'Bad Request' : 'Bad Gateway',
  }
}

export function createOpenAIError (err: unknown, operationLabel: string) {
  const info = parseOpenAIError(err)
  const friendly = friendlyOpenAIMessage(info)
  const operationPrefix = operationLabel ? `${operationLabel} failed: ` : ''

  return createError({
    statusCode: friendly.statusCode,
    statusMessage: friendly.statusMessage,
    message: `${operationPrefix}${friendly.message}`,
    data: {
      code: friendly.code,
      openai: {
        status: info.status,
        code: info.code,
        type: info.type,
        message: info.message,
      },
    },
  })
}
