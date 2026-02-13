<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-w-3xl max-h-[90vh] overflow-auto text-sm">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">{{ title }}</h2>
        <button type="button" class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400" @click="$emit('close')">Close</button>
      </div>
      <p class="text-gray-600 text-xs mb-4">{{ description }}</p>
      <pre class="bg-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-[70vh] overflow-y-auto">{{ jsonPayload }}</pre>
      <div class="mt-4 flex gap-2">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px]"
          :class="isCopied ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
          @click="$emit('copy', jsonPayload, copyKey)"
        >
          {{ isCopied ? '✅ Copied!' : 'Copy to clipboard' }}
        </button>
        <button type="button" class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

const props = defineProps<{
  open: boolean
  title: string
  description: string
  payload: unknown
  copyKey: string
  copiedStatus: string | null
}>()

const { setSupportView, clearSupportView } = useSupportPageContext()
watch(() => props.open, (isOpen) => {
  if (isOpen) setSupportView(SUPPORT_VIEW_NAMES.DEBUG)
  else clearSupportView()
}, { immediate: true })

defineEmits<{
  close: []
  copy: [text: string, key: string]
}>()

const jsonPayload = computed(() => JSON.stringify(props.payload, null, 2))
const isCopied = computed(() => props.copiedStatus === props.copyKey)
</script>
