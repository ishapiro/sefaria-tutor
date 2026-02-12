<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[55] flex items-center justify-center bg-black/50"
    @click.self="$emit('cancel')"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">{{ title }}</h3>
      <p class="text-gray-700 mb-4">
        {{ message }}
      </p>
      <div class="flex gap-3 justify-end">
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
          :disabled="loading"
          @click="$emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          :disabled="loading"
          @click="$emit('confirm')"
        >
          {{ loading ? '…' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    loading?: boolean
  }>(),
  {
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    loading: false
  }
)

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
