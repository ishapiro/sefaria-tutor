type ErrorPayload = {
  message?: string
  code?: string
  openai?: {
    status?: number
    code?: string
    type?: string
    message?: string
  }
}

type ApiErrorLike = {
  statusCode?: number
  status?: number
  data?: ErrorPayload
  message?: string
}

function inferStatusFromMessage (message: string): number | null {
  if (!message) return null
  const match = message.match(/\b(\d{3})\b/)
  if (!match) return null
  const code = parseInt(match[1], 10)
  if (code >= 100 && code <= 599) return code
  return null
}

function includesOutOfCreditText (text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('out of credits') ||
    lower.includes('insufficient quota') ||
    lower.includes('insufficient_quota') ||
    (lower.includes('billing') && lower.includes('limit'))
  )
}

export function getApiErrorMessage (err: unknown, fallback = 'Request failed. Please try again.'): string {
  const e = err as ApiErrorLike
  const rawMessage = e?.data?.message ?? e?.message ?? ''
  const inferredStatus = typeof rawMessage === 'string' ? inferStatusFromMessage(rawMessage) : null
  const status = e?.statusCode ?? e?.status ?? inferredStatus ?? undefined
  const payload = e?.data
  const code = payload?.code

  if (code === 'OPENAI_OUT_OF_CREDIT' || status === 402 || includesOutOfCreditText(rawMessage)) {
    return 'The AI service is out of credits right now. Please try again later or contact support.'
  }

  if (code === 'OPENAI_RATE_LIMIT' || status === 429) {
    return 'The AI service is busy right now. Please wait a few seconds and try again.'
  }

  if (code === 'OPENAI_AUTH_ERROR') {
    return 'The AI service is not configured correctly. Please contact support.'
  }

  if (code === 'OPENAI_MODEL_UNAVAILABLE') {
    return 'The selected AI model is currently unavailable. Please try again in a moment.'
  }

  if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
    return rawMessage.trim()
  }

  return fallback
}
