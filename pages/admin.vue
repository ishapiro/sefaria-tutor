<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Admin Panel</h1>
      <NuxtLink to="/" class="text-blue-600 hover:underline flex items-center gap-1">
        ← Back to Explorer
      </NuxtLink>
    </div>

    <div v-if="!isAdmin" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      <p class="font-semibold">Access Denied</p>
      <p>You must be an administrator to access this page.</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Manage Users Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">User Management</h2>
        <button
          type="button"
          @click="showUserManagement = !showUserManagement"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {{ showUserManagement ? 'Hide' : 'Manage Users' }}
        </button>

        <div v-if="showUserManagement" class="mt-6">
          <div v-if="usersLoading" class="text-center py-8 text-gray-500">
            Loading users...
          </div>
          <div v-else-if="usersError" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {{ usersError }}
          </div>
          <div v-else>
            <!-- User List -->
            <div class="mb-4 space-y-3">
              <!-- Search above dropdown, left-aligned -->
              <div class="w-full sm:w-72">
                <label for="user-search" class="block text-sm font-medium text-gray-700 mb-1">
                  Search users
                </label>
                <div class="relative">
                  <input
                    id="user-search"
                    v-model="userSearch"
                    type="text"
                    class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by email or name..."
                    @input="handleUserSearchChange"
                  />
                  <span class="pointer-events-none absolute inset-y-0 left-2 flex items-center text-gray-400">
                    🔍
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3 justify-between">
                <div class="flex items-center gap-3">
                  <label for="user-select" class="block text-sm font-medium text-gray-700">
                    Select User to Edit:
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      v-model="showDeleted"
                      type="checkbox"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      @change="() => { userOffset = 0; loadUsers() }"
                    />
                    <span>Show deleted users</span>
                  </label>
                </div>
              </div>

              <p class="text-xs text-gray-500 mt-1">
                The list below shows only the users that match your current search and page. Use the search box to
                narrow results, and the Previous/Next buttons to move through additional pages of users.
              </p>

              <select
                id="user-select"
                v-model="selectedUserId"
                class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @change="loadUserDetails"
              >
                <option value="">-- Select a user --</option>
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.name || user.email }} ({{ user.email }}) - {{ user.role }}
                  <span v-if="user.deleted_at">[DELETED]</span>
                </option>
              </select>

              <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
                <div>
                  <span v-if="userTotal">
                    Showing <span class="font-medium">{{ usersFrom }}</span>–<span class="font-medium">{{ usersTo }}</span>
                    of <span class="font-medium">{{ userTotal }}</span> users
                  </span>
                  <span v-else>No users found</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                    :disabled="!hasPrevUsersPage"
                    @click="goToPrevUsersPage"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                    :disabled="!hasNextUsersPage"
                    @click="goToNextUsersPage"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <!-- User Edit Form -->
            <div v-if="selectedUser" class="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 class="text-lg font-semibold text-gray-800">
                Edit User: {{ selectedUser.email }}
                <span v-if="selectedUser.deleted_at" class="text-red-600 text-sm font-normal">(Deleted)</span>
              </h3>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  v-model="editingUser.name"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  v-model="editingUser.email"
                  type="email"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  v-model="editingUser.role"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">General</option>
                  <option value="team">Team</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Verified</label>
                <label class="flex items-center gap-2">
                  <input
                    v-model="editingUser.is_verified"
                    type="checkbox"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>Email verified</span>
                </label>
              </div>

              <div v-if="selectedUser.deleted_at" class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
                <p class="font-semibold">⚠️ This user is deleted</p>
                <p class="text-sm">Deleted on: {{ new Date(selectedUser.deleted_at * 1000).toLocaleString() }}</p>
              </div>

              <div class="flex gap-3 flex-wrap">
                <button
                  type="button"
                  @click="saveUser"
                  :disabled="savingUser || selectedUser.deleted_at"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {{ savingUser ? 'Saving...' : 'Save Changes' }}
                </button>
                <button
                  v-if="!selectedUser.deleted_at"
                  type="button"
                  @click="deleteUser"
                  :disabled="deletingUser"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {{ deletingUser ? 'Deleting...' : 'Delete User' }}
                </button>
                <button
                  v-if="selectedUser.deleted_at"
                  type="button"
                  @click="restoreUser"
                  :disabled="restoringUser"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {{ restoringUser ? 'Restoring...' : 'Restore User' }}
                </button>
                <button
                  v-if="selectedUser.deleted_at"
                  type="button"
                  @click="purgeUser"
                  :disabled="purgingUser"
                  class="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 disabled:opacity-50 transition-colors"
                >
                  {{ purgingUser ? 'Purging...' : 'Purge Permanently' }}
                </button>
                <button
                  type="button"
                  @click="cancelEdit"
                  class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div v-if="saveMessage" class="mt-2 p-3 rounded-lg" :class="saveMessageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
                {{ saveMessage }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Manage Phrase Cache Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Phrase Cache Management</h2>
        <NuxtLink
          to="/dictionary"
          class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Manage Phrase Cache
        </NuxtLink>
        <p class="mt-2 text-sm text-gray-600">
          View and manage cached translations in the dictionary.
        </p>
      </div>

      <!-- Pronunciation Cache Management Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Pronunciation Cache Management</h2>
        <button
          type="button"
          @click="showPronunciationCache = !showPronunciationCache"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {{ showPronunciationCache ? 'Hide' : 'Manage Pronunciation Cache' }}
        </button>

        <div v-if="showPronunciationCache" class="mt-6 space-y-6">
          <!-- Statistics Card -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Cache Statistics</h3>
            <div v-if="pronunciationStatsLoading" class="text-center py-4 text-gray-500">
              Loading statistics...
            </div>
            <div v-else-if="pronunciationStatsError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
              {{ pronunciationStatsError }}
            </div>
            <div v-else-if="pronunciationStats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div class="text-sm text-gray-600">Cache Size</div>
                <div class="text-lg font-semibold">{{ formatBytes(pronunciationStats.total_size_bytes) }}</div>
                <div class="text-xs text-gray-500">
                  {{ pronunciationStats.usage_percent?.toFixed(1) || 0 }}% of {{ formatBytes(pronunciationStats.max_size_bytes) }}
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-600">Total Files</div>
                <div class="text-lg font-semibold">{{ pronunciationStats.total_files?.toLocaleString() || 0 }}</div>
                <div class="text-xs text-gray-500">
                  ~{{ Math.round((pronunciationStats.total_files || 0) / 20000) }}% of capacity
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-600">Hit Rate</div>
                <div class="text-lg font-semibold">{{ pronunciationStats.hit_rate?.toFixed(1) || 0 }}%</div>
                <div class="text-xs text-gray-500">
                  {{ pronunciationStats.hits || 0 }} hits / {{ (pronunciationStats.hits || 0) + (pronunciationStats.misses || 0) }} requests
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-600">Last Purge</div>
                <div class="text-lg font-semibold">
                  {{ pronunciationStats.last_purge_at ? formatDate(pronunciationStats.last_purge_at) : 'Never' }}
                </div>
              </div>
            </div>
            <div class="mt-4">
              <button
                type="button"
                @click="loadPronunciationStats"
                class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 text-gray-700"
              >
                Refresh Stats
              </button>
            </div>
          </div>

          <!-- Operations Card -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Cache Operations</h3>
            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                @click="purgePronunciationCache"
                :disabled="purgingPronunciationCache"
                class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
              >
                {{ purgingPronunciationCache ? 'Purging...' : 'Purge Old Entries (LRU)' }}
              </button>
              <button
                type="button"
                @click="clearPronunciationCache"
                :disabled="clearingPronunciationCache"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {{ clearingPronunciationCache ? 'Clearing...' : 'Clear All Cache' }}
              </button>
            </div>
            <div v-if="pronunciationOperationMessage" class="mt-3 p-3 rounded-lg" :class="pronunciationOperationType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
              {{ pronunciationOperationMessage }}
            </div>
          </div>

          <!-- Cache Browser -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Cache Browser</h3>
            <div class="mb-4">
              <label for="pronunciation-search" class="sr-only">Search pronunciations</label>
              <div class="relative">
                <input
                  id="pronunciation-search"
                  v-model="pronunciationSearch"
                  type="text"
                  class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by text or hash..."
                  @input="handlePronunciationSearchChange"
                />
                <span class="pointer-events-none absolute inset-y-0 left-2 flex items-center text-gray-400">
                  🔍
                </span>
              </div>
            </div>

            <div v-if="pronunciationEntriesLoading" class="text-center py-8 text-gray-500">
              Loading entries...
            </div>
            <div v-else-if="pronunciationEntriesError" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {{ pronunciationEntriesError }}
            </div>
            <div v-else>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Text</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Size</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Last Accessed</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Access Count</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="entry in pronunciationEntries" :key="entry.text_hash">
                      <td class="px-4 py-2 text-sm text-gray-900 font-mono">{{ entry.normalized_text || entry.text_hash.substring(0, 16) + '...' }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ formatBytes(entry.file_size_bytes) }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ formatDate(entry.created_at) }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ formatDate(entry.last_accessed_at) }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ entry.access_count || 0 }}</td>
                      <td class="px-4 py-2 text-sm">
                        <button
                          type="button"
                          @click="deletePronunciationEntry(entry.text_hash)"
                          class="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="pronunciationEntries.length === 0" class="text-center py-8 text-gray-500">
                No entries found
              </div>

              <div class="flex items-center justify-between mt-4 text-xs text-gray-500">
                <div>
                  <span v-if="pronunciationTotal">
                    Showing <span class="font-medium">{{ pronunciationFrom }}</span>–<span class="font-medium">{{ pronunciationTo }}</span>
                    of <span class="font-medium">{{ pronunciationTotal }}</span> entries
                  </span>
                  <span v-else>No entries found</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                    :disabled="!hasPrevPronunciationPage"
                    @click="goToPrevPronunciationPage"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                    :disabled="!hasNextPronunciationPage"
                    @click="goToNextPronunciationPage"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isAdmin } = useAuth()
const router = useRouter()

// Redirect if not admin
watchEffect(() => {
  if (!isAdmin.value) {
    router.push('/')
  }
})

const showUserManagement = ref(false)
const users = ref<Array<{ id: string; email: string; name: string | null; role: string; deleted_at: number | null }>>(
  []
)
const usersLoading = ref(false)
const usersError = ref('')
const selectedUserId = ref('')
const showDeleted = ref(false)
const userSearch = ref('')
const userLimit = ref(50)
const userOffset = ref(0)
const userTotal = ref(0)
const selectedUser = ref<{
  id: string
  email: string
  name: string | null
  role: string
  is_verified: boolean
  deleted_at: number | null
} | null>(null)
const editingUser = ref<{
  name: string | null
  email: string
  role: string
  is_verified: boolean
} | null>(null)
const savingUser = ref(false)
const deletingUser = ref(false)
const restoringUser = ref(false)
const purgingUser = ref(false)
const saveMessage = ref('')
const saveMessageType = ref<'success' | 'error'>('success')

const buildUsersQueryString = () => {
  const params = new URLSearchParams()
  if (showDeleted.value) {
    params.set('includeDeleted', 'true')
  }
  if (userSearch.value.trim()) {
    params.set('q', userSearch.value.trim())
  }
  params.set('limit', String(userLimit.value))
  params.set('offset', String(userOffset.value))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

const loadUsers = async () => {
  usersLoading.value = true
  usersError.value = ''
  try {
    const response = await $fetch<{
      users: Array<{ id: string; email: string; name: string | null; role: string; is_verified: boolean; deleted_at: number | null }>
      total: number
      limit: number
      offset: number
    }>(`/api/admin/users${buildUsersQueryString()}`)

    users.value = response.users
    userTotal.value = response.total
    userLimit.value = response.limit
    userOffset.value = response.offset
  } catch (err: any) {
    usersError.value = err.data?.message || 'Failed to load users'
  } finally {
    usersLoading.value = false
  }
}

const loadUserDetails = async () => {
  if (!selectedUserId.value) {
    selectedUser.value = null
    editingUser.value = null
    return
  }

  try {
    selectedUser.value = await $fetch(`/api/admin/users/${selectedUserId.value}`)
    editingUser.value = {
      name: selectedUser.value.name,
      email: selectedUser.value.email,
      role: selectedUser.value.role,
      is_verified: Boolean(selectedUser.value.is_verified)
    }
    saveMessage.value = ''
  } catch (err: any) {
    saveMessage.value = err.data?.message || 'Failed to load user details'
    saveMessageType.value = 'error'
  }
}

const saveUser = async () => {
  if (!selectedUser.value || !editingUser.value) return

  savingUser.value = true
  saveMessage.value = ''
  
  try {
    await $fetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'PUT',
      body: editingUser.value
    })
    
    saveMessage.value = 'User updated successfully'
    saveMessageType.value = 'success'
    
    // Reload users list and selected user
    await loadUsers()
    await loadUserDetails()
  } catch (err: any) {
    saveMessage.value = err.data?.message || 'Failed to update user'
    saveMessageType.value = 'error'
  } finally {
    savingUser.value = false
  }
}

const deleteUser = async () => {
  if (!selectedUser.value) return
  
  if (!confirm(`Are you sure you want to delete user "${selectedUser.value.email}"? This is a soft delete and can be reversed.`)) {
    return
  }

  deletingUser.value = true
  saveMessage.value = ''
  
  try {
    await $fetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'DELETE'
    })
    
    saveMessage.value = 'User deleted successfully'
    saveMessageType.value = 'success'
    
    // Reload users list and selected user
    await loadUsers()
    await loadUserDetails()
  } catch (err: any) {
    saveMessage.value = err.data?.message || 'Failed to delete user'
    saveMessageType.value = 'error'
  } finally {
    deletingUser.value = false
  }
}

const restoreUser = async () => {
  if (!selectedUser.value) return
  
  restoringUser.value = true
  saveMessage.value = ''
  
  try {
    await $fetch(`/api/admin/users/${selectedUser.value.id}/restore`, {
      method: 'POST'
    })
    
    saveMessage.value = 'User restored successfully'
    saveMessageType.value = 'success'
    
    // Reload users list and selected user
    await loadUsers()
    await loadUserDetails()
  } catch (err: any) {
    saveMessage.value = err.data?.message || 'Failed to restore user'
    saveMessageType.value = 'error'
  } finally {
    restoringUser.value = false
  }
}

const purgeUser = async () => {
  if (!selectedUser.value) return
  
  if (!confirm(`⚠️ WARNING: This will PERMANENTLY delete user "${selectedUser.value.email}" from the database. This action cannot be undone!\n\nAre you absolutely sure?`)) {
    return
  }

  if (!confirm(`Final confirmation: Permanently delete "${selectedUser.value.email}"?`)) {
    return
  }

  purgingUser.value = true
  saveMessage.value = ''
  
  try {
    await $fetch(`/api/admin/users/${selectedUser.value.id}/purge`, {
      method: 'DELETE'
    })
    
    saveMessage.value = 'User purged permanently'
    saveMessageType.value = 'success'
    
    // Clear selection and reload users list
    selectedUserId.value = ''
    selectedUser.value = null
    editingUser.value = null
    await loadUsers()
  } catch (err: any) {
    saveMessage.value = err.data?.message || 'Failed to purge user'
    saveMessageType.value = 'error'
  } finally {
    purgingUser.value = false
  }
}

const cancelEdit = () => {
  selectedUserId.value = ''
  selectedUser.value = null
  editingUser.value = null
  saveMessage.value = ''
}

const usersFrom = computed(() => {
  if (!userTotal.value) return 0
  return userOffset.value + 1
})

const usersTo = computed(() => {
  if (!userTotal.value) return 0
  return Math.min(userOffset.value + users.value.length, userTotal.value)
})

const hasPrevUsersPage = computed(() => userOffset.value > 0)
const hasNextUsersPage = computed(() => userOffset.value + users.value.length < userTotal.value)

const goToPrevUsersPage = async () => {
  if (!hasPrevUsersPage.value) return
  userOffset.value = Math.max(0, userOffset.value - userLimit.value)
  await loadUsers()
}

const goToNextUsersPage = async () => {
  if (!hasNextUsersPage.value) return
  userOffset.value = userOffset.value + userLimit.value
  await loadUsers()
}

let userSearchTimeout: ReturnType<typeof setTimeout> | null = null

const handleUserSearchChange = () => {
  if (userSearchTimeout) {
    clearTimeout(userSearchTimeout)
  }
  userSearchTimeout = setTimeout(() => {
    userOffset.value = 0
    loadUsers()
  }, 300)
}

watch(showUserManagement, (newVal) => {
  if (newVal && users.value.length === 0) {
    loadUsers()
  }
})

// Pronunciation Cache Management
const showPronunciationCache = ref(false)
const pronunciationStats = ref<{
  total_size_bytes: number
  total_files: number
  hits: number
  misses: number
  hit_rate: number
  max_size_bytes: number
  usage_percent: number
  last_purge_at: number | null
  updated_at: number
} | null>(null)
const pronunciationStatsLoading = ref(false)
const pronunciationStatsError = ref('')
const pronunciationEntries = ref<Array<{
  text_hash: string
  normalized_text: string
  r2_key: string
  file_size_bytes: number
  created_at: number
  last_accessed_at: number
  access_count: number
}>>([])
const pronunciationEntriesLoading = ref(false)
const pronunciationEntriesError = ref('')
const pronunciationSearch = ref('')
const pronunciationLimit = ref(50)
const pronunciationOffset = ref(0)
const pronunciationTotal = ref(0)
const purgingPronunciationCache = ref(false)
const clearingPronunciationCache = ref(false)
const pronunciationOperationMessage = ref('')
const pronunciationOperationType = ref<'success' | 'error'>('success')

const loadPronunciationStats = async () => {
  pronunciationStatsLoading.value = true
  pronunciationStatsError.value = ''
  try {
    pronunciationStats.value = await $fetch('/api/admin/pronunciation-cache/stats')
  } catch (err: any) {
    pronunciationStatsError.value = err.data?.message || 'Failed to load statistics'
  } finally {
    pronunciationStatsLoading.value = false
  }
}

const loadPronunciationEntries = async () => {
  pronunciationEntriesLoading.value = true
  pronunciationEntriesError.value = ''
  try {
    const params = new URLSearchParams()
    params.set('limit', String(pronunciationLimit.value))
    params.set('offset', String(pronunciationOffset.value))
    if (pronunciationSearch.value.trim()) {
      params.set('search', pronunciationSearch.value.trim())
    }
    const response = await $fetch<{
      entries: Array<{
        text_hash: string
        normalized_text: string
        r2_key: string
        file_size_bytes: number
        created_at: number
        last_accessed_at: number
        access_count: number
      }>
      total: number
      limit: number
      offset: number
    }>(`/api/admin/pronunciation-cache/entries?${params.toString()}`)
    pronunciationEntries.value = response.entries
    pronunciationTotal.value = response.total
  } catch (err: any) {
    pronunciationEntriesError.value = err.data?.message || 'Failed to load entries'
  } finally {
    pronunciationEntriesLoading.value = false
  }
}

const purgePronunciationCache = async () => {
  if (!confirm('Are you sure you want to purge old entries? This will delete the least recently used entries to free up space.')) {
    return
  }

  purgingPronunciationCache.value = true
  pronunciationOperationMessage.value = ''
  try {
    const result = await $fetch<{ success: boolean; message: string }>('/api/admin/pronunciation-cache/purge', {
      method: 'POST',
    })
    pronunciationOperationMessage.value = result.message
    pronunciationOperationType.value = 'success'
    await loadPronunciationStats()
    await loadPronunciationEntries()
  } catch (err: any) {
    pronunciationOperationMessage.value = err.data?.message || 'Failed to purge cache'
    pronunciationOperationType.value = 'error'
  } finally {
    purgingPronunciationCache.value = false
  }
}

const clearPronunciationCache = async () => {
  if (!confirm('⚠️ WARNING: This will PERMANENTLY delete ALL cached pronunciations. This action cannot be undone!\n\nAre you absolutely sure?')) {
    return
  }

  if (!confirm('Final confirmation: Clear all pronunciation cache?')) {
    return
  }

  clearingPronunciationCache.value = true
  pronunciationOperationMessage.value = ''
  try {
    const result = await $fetch<{ success: boolean; message: string }>('/api/admin/pronunciation-cache/clear', {
      method: 'POST',
    })
    pronunciationOperationMessage.value = result.message
    pronunciationOperationType.value = 'success'
    await loadPronunciationStats()
    await loadPronunciationEntries()
  } catch (err: any) {
    pronunciationOperationMessage.value = err.data?.message || 'Failed to clear cache'
    pronunciationOperationType.value = 'error'
  } finally {
    clearingPronunciationCache.value = false
  }
}

const deletePronunciationEntry = async (textHash: string) => {
  if (!confirm(`Are you sure you want to delete this pronunciation entry?`)) {
    return
  }

  try {
    await $fetch(`/api/admin/pronunciation-cache/entries/${textHash}`, {
      method: 'DELETE',
    })
    pronunciationOperationMessage.value = 'Entry deleted successfully'
    pronunciationOperationType.value = 'success'
    await loadPronunciationStats()
    await loadPronunciationEntries()
  } catch (err: any) {
    pronunciationOperationMessage.value = err.data?.message || 'Failed to delete entry'
    pronunciationOperationType.value = 'error'
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

const formatDate = (timestamp: number): string => {
  if (!timestamp) return 'Never'
  return new Date(timestamp * 1000).toLocaleString()
}

const pronunciationFrom = computed(() => {
  if (!pronunciationTotal.value) return 0
  return pronunciationOffset.value + 1
})

const pronunciationTo = computed(() => {
  if (!pronunciationTotal.value) return 0
  return Math.min(pronunciationOffset.value + pronunciationEntries.value.length, pronunciationTotal.value)
})

const hasPrevPronunciationPage = computed(() => pronunciationOffset.value > 0)
const hasNextPronunciationPage = computed(() => pronunciationOffset.value + pronunciationEntries.value.length < pronunciationTotal.value)

const goToPrevPronunciationPage = async () => {
  if (!hasPrevPronunciationPage.value) return
  pronunciationOffset.value = Math.max(0, pronunciationOffset.value - pronunciationLimit.value)
  await loadPronunciationEntries()
}

const goToNextPronunciationPage = async () => {
  if (!hasNextPronunciationPage.value) return
  pronunciationOffset.value = pronunciationOffset.value + pronunciationLimit.value
  await loadPronunciationEntries()
}

let pronunciationSearchTimeout: ReturnType<typeof setTimeout> | null = null

const handlePronunciationSearchChange = () => {
  if (pronunciationSearchTimeout) {
    clearTimeout(pronunciationSearchTimeout)
  }
  pronunciationSearchTimeout = setTimeout(() => {
    pronunciationOffset.value = 0
    loadPronunciationEntries()
  }, 300)
}

watch(showPronunciationCache, (newVal) => {
  if (newVal) {
    loadPronunciationStats()
    loadPronunciationEntries()
  }
})
</script>
