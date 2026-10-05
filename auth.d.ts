// Session user shape set by setUserSession() in server/api/auth/* (nuxt-auth-utils).
declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string | null
    /** 'general' | 'team' | 'admin' */
    role: string
    isVerified: boolean
    teamId?: string | null
  }
}

export {}
