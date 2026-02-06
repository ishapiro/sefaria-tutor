export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = query.token as string

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Verification token is required'
    })
  }

  const db = hubDatabase()
  const currentTime = Math.floor(Date.now() / 1000)

  // Find user with this token and ensure it's not expired
  const user = await db.prepare('SELECT * FROM users WHERE verification_token = ? AND token_expires_at > ?')
    .bind(token, currentTime)
    .first<any>()

  if (!user) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired verification token'
    })
  }

  // Update user as verified and clear token
  await db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL, token_expires_at = NULL WHERE id = ?')
    .bind(user.id)
    .run()

  // Start session automatically after verification
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: true
    },
    loggedInAt: Date.now()
  })

  // Redirect to home or a success page
  return sendRedirect(event, '/?verified=true')
})
