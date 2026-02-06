export default defineNuxtRouteMiddleware((to, from) => {
  const { loggedIn, user } = useUserSession()

  // Define protected route patterns
  const adminRoutes = ['/admin']
  const teamRoutes = ['/team']
  // routes that require at least general authenticated access
  const protectedRoutes = ['/tutor', '/history']

  const isProtectedRoute = protectedRoutes.some(path => to.path.startsWith(path))
  const isAdminRoute = adminRoutes.some(path => to.path.startsWith(path))
  const isTeamRoute = teamRoutes.some(path => to.path.startsWith(path))

  if (!loggedIn.value && (isProtectedRoute || isAdminRoute || isTeamRoute)) {
    return navigateTo('/login')
  }

  if (loggedIn.value) {
    if (isAdminRoute && user.value?.role !== 'admin') {
      return navigateTo('/')
    }
    if (isTeamRoute && !['admin', 'team'].includes(user.value?.role || '')) {
      return navigateTo('/')
    }
  }
})
