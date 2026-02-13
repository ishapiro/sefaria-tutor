<script setup lang="ts">
const { loggedIn, user, logout } = useAuth()

const displayName = computed(() => {
  const u = (user as any)?.value ?? user
  return u?.name || u?.email || ''
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 select-none">
    <header class="bg-white shadow-sm border-b px-3 py-2 sm:px-4 sm:py-3 flex flex-row items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <a
          href="https://cogitations.com"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center shrink-0"
        >
          <img
            src="/cogitations-logo-only.svg"
            alt="Cogitations logo"
            class="h-7 w-auto sm:h-10 md:h-12"
            loading="lazy"
          />
        </a>
        <NuxtLink
          to="/"
          class="text-base sm:text-lg md:text-2xl font-semibold tracking-tight text-[#003c71] no-underline hover:underline truncate"
        >
          Shoresh
        </NuxtLink>
      </div>
      <div class="flex items-center gap-2 sm:gap-4 shrink-0">
        <template v-if="loggedIn">
          <span class="text-gray-600 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[140px] md:max-w-none">{{ displayName }}</span>
          <button @click="logout" class="text-xs sm:text-sm font-medium text-gray-700 hover:text-indigo-600 whitespace-nowrap px-1 sm:px-0">Logout</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="text-xs sm:text-sm font-medium text-gray-700 hover:text-indigo-600 whitespace-nowrap px-1 sm:px-0">Login</NuxtLink>
        </template>
      </div>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>
