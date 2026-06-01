export const useAuth = () => {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  const isAdmin = computed(() => user.value?.role === 'admin')
  const isTeamLeader = computed(() => user.value?.role === 'team' || user.value?.role === 'admin')
  const isTeacher = computed(() => user.value?.role === 'team' || user.value?.role === 'admin')
  const isGeneral = computed(() => user.value?.role === 'general' || user.value?.role === 'team' || user.value?.role === 'admin')
  const userTeamId = computed(() => (user.value as any)?.teamId ?? null)
  const isVerified = computed(() => user.value?.isVerified === true)

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google'
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    navigateTo('/')
  }

  return {
    loggedIn,
    user,
    session,
    isAdmin,
    isTeamLeader,
    isTeacher,
    isGeneral,
    isVerified,
    userTeamId,
    fetch,
    clear,
    loginWithGoogle,
    logout
  }
}
