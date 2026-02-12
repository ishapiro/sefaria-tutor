import { createError, H3Event, getHeader } from 'h3'

export type UserRole = 'guest' | 'general' | 'team' | 'admin'

/**
 * Validates the session and checks if the user has one of the required roles.
 * Also checks if the user is verified.
 */
export async function requireUserRole(event: H3Event, allowedRoles: UserRole[]) {
  const { user } = await getUserSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'You must be logged in to access this resource.'
    })
  }

  // Cast to our expected type since getUserSession returns any
  const userData = user as { id?: string; role: UserRole; isVerified: boolean }

  if (!userData.isVerified) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Your email address must be verified to access this resource.'
    })
  }

  if (!allowedRoles.includes(userData.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You do not have permission to access this resource.'
    })
  }

  return userData
}

/**
 * Legacy validator for simple token-based auth (if still needed)
 */
export function validateAuth(event: H3Event) {
  const config = useRuntimeConfig(event)
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const apiAuthToken = config.apiAuthToken || env?.API_AUTH_TOKEN || ''

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing or invalid Authorization header',
    })
  }
  const token = authHeader.slice(7)
  if (apiAuthToken && token !== apiAuthToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid token',
    })
  }
}
