<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
}>()

function close() {
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      @click.self="close"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-required-title"
      >
        <h2 id="sign-in-required-title" class="text-lg font-semibold text-gray-900 mb-3">
          Sign in to use this feature
        </h2>
        <p class="text-gray-700 mb-4">
          This feature requires a <strong>completely free</strong> Shoresh account. With an account you can save words to your list, add notes, and sync your progress across devices.
        </p>
        <p class="text-sm text-gray-600 mb-5">
          If you already have an account, log in below. New to Shoresh? You can create a free account on the same page—it only takes a moment.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            class="order-2 sm:order-1 px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            @click="close"
          >
            Maybe later
          </button>
          <NuxtLink
            to="/login"
            class="order-1 sm:order-2 inline-flex justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            @click="close"
          >
            Sign up or log in
          </NuxtLink>
        </div>
      </div>
    </div>
  </Teleport>
</template>
