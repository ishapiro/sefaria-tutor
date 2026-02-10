export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: googleUser }) {
    try {
      // Access database via Cloudflare context (same pattern as cache files)
      // @ts-ignore
      const db = event.context.cloudflare?.env?.DB
      
      if (!db) {
        console.error('Database not available - D1 database not found in Cloudflare context')
        throw new Error('Database not available. Make sure D1 database is configured and migrations are run.')
      }
      
      // Check if user exists in D1 (exclude deleted users for login, but allow checking for restoration)
      let existingUser = await db.prepare('SELECT * FROM users WHERE (id = ? OR email = ?) AND deleted_at IS NULL')
        .bind(googleUser.sub, googleUser.email)
        .first<any>()

      if (!existingUser) {
        // Create new user record
        await db.prepare('INSERT INTO users (id, email, name, role, is_verified) VALUES (?, ?, ?, ?, ?)')
          .bind(googleUser.sub, googleUser.email, googleUser.name, 'general', 1)
          .run()
      } else if (existingUser.id !== googleUser.sub) {
        // If user existed with email but first time using Google, link them
        await db.prepare('UPDATE users SET id = ?, is_verified = 1 WHERE email = ?')
          .bind(googleUser.sub, googleUser.email)
          .run()
      } else {
        // User exists and ID matches - update name if it changed
        if (existingUser.name !== googleUser.name) {
          await db.prepare('UPDATE users SET name = ? WHERE id = ?')
            .bind(googleUser.name, googleUser.sub)
            .run()
        }
      }

      // Always fetch the latest user data from database to ensure we have the correct role (exclude deleted)
      const user = await db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
        .bind(googleUser.sub)
        .first<any>()

      if (!user) {
        throw new Error('Failed to retrieve user after login')
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
    } catch (error: any) {
      console.error('Error in Google OAuth onSuccess handler:', error)
      // Re-throw to trigger onError handler
      throw error
    }
  },
  // Optional, will redirect to / automatically
  onError(event, error) {
    const errorMessage = error.message || (error as any).cause?.message || ''

    const isConfigError =
      errorMessage.includes('Missing NUXT_OAUTH_GOOGLE_CLIENT_ID') ||
      errorMessage.includes('Missing NUXT_OAUTH_GOOGLE_CLIENT_SECRET')

    const isDbError =
      errorMessage.includes('Database not available') ||
      errorMessage.includes('D1 database') ||
      errorMessage.includes('no such table') ||
      errorMessage.includes('SQLITE_ERROR')

    // Common when the Google Console "Authorized redirect URIs" don't match the deployed callback URL
    const isRedirectUriError =
      errorMessage.toLowerCase().includes('redirect_uri') ||
      errorMessage.toLowerCase().includes('redirect uri')

    const reason =
      isConfigError ? 'config' :
      isDbError ? 'db' :
      isRedirectUriError ? 'redirect_uri' :
      'unknown'

    // In production we still want a breadcrumb in logs.
    // Config errors are expected in some environments, so keep those quieter.
    if (!isConfigError) {
      console.error('Google OAuth error:', { reason, errorMessage })
    }

    const qs = new URLSearchParams({ error: 'google_failed', reason })
    return sendRedirect(event, `/login?${qs.toString()}`)
  },
})
