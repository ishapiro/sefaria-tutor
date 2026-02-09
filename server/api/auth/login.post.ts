export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required'
    })
  }

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }
  
  // Find user by email
  const user = await db.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<any>()

  if (!user || !user.password_hash) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password'
    })
  }

  // Verify password
  const isValid = await verifyPassword(user.password_hash, password)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password'
    })
  }

  // Check if verified
  if (!user.is_verified) {
    throw createError({
      statusCode: 403,
      message: 'Please verify your email address before logging in.'
    })
  }

  // Start session
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: Boolean(user.is_verified)
    },
    loggedInAt: Date.now()
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  }
})
