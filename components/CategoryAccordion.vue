<template>
  <!-- Recursive accordion: each level shows categories as expandable rows -->
  <div class="space-y-2">
    <!-- Render each category as a collapsible accordion row -->
    <div
      v-for="(cat, idx) in categories"
      :key="cat.path"
      class="border border-gray-200 rounded-lg bg-white overflow-hidden"
    >
      <!-- Header: click to expand/collapse; shows name, child count, arrow -->
      <button
        type="button"
        class="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
        @click="toggle(cat, idx)"
      >
        <span class="font-semibold truncate flex-1 min-w-0">
          {{ cat.category }}
          <span v-if="cat.heCategory" class="ml-2 text-gray-600 font-normal">({{ cat.heCategory }})</span>
        </span>
        <!-- Child count (or "..." if not yet loaded) -->
        <span class="text-sm text-blue-500 whitespace-nowrap">({{ countChildren(cat) }})</span>
        <!-- Arrow: ▼ expanded, ▶ collapsed -->
        <span class="text-gray-400 shrink-0">{{ openIndex === idx ? '▼' : '▶' }}</span>
      </button>
      <!-- Expandable body: only one row open at a time (openIndex === idx) -->
      <div v-show="openIndex === idx" class="border-t border-gray-200 bg-gray-50/50 p-4">
        <template v-if="cat.loaded && cat.children?.length">
          <!-- Books table: direct children with type "book" (selectable) -->
          <div v-if="books(cat).length" class="mb-4">
            <table class="w-full text-sm border border-gray-200 rounded-lg overflow-hidden bg-white">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700">Title</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in books(cat)"
                  :key="String(row.path ?? row.title ?? '')"
                  class="border-t border-gray-100 hover:bg-blue-50 cursor-pointer"
                  @click="onBookClick(row)"
                >
                  <td class="px-3 py-2">
                    <div class="font-medium">{{ row.title }}</div>
                    <div v-if="row.heTitle" class="text-gray-600">{{ row.heTitle }}</div>
                  </td>
                  <td class="px-3 py-2 text-gray-600">{{ row.enShortDesc || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Recursive: nest another accordion for subcategories (type "category") -->
          <CategoryAccordion
            v-if="subcategories(cat).length"
            :categories="subcategories(cat)"
            :loading="loading"
            @book-select="$emit('book-select', $event)"
            @tab-open="$emit('tab-open', $event)"
          />
        </template>
        <!-- Lazy load: parent fetches children on tab-open; show placeholder until loaded -->
        <div v-else-if="openIndex === idx && !cat.loaded" class="text-gray-500 text-sm">
          Expand to load…
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Props: array of category/book nodes (may include children after lazy load)
const props = defineProps<{
  categories: Array<Record<string, unknown> & { path?: string; loaded?: boolean; children?: unknown[]; type?: string; category?: string; heCategory?: string }>
  loading?: boolean
}>()
// Events: bubble up to parent; tab-open triggers lazy load, book-select opens the book
const emit = defineEmits<{
  'book-select': [event: { data: Record<string, unknown> }]
  'tab-open': [category: Record<string, unknown>]
}>()

// Which accordion row is expanded (index) or none (null); only one at a time
const openIndex = ref<number | null>(null)

// Type guards: children can be "category" (expandable) or "book" (leaf, clickable)
function isCategory (item: unknown): item is { type: string } {
  return !!item && typeof item === 'object' && (item as { type?: string }).type === 'category'
}
function isBook (item: unknown): item is { type: string } {
  return !!item && typeof item === 'object' && (item as { type?: string }).type === 'book'
}

// Split children into books (show in table) vs subcategories (recursive accordion)
function books (cat: { children?: unknown[] }) {
  if (!cat?.children) return []
  return cat.children.filter(isBook) as Array<Record<string, unknown>>
}
function subcategories (cat: { children?: unknown[] }) {
  if (!cat?.children) return []
  return cat.children.filter(isCategory) as Array<Record<string, unknown>>
}

// Display child count; "..." when not yet loaded (triggers parent to fetch)
function countChildren (category: { loaded?: boolean; children?: unknown[] }) {
  if (!category?.loaded) return '...'
  if (!Array.isArray(category.children)) return 0
  return category.children.length
}

// Expand/collapse: close if already open; otherwise open and emit tab-open for lazy load
function toggle (cat: Record<string, unknown>, idx: number) {
  if (openIndex.value === idx) {
    openIndex.value = null
    return
  }
  openIndex.value = idx
  emit('tab-open', cat)
}

// User clicked a book row; emit so parent can open the reader
function onBookClick (row: Record<string, unknown>) {
  emit('book-select', { data: row })
}
</script>
