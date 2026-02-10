<script setup lang="ts">
const { loggedIn, user, logout } = useAuth()

const displayName = computed(() => {
  const u = (user as any)?.value ?? user
  return u?.name || u?.email || ''
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 select-none">
    <header class="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <img
          src="/cogitations%20logo%20only.svg"
          alt="Cogitations logo"
          class="h-10 w-auto md:h-12"
          loading="lazy"
        />
        <NuxtLink
          to="/"
          class="text-2xl font-semibold tracking-tight whitespace-nowrap text-[#003c71]"
        >
          Sefaria Tutor provide by Cogitations
        </NuxtLink>
      </div>
      <div class="flex items-center gap-4">
        <template v-if="loggedIn">
          <span class="text-gray-600 text-sm">Hello, {{ displayName }}</span>
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
