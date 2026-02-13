<template>
  <div class="mb-4">
    <div class="flex items-center gap-4 mb-4 flex-wrap">
      <span class="relative flex-grow min-w-[200px]">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
        <input
          :value="searchQuery"
          type="text"
          placeholder="Search books..."
          class="w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
      </span>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
        :disabled="loading"
        @click="$emit('refresh-index')"
      >
        Refresh Index
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
        @click="$emit('open-help')"
      >
        Help
      </button>
      <button
        v-if="loggedIn"
        type="button"
        class="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px]"
        :class="showWordListModal
          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
        @click="$emit('open-word-list')"
      >
        <span class="text-base leading-none">📚</span>
        <span>My Word List</span>
      </button>
      <button
        v-if="loggedIn"
        type="button"
        class="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px]"
        :class="showNotesListModal
          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
        @click="$emit('open-notes-list')"
      >
        <span class="text-base leading-none">📝</span>
        <span>My Notes</span>
      </button>
      <NuxtLink
        v-if="isAdmin"
        to="/admin"
        class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
      >
        Admin
      </NuxtLink>
    </div>
    <CategoryAccordion
      :categories="filteredCategories"
      :loading="loading"
      @book-select="$emit('book-select', $event)"
      @tab-open="$emit('tab-open', $event)"
    />
    <!-- Category error: please select a book -->
    <div
      v-if="showCategoryDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="$emit('close-category-dialog')"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
        <p class="font-semibold text-gray-800 mb-2">Please select a book, not a category.</p>
        <button type="button" class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400" @click="$emit('close-category-dialog')">OK</button>
      </div>
    </div>
    <!-- API error -->
    <div
      v-if="showErrorDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="$emit('close-error-dialog')"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 text-center">
        <p class="font-semibold text-gray-800 mb-4">{{ errorMessage }}</p>
        <div class="flex gap-2 justify-center">
          <button
            v-if="errorDetails"
            type="button"
            class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="$emit('open-error-debug')"
          >
            Debug Info
          </button>
          <button type="button" class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400" @click="$emit('close-error-dialog')">OK</button>
        </div>
      </div>
    </div>

    <CommonDebugDialog
      :open="showErrorDebugDialog"
      title="Error Debug Information"
      description="This information can help diagnose browser-specific issues."
      :payload="errorDetails"
      copy-key="errorDebug"
      :copied-status="copiedStatus"
      @close="$emit('close-error-debug-dialog')"
      @copy="(t, k) => $emit('copy-debug', t as string, k as string)"
    />
    <CommonHelpDialog :open="showHelpDialog" @close="$emit('close-help')" />
  </div>
</template>

<script setup lang="ts">
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

const { setSupportView, clearSupportView } = useSupportPageContext()
onMounted(() => setSupportView(SUPPORT_VIEW_NAMES.BOOK_BROWSER))
onUnmounted(() => clearSupportView())

/** Minimal shape for category tree nodes used by CategoryAccordion */
export interface CategoryNode {
  type?: string
  path?: string
  loaded?: boolean
  children?: CategoryNode[]
  contents?: CategoryNode[]
  category?: string
  heCategory?: string
  title?: string
  categories?: string[]
  [key: string]: unknown
}

defineProps<{
  searchQuery: string
  loading: boolean
  filteredCategories: CategoryNode[]
  showCategoryDialog: boolean
  showErrorDialog: boolean
  errorMessage: string
  errorDetails: Record<string, unknown> | null
  showErrorDebugDialog: boolean
  showHelpDialog: boolean
  showWordListModal: boolean
  showNotesListModal: boolean
  loggedIn: boolean
  isAdmin: boolean
  copiedStatus: string | null
}>()

defineEmits<{
  'update:searchQuery': [value: string]
  'refresh-index': []
  'open-help': []
  'open-word-list': []
  'open-notes-list': []
  'book-select': [event: { data: CategoryNode }]
  'tab-open': [category: CategoryNode]
  'close-category-dialog': []
  'close-error-dialog': []
  'open-error-debug': []
  'close-error-debug-dialog': []
  'close-help': []
  'copy-debug': [text: string, key: string]
}>()
</script>
