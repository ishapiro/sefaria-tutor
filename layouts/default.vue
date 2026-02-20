<script setup lang="ts">
import SupportSupportModal from '~/components/Support/SupportModal.vue'

const { loggedIn, user, logout, fetch: fetchSession } = useAuth()

const displayName = computed(() => {
  const u = (user as any)?.value ?? user
  return u?.name || u?.email || ''
})

const supportModalOpen = ref(false)
const showWhenToUseShoreshModal = ref(false)

const WELCOME_STORAGE_KEY = 'shoresh_welcome_last_shown'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

onMounted(async () => {
  await fetchSession()
  if (loggedIn.value) return
  try {
    const raw = localStorage.getItem(WELCOME_STORAGE_KEY)
    const lastShown = raw ? parseInt(raw, 10) : 0
    const now = Date.now()
    if (!Number.isFinite(lastShown) || now - lastShown >= ONE_DAY_MS) {
      showWhenToUseShoreshModal.value = true
    }
  } catch {
    showWhenToUseShoreshModal.value = true
  }
})

function closeWhenToUseShoreshModal () {
  showWhenToUseShoreshModal.value = false
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, String(Date.now()))
  } catch {}
}

function handleLogout () {
  try {
    localStorage.removeItem(WELCOME_STORAGE_KEY)
  } catch {}
  logout()
}
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
          :to="{ path: '/', query: { home: '1' } }"
          class="text-base sm:text-lg md:text-2xl font-semibold tracking-tight text-[#003c71] no-underline hover:underline truncate"
        >
          Shoresh
        </NuxtLink>
      </div>
      <div class="flex items-center gap-2 sm:gap-4 shrink-0">
        <NuxtLink
          :to="{ path: '/', query: { home: '1' } }"
          class="inline-flex items-center justify-center text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap px-1 sm:px-0"
          aria-label="Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 sm:hidden" aria-hidden="true">
            <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.293-.707l7-7z" clip-rule="evenodd" />
          </svg>
          <span class="hidden sm:inline">Home</span>
        </NuxtLink>
        <NuxtLink to="/about" class="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap px-1 sm:px-0">
          About
        </NuxtLink>
        <button
          type="button"
          class="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap px-1 sm:px-0"
          @click="supportModalOpen = true"
        >
          Support
        </button>
        <template v-if="loggedIn">
          <NuxtLink to="/settings" class="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap px-1 sm:px-0">Settings</NuxtLink>
          <span class="text-gray-600 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[140px] md:max-w-none">{{ displayName }}</span>
          <button @click="handleLogout" class="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap px-1 sm:px-0">Logout</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap px-1 sm:px-0">Login</NuxtLink>
        </template>
      </div>
    </header>
    <ClientOnly>
      <SupportSupportModal v-model:open="supportModalOpen" />
      <CommonWhenToUseShoreshModal
        :open="showWhenToUseShoreshModal"
        @close="closeWhenToUseShoreshModal"
      />
      <template #fallback />
    </ClientOnly>
    <main>
      <slot />
    </main>

    <!-- Desktop-only footer -->
    <footer class="hidden md:block border-t border-gray-200 bg-gray-50/80 text-gray-600 text-xs text-center">
      <div class="max-w-5xl mx-auto px-4 py-3 space-y-1">
        <div>© 2025–2026 Irv Shapiro / Cogitations, LLC</div>
        <div>
          Licensed under <strong>Business Source License 1.1 (BSL 1.1)</strong>;
          each version converts to CPAL&nbsp;1.0 three years after the last update by the original author.
        </div>
      </div>
    </footer>
  </div>
</template>
