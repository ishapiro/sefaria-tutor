<script setup lang="ts">
const { loggedIn, user, logout } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-gray-50 select-none">
    <header class="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
      <NuxtLink to="/" class="text-xl font-bold text-indigo-600">Sefaria Tutor</NuxtLink>
      <div class="flex items-center gap-4">
        <template v-if="loggedIn">
          <span class="text-gray-600 text-sm">Hello, {{ user?.name || user?.email }}</span>
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
