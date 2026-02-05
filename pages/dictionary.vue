<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-2">
        <span class="text-blue-600">📖</span> Translation Dictionary
      </h1>
      <NuxtLink to="/" class="text-blue-600 hover:underline flex items-center gap-1">
        ← Back to Explorer
      </NuxtLink>
    </div>

    <!-- Stats Card -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Cache Performance</h2>
      <div v-if="statsLoading" class="animate-pulse flex gap-8">
        <div class="h-16 w-32 bg-gray-100 rounded-lg"></div>
        <div class="h-16 w-32 bg-gray-100 rounded-lg"></div>
        <div class="h-16 w-32 bg-gray-100 rounded-lg"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div class="flex flex-col">
          <span class="text-3xl font-bold text-gray-900">{{ stats.hits }}</span>
          <span class="text-sm text-gray-500">Total Hits</span>
        </div>
        <div class="flex flex-col">
          <span class="text-3xl font-bold text-gray-900">{{ stats.misses }}</span>
          <span class="text-sm text-gray-500">Total Misses</span>
        </div>
        <div class="flex flex-col">
          <span class="text-3xl font-bold" :class="stats.malformed_hits > 0 ? 'text-red-600' : 'text-gray-900'">{{ stats.malformed_hits || 0 }}</span>
          <span class="text-sm text-gray-500">Malformed</span>
        </div>
        <div class="flex flex-col">
          <span class="text-3xl font-bold text-blue-600">{{ hitRate }}%</span>
          <span class="text-sm text-gray-500">Hit Rate</span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-medium text-gray-700">{{ lastUpdated }}</span>
          <span class="text-sm text-gray-500">Last Updated</span>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="relative flex-grow">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          v-model="search"
          type="text"
          placeholder="Search phrases or hash..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          @input="onSearch"
        />
      </div>
      <button 
        @click="refresh"
        class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        :disabled="loading"
      >
        <span :class="{ 'animate-spin': loading }">🔄</span> Refresh
      </button>
    </div>

    <!-- Entries Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div v-if="loading && !entries.length" class="p-12 text-center text-gray-500">
        Loading dictionary entries...
      </div>
      <div v-else-if="!entries.length" class="p-12 text-center text-gray-500">
        No translations found.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phrase</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Translation Snippet</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">v / Age</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Added</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="entry in entries" :key="entry.phrase_hash" class="hover:bg-gray-50 transition-colors cursor-pointer" @click="showDetail(entry)">
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900 max-w-md truncate" :title="entry.phrase" style="direction: rtl">
                  {{ entry.phrase }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-600 max-w-md truncate">
                  {{ entry.translationSnippet }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-gray-500">v{{ entry.version }}</span>
                  <span class="text-xs" :class="getAgeColor(entry.created_at)">
                    {{ getAgeDays(entry.created_at) }}d old
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 text-right">
                {{ formatDate(entry.created_at) }}
              </td>
              <td class="px-6 py-4 text-right">
                <button 
                  @click.stop="confirmDelete(entry)"
                  class="text-gray-400 hover:text-red-600 transition-colors p-1"
                  title="Delete entry"
                >
                  <span class="text-lg">🗑️</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="total > limit" class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div class="text-sm text-gray-600">
          Showing <span class="font-medium">{{ offset + 1 }}</span> to <span class="font-medium">{{ Math.min(offset + limit, total) }}</span> of <span class="font-medium">{{ total }}</span> results
        </div>
        <div class="flex gap-2">
          <button 
            @click="prevPage" 
            :disabled="offset === 0"
            class="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button 
            @click="nextPage" 
            :disabled="offset + limit >= total"
            class="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selectedEntry" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="selectedEntry = null">
      <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 class="text-xl font-bold text-gray-800">Entry Details</h2>
          <button @click="selectedEntry = null" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div class="p-6 overflow-y-auto space-y-6">
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Original Phrase</h3>
            <div class="p-4 bg-gray-50 rounded-xl text-2xl text-right leading-relaxed" style="direction: rtl">
              {{ selectedEntry.phrase }}
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Translation</h3>
            <div class="p-4 bg-blue-50 text-blue-900 rounded-xl text-xl">
              {{ selectedEntry.translationSnippet }}
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Metadata</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="block text-gray-500 mb-1">Hash</span>
                <span class="font-mono break-all">{{ selectedEntry.phrase_hash }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="block text-gray-500 mb-1">Created At</span>
                <span>{{ new Date(selectedEntry.created_at * 1000).toLocaleString() }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="block text-gray-500 mb-1">Version</span>
                <span>v{{ selectedEntry.version }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg col-span-2">
                <span class="block text-gray-500 mb-1">Prompt Hash</span>
                <span class="font-mono break-all text-xs text-gray-400">{{ selectedEntry.prompt_hash || 'None' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button @click="selectedEntry = null" class="px-6 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="entryToDelete" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" @click.self="entryToDelete = null">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-2">Delete Entry?</h3>
        <p class="text-gray-600 mb-6 text-sm">
          Are you sure you want to delete this translation from the cache? This cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <button 
            @click="entryToDelete = null" 
            class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="deleteEntry" 
            class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const entries = ref<any[]>([])
const stats = ref({ hits: 0, misses: 0, malformed_hits: 0, updated_at: 0 })
const loading = ref(false)
const statsLoading = ref(false)
const search = ref('')
const limit = 20
const offset = ref(0)
const total = ref(0)
const selectedEntry = ref<any>(null)
const entryToDelete = ref<any>(null)

const hitRate = computed(() => {
  const totalCalls = stats.value.hits + stats.value.misses
  if (totalCalls === 0) return '0.0'
  return ((stats.value.hits / totalCalls) * 100).toFixed(1)
})

const lastUpdated = computed(() => {
  if (!stats.value.updated_at) return 'Never'
  return new Date(stats.value.updated_at * 1000).toLocaleTimeString()
})

async function fetchStats() {
  statsLoading.value = true
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  try {
    stats.value = await $fetch('/api/cache/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (err) {
    console.error('Failed to fetch stats:', err)
  } finally {
    statsLoading.value = false
  }
}

async function fetchEntries() {
  loading.value = true
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  try {
    const data = await $fetch('/api/cache/entries', {
      params: {
        limit,
        offset: offset.value,
        search: search.value || undefined
      },
      headers: { Authorization: `Bearer ${token}` }
    })
    entries.value = data.entries
    total.value = data.total
  } catch (err) {
    console.error('Failed to fetch entries:', err)
  } finally {
    loading.value = false
  }
}

function refresh() {
  fetchStats()
  fetchEntries()
}

let searchTimeout: any = null
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    offset.value = 0
    fetchEntries()
  }, 300)
}

function prevPage() {
  if (offset.value > 0) {
    offset.value -= limit
    fetchEntries()
  }
}

function nextPage() {
  if (offset.value + limit < total.value) {
    offset.value += limit
    fetchEntries()
  }
}

function showDetail(entry: any) {
  selectedEntry.value = entry
}

function confirmDelete(entry: any) {
  entryToDelete.value = entry
}

async function deleteEntry() {
  if (!entryToDelete.value) return
  
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  
  try {
    await $fetch('/api/cache/entries', {
      method: 'DELETE',
      params: { hash: entryToDelete.value.phrase_hash },
      headers: { Authorization: `Bearer ${token}` }
    })
    entryToDelete.value = null
    fetchEntries() // Refresh the list
  } catch (err) {
    console.error('Failed to delete entry:', err)
    alert('Failed to delete entry. Check console for details.')
  }
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString()
}

function getAgeDays(timestamp: number) {
  const diff = Date.now() - (timestamp * 1000)
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getAgeColor(timestamp: number) {
  const days = getAgeDays(timestamp)
  if (days > 25) return 'text-red-500'
  if (days > 15) return 'text-amber-500'
  return 'text-green-500'
}

onMounted(() => {
  refresh()
})
</script>
