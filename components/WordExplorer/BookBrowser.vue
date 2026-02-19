<template>
  <div class="mb-4">
    <div class="flex items-center gap-2 sm:gap-4 mb-4 flex-wrap">
      <span class="relative flex-grow min-w-0 sm:min-w-[200px]">
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
        v-if="isAdmin"
        type="button"
        class="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[32px] sm:min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
        :disabled="loading"
        @click="$emit('refresh-index')"
      >
        <span class="hidden sm:inline">Refresh Index</span>
        <span class="sm:hidden">Refresh</span>
      </button>
      <!-- Help, My Word List, My Notes: one row on mobile with compact sizing -->
      <div class="flex items-center flex-nowrap gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          class="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center justify-center gap-1 sm:gap-2 min-h-[32px] sm:min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          @click="$emit('open-help')"
        >
          Help
        </button>
        <button
          type="button"
          class="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center justify-center gap-1 sm:gap-2 min-h-[32px] sm:min-h-[36px]"
          :class="showWordListModal
            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
          @click="$emit('open-word-list')"
        >
          <span class="text-sm sm:text-base leading-none">📚</span>
          <span class="sm:hidden">Words</span>
          <span class="hidden sm:inline">My Word List</span>
        </button>
        <button
          type="button"
          class="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center justify-center gap-1 sm:gap-2 min-h-[32px] sm:min-h-[36px]"
          :class="showNotesListModal
            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
          @click="$emit('open-notes-list')"
        >
          <span class="text-sm sm:text-base leading-none">📝</span>
          <span>My Notes</span>
        </button>
      </div>
      <NuxtLink
        v-if="isAdmin"
        to="/admin"
        class="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[32px] sm:min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
      >
        Admin
      </NuxtLink>
    </div>

    <!-- When searching: show full-index search results in a dedicated panel -->
    <div
      v-if="searchQuery.trim()"
      class="border border-gray-200 rounded-lg bg-white overflow-hidden"
    >
      <div class="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h2 class="text-sm font-semibold text-gray-800">
            Search results for “<span class="text-blue-700">{{ searchQuery }}</span>”
          </h2>
          <p v-if="searchResults.length > 0" class="text-xs text-gray-600 mt-0.5">
            {{ searchResults.length }} book{{ searchResults.length === 1 ? '' : 's' }} found. Click to open.
          </p>
          <p v-else-if="!loading" class="text-xs text-gray-600 mt-0.5">
            No books found. Try a different term or browse by category below.
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          @click="$emit('update:searchQuery', '')"
        >
          Cancel
        </button>
      </div>
      <div v-if="searchResults.length > 0" class="max-h-[60vh] overflow-y-auto">
        <table class="w-full text-sm border-collapse">
          <thead class="bg-gray-100 sticky top-0">
            <tr>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Title</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Location</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in searchResults"
              :key="String(row.path ?? row.title ?? '')"
              class="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
              @click="onSearchResultClick(row)"
            >
              <td class="px-3 py-2">
                <div class="font-medium">{{ row.title || row.category }}</div>
                <div v-if="row.heTitle || row.heCategory" class="text-gray-600">{{ row.heTitle || row.heCategory }}</div>
              </td>
              <td class="px-3 py-2 text-gray-600 text-xs">
                {{ (row as SearchResultNode).breadcrumb?.slice(0, -1).join(' › ') || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="searchQuery.trim() && !loading" class="px-4 py-6 text-center text-gray-500 text-sm">
        No books match “{{ searchQuery }}”. Clear the search to browse by category.
      </p>
    </div>

    <!-- When not searching: show category accordion -->
    <CategoryAccordion
      v-show="!searchQuery.trim()"
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

/** Search result item includes breadcrumb for display */
export type SearchResultNode = CategoryNode & { breadcrumb?: string[] }

const props = defineProps<{
  searchQuery: string
  loading: boolean
  filteredCategories: CategoryNode[]
  searchResults: SearchResultNode[]
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

const emit = defineEmits<{
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

function onSearchResultClick (row: SearchResultNode) {
  const { breadcrumb: _, ...node } = row
  emit('book-select', { data: node as CategoryNode })
}
</script>
