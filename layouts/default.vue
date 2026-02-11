<script setup lang="ts">
const { loggedIn, user, logout } = useAuth()

const displayName = computed(() => {
  const u = (user as any)?.value ?? user
  return u?.name || u?.email || ''
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 select-none">
    <header class="bg-white shadow-sm border-b px-4 py-3 flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:items-center">
      <div class="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-3">
        <a
          href="https://cogitations.com"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center"
        >
          <img
            src="/cogitations-logo-only.svg"
            alt="Cogitations logo"
            class="h-9 w-auto sm:h-10 md:h-12"
            loading="lazy"
          />
        </a>
        <NuxtLink
          to="/"
          class="text-lg font-semibold tracking-tight text-center sm:text-left sm:text-2xl sm:whitespace-nowrap text-[#003c71] no-underline hover:underline"
        >
          Sefaria-Tutor by Cogitations
        </NuxtLink>
      </div>
      <div class="flex items-center gap-4 shrink-0">
        <template v-if="loggedIn">
          <span class="text-gray-600 text-sm truncate max-w-[140px] sm:max-w-none">Hello, {{ displayName }}</span>
          <button @click="logout" class="text-sm font-medium text-gray-700 hover:text-indigo-600">Logout</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="text-sm font-medium text-gray-700 hover:text-indigo-600">Login</NuxtLink>
        </template>
      </div>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>
