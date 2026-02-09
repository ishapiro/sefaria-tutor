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
            <div class="mb-4">
              <label for="user-select" class="block text-sm font-medium text-gray-700 mb-2">
                Select User to Edit:
              </label>
              <select
                id="user-select"
                v-model="selectedUserId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @change="loadUserDetails"
              >
                <option value="">-- Select a user --</option>
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.name || user.email }} ({{ user.email }}) - {{ user.role }}
                </option>
              </select>
            </div>

            <!-- User Edit Form -->
            <div v-if="selectedUser" class="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 class="text-lg font-semibold text-gray-800">Edit User: {{ selectedUser.email }}</h3>
              
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

              <div class="flex gap-3">
                <button
                  type="button"
                  @click="saveUser"
                  :disabled="savingUser"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {{ savingUser ? 'Saving...' : 'Save Changes' }}
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
const users = ref<Array<{ id: string; email: string; name: string | null; role: string }>>([])
const usersLoading = ref(false)
const usersError = ref('')
const selectedUserId = ref('')
const selectedUser = ref<{
  id: string
  email: string
  name: string | null
  role: string
  is_verified: boolean
} | null>(null)
const editingUser = ref<{
  name: string | null
  email: string
  role: string
  is_verified: boolean
} | null>(null)
const savingUser = ref(false)
const saveMessage = ref('')
const saveMessageType = ref<'success' | 'error'>('success')

const loadUsers = async () => {
  usersLoading.value = true
  usersError.value = ''
  try {
    users.value = await $fetch('/api/admin/users')
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

const cancelEdit = () => {
  selectedUserId.value = ''
  selectedUser.value = null
  editingUser.value = null
  saveMessage.value = ''
}

watch(showUserManagement, (newVal) => {
  if (newVal && users.value.length === 0) {
    loadUsers()
  }
})
</script>
