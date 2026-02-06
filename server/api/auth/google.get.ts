export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: googleUser }) {
    const db = hubDatabase()
    
    // Check if user exists in D1
    let user = await db.prepare('SELECT * FROM users WHERE id = ? OR email = ?')
      .bind(googleUser.sub, googleUser.email)
      .first<any>()

    if (!user) {
      // Create new user record
      await db.prepare('INSERT INTO users (id, email, name, role, is_verified) VALUES (?, ?, ?, ?, ?)')
        .bind(googleUser.sub, googleUser.email, googleUser.name, 'general', 1)
        .run()
      
      user = {
        id: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        role: 'general',
        is_verified: 1
      }
    } else if (user.id !== googleUser.sub) {
      // If user existed with email but first time using Google, link them
      await db.prepare('UPDATE users SET id = ?, is_verified = 1 WHERE email = ?')
        .bind(googleUser.sub, googleUser.email)
        .run()
      user.id = googleUser.sub
      user.is_verified = 1
    }

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

    return sendRedirect(event, '/')
  },
  // Optional, will redirect to / automatically
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=google_failed')
  },
})
