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

      <!-- Study / Flashcards Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Study / Flashcards</h2>
        <button
          type="button"
          @click="showStudyFlashcards = !showStudyFlashcards"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {{ showStudyFlashcards ? 'Hide' : 'Study / Flashcards' }}
        </button>

        <div v-if="showStudyFlashcards" class="mt-6 space-y-6">
          <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <strong>Note:</strong> All figures below are all-time and include progress for words that have been studied at least once, including words that are now archived.
          </div>

          <div v-if="studyStatsLoading" class="text-center py-6 text-gray-500">Loading aggregate stats...</div>
          <div v-else-if="studyStatsError" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{{ studyStatsError }}</div>
          <div v-else class="rounded-lg border border-gray-200 overflow-hidden">
            <h3 class="text-lg font-semibold text-gray-800 px-4 py-3 bg-gray-50 border-b border-gray-200">Aggregate stats</h3>
            <dl class="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4">
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase">Users with progress</dt>
                <dd class="text-xl font-semibold text-gray-900">{{ studyStats.distinctUsers }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase">Words studied</dt>
                <dd class="text-xl font-semibold text-gray-900">{{ studyStats.totalProgressRecords }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase">Total times shown</dt>
                <dd class="text-xl font-semibold text-gray-900">{{ studyStats.totalTimesShown }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase">Total times correct</dt>
                <dd class="text-xl font-semibold text-gray-900">{{ studyStats.totalTimesCorrect }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase">Percent correct</dt>
                <dd class="text-xl font-semibold text-gray-900">{{ studyStatsPercentCorrect }}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Per-user study data</h3>
            <p class="text-sm text-gray-600 mb-2">Search and select a user to see their studied words and progress (includes archived words).</p>
            <div class="flex flex-wrap gap-3 items-end mb-2">
              <div class="min-w-[200px]">
                <label for="study-user-search" class="block text-sm font-medium text-gray-700 mb-1">Search users</label>
                <input
                  id="study-user-search"
                  v-model="studyUserSearch"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email or name..."
                  @keydown.enter="studyUserOffset = 0; loadStudyUsers()"
                />
              </div>
              <button
                type="button"
                class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                @click="studyUserOffset = 0; loadStudyUsers()"
              >
                Search
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-3 mb-2">
              <select
                v-model="selectedStudyUserId"
                class="min-w-[280px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                :disabled="studyUsersLoading"
                @change="studyWordsOffset = 0; loadStudyUserStats()"
              >
                <option value="">-- Select a user --</option>
                <option v-for="u in studyUsers" :key="u.id" :value="u.id">
                  {{ u.name || u.email }} ({{ u.email }})
                </option>
              </select>
              <span v-if="!studyUsersLoading" class="text-sm text-gray-500">
                Showing {{ studyUsersFrom }}–{{ studyUsersTo }} of {{ studyUserTotal }}
              </span>
              <span v-else class="text-sm text-gray-500">Loading users…</span>
              <button
                type="button"
                class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                :disabled="studyUsersLoading || studyUserOffset <= 0"
                @click="studyUserOffset = Math.max(0, studyUserOffset - studyUserLimit); loadStudyUsers()"
              >
                Previous
              </button>
              <button
                type="button"
                class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                :disabled="studyUsersLoading || studyUserOffset + studyUsers.length >= studyUserTotal"
                @click="studyUserOffset += studyUserLimit; loadStudyUsers()"
              >
                Next
              </button>
            </div>

            <div v-if="studyUserStatsLoading" class="mt-4 text-center py-6 text-gray-500">Loading user study data...</div>
            <div v-else-if="studyUserStatsError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{{ studyUserStatsError }}</div>
            <div v-else-if="studyUserStats" class="mt-4 space-y-4">
              <dl class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <dt class="text-xs font-medium text-gray-500 uppercase">Words studied</dt>
                  <dd class="text-lg font-semibold text-gray-900">{{ studyUserStats.summary.wordsStudied }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 uppercase">Total shown</dt>
                  <dd class="text-lg font-semibold text-gray-900">{{ studyUserStats.summary.totalShown }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 uppercase">Total correct</dt>
                  <dd class="text-lg font-semibold text-gray-900">{{ studyUserStats.summary.totalCorrect }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 uppercase">Percent correct</dt>
                  <dd class="text-lg font-semibold text-gray-900">{{ studyUserStatsPercentCorrect }}</dd>
                </div>
              </dl>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Word</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Translation</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Shown</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Correct</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">First correct at</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Archived</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="w in studyUserStats.studiedWords" :key="w.wordListId" class="hover:bg-gray-50">
                      <td class="px-4 py-2 text-sm" style="direction: rtl">{{ wordEntryWord(w.wordData) }}</td>
                      <td class="px-4 py-2 text-sm text-gray-700">{{ wordEntryTranslation(w.wordData) }}</td>
                      <td class="px-4 py-2 text-sm text-gray-700">{{ w.timesShown }}</td>
                      <td class="px-4 py-2 text-sm text-gray-700">{{ w.timesCorrect }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ w.attemptsUntilFirstCorrect ?? '—' }}</td>
                      <td class="px-4 py-2 text-sm">{{ w.archivedAt ? 'Yes' : 'No' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="studyUserStats.studiedWords.length > 0" class="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span class="text-gray-600">
                  Showing {{ studyWordsFrom }}–{{ studyWordsTo }} of {{ studyUserStats.total ?? 0 }} words
                </span>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm font-medium"
                    :disabled="studyWordsOffset <= 0"
                    @click="studyWordsOffset = Math.max(0, studyWordsOffset - studyWordsLimit); loadStudyUserStats()"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm font-medium"
                    :disabled="studyWordsOffset + studyUserStats.studiedWords.length >= (studyUserStats.total ?? 0)"
                    @click="studyWordsOffset += studyWordsLimit; loadStudyUserStats()"
                  >
                    Next
                  </button>
                </div>
              </div>
              <p v-if="studyUserStats.studiedWords.length === 0 && !studyUserStatsLoading" class="text-gray-500 text-sm mt-2">No studied words for this user.</p>
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

      <!-- Support Tickets Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Support Tickets</h2>
        <button
          type="button"
          @click="showSupportTickets = !showSupportTickets"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {{ showSupportTickets ? 'Hide' : 'Manage Support Tickets' }}
        </button>

        <div v-if="showSupportTickets" class="mt-6 space-y-6">
          <div class="flex flex-wrap gap-3 items-end">
            <div class="w-48">
              <label for="support-status-filter" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="support-status-filter"
                v-model="supportStatusFilter"
                class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                @change="supportOffset = 0; loadSupportTickets()"
              >
                <option value="">All tickets</option>
                <option value="not-closed">Not closed</option>
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="in-progress">In progress</option>
                <option value="closed">Closed</option>
                <option value="wish-list">Wish list</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div class="w-28">
              <label for="support-limit" class="block text-sm font-medium text-gray-700 mb-1">Per page</label>
              <select
                id="support-limit"
                v-model.number="supportLimit"
                class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                @change="supportOffset = 0; loadSupportTickets()"
              >
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
            <div class="flex-1 min-w-48">
              <label for="support-search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                id="support-search"
                v-model="supportSearch"
                type="text"
                class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                placeholder="Email, description, or reference..."
                @input="handleSupportSearchChange"
              />
            </div>
          </div>

          <div v-if="supportTicketsLoading" class="text-center py-8 text-gray-500">Loading tickets...</div>
          <div v-else-if="supportTicketsError" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{{ supportTicketsError }}</div>
          <div v-else>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">ID</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Page</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="t in supportTickets"
                    :key="t.id"
                    class="hover:bg-gray-50 cursor-pointer"
                    @click="loadSupportTicketDetail(t.id)"
                  >
                    <td class="px-4 py-2 text-sm font-mono">{{ t.id.slice(0, 8) }}</td>
                    <td class="px-4 py-2 text-sm text-gray-900">{{ t.email }}</td>
                    <td class="px-4 py-2 text-sm text-gray-600 max-w-[120px] truncate" :title="t.page_url || ''">{{ t.page_url || '—' }}</td>
                    <td class="px-4 py-2 text-sm text-gray-600 max-w-[120px] truncate" :title="t.reference || ''">{{ t.reference || '—' }}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">{{ formatSupportTypes(t) }}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">{{ t.status }}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">{{ formatDate(t.created_at) }}</td>
                    <td class="px-4 py-2 text-sm">
                      <button
                        type="button"
                        class="text-blue-600 hover:text-blue-800"
                        @click.stop="loadSupportTicketDetail(t.id)"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="supportTickets.length === 0" class="text-center py-8 text-gray-500">No tickets found</div>
            <div class="flex items-center justify-between mt-4 text-xs text-gray-500">
              <div>
                <span v-if="supportTicketsTotal">
                  Showing {{ supportTicketsFrom }}–{{ supportTicketsTo }} of {{ supportTicketsTotal }} tickets
                </span>
                <span v-else>No tickets found</span>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 text-xs"
                  :disabled="!hasPrevSupportPage"
                  @click="goToPrevSupportPage"
                >
                  Previous
                </button>
                <button
                  type="button"
                  class="px-2 py-1 border border-gray-300 rounded disabled:opacity-40 text-xs"
                  :disabled="!hasNextSupportPage"
                  @click="goToNextSupportPage"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <!-- Ticket detail -->
          <div v-if="selectedSupportTicket" class="bg-gray-50 rounded-lg p-4 space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-800">Ticket #{{ selectedSupportTicket.ticket.id.slice(0, 8) }}</h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                {{ selectedSupportTicket.ticket.status }}
              </span>
            </div>
            <div class="text-sm text-gray-700 space-y-1">
              <p><strong>Email:</strong> {{ selectedSupportTicket.ticket.email }}</p>
              <p><strong>Page:</strong> {{ selectedSupportTicket.ticket.page_url || '—' }}</p>
              <p v-if="selectedSupportTicket.ticket.reference"><strong>Reference:</strong> {{ selectedSupportTicket.ticket.reference }}</p>
              <p><strong>Type:</strong> {{ formatSupportTypes(selectedSupportTicket.ticket) }}</p>
              <p><strong>Status:</strong> {{ selectedSupportTicket.ticket.status }}</p>
              <p><strong>Created:</strong> {{ formatDate(selectedSupportTicket.ticket.created_at) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-700 mb-1">Description</p>
              <p class="text-gray-700 whitespace-pre-wrap">{{ selectedSupportTicket.ticket.description }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">Thread</p>
              <div class="space-y-3">
                <div
                  v-for="r in selectedSupportTicket.replies"
                  :key="r.id"
                  class="pl-4 border-l-2 border-gray-200"
                >
                  <p class="text-xs font-medium text-gray-500">{{ r.author_type === 'admin' ? 'Admin' : 'User' }}</p>
                  <p class="text-gray-700 whitespace-pre-wrap">{{ r.message }}</p>
                  <p class="text-xs text-gray-400">{{ formatDate(r.created_at) }}</p>
                </div>
              </div>
            </div>
            <div class="space-y-4 w-full max-w-4xl">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Add reply</label>
                <textarea
                  v-model="supportReplyText"
                  rows="6"
                  class="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your reply..."
                />
                <button
                  type="button"
                  :disabled="!supportReplyText.trim() || supportReplySending"
                  class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  @click="sendSupportReply"
                >
                  {{ supportReplySending ? 'Sending...' : 'Send reply' }}
                </button>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  v-model="supportTicketEditStatus"
                  class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  @change="updateSupportTicketStatus"
                >
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In progress</option>
                  <option value="closed">Closed</option>
                  <option value="wish-list">Wish list</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>
            <div v-if="supportTicketMessage" class="p-3 rounded-lg" :class="supportTicketMessageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
              {{ supportTicketMessage }}
            </div>
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
              @click="selectedSupportTicket = null; supportReplyText = ''; supportTicketMessage = ''"
            >
              Close
            </button>
          </div>
        </div>
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
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

const { setSupportView, clearSupportView } = useSupportPageContext()

onMounted(() => setSupportView(SUPPORT_VIEW_NAMES.ADMIN))
onUnmounted(() => clearSupportView())

// Redirect if not admin
watchEffect(() => {
  if (!isAdmin.value) {
    router.push('/')
  }
})

const showUserManagement = ref(false)
const showSupportTickets = ref(false)
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

// Study / Flashcards
const showStudyFlashcards = ref(false)
const studyStats = ref({
  distinctUsers: 0,
  totalProgressRecords: 0,
  totalTimesShown: 0,
  totalTimesCorrect: 0
})
const studyStatsLoading = ref(false)
const studyStatsError = ref('')
const selectedStudyUserId = ref('')
const studyUsers = ref<Array<{ id: string; email: string; name: string | null }>>([])
const studyUserSearch = ref('')
const studyUserOffset = ref(0)
const studyUserLimit = ref(25)
const studyUserTotal = ref(0)
const studyUsersLoading = ref(false)
const studyWordsOffset = ref(0)
const studyWordsLimit = ref(50)
type StudyUserStats = {
  summary: { wordsStudied: number; totalShown: number; totalCorrect: number }
  studiedWords: Array<{
    wordListId: number
    wordData: unknown
    archivedAt: number | null
    timesShown: number
    timesCorrect: number
    attemptsUntilFirstCorrect: number | null
  }>
  total: number
  limit: number
  offset: number
}
const studyUserStats = ref<StudyUserStats | null>(null)
const studyUserStatsLoading = ref(false)
const studyUserStatsError = ref('')

const studyUsersFrom = computed(() => {
  if (studyUserTotal.value === 0 || studyUsers.value.length === 0) return 0
  return studyUserOffset.value + 1
})
const studyUsersTo = computed(() => {
  const end = studyUserOffset.value + studyUsers.value.length
  return Math.min(end, studyUserTotal.value)
})
const studyWordsFrom = computed(() => {
  const s = studyUserStats.value
  if (!s || s.total === 0) return 0
  return s.offset + 1
})
const studyWordsTo = computed(() => {
  const s = studyUserStats.value
  if (!s) return 0
  return s.offset + s.studiedWords.length
})

const studyStatsPercentCorrect = computed(() => {
  const shown = studyStats.value.totalTimesShown
  if (shown <= 0) return '—'
  return `${Math.round((studyStats.value.totalTimesCorrect / shown) * 100)}%`
})

const studyUserStatsPercentCorrect = computed(() => {
  const s = studyUserStats.value?.summary
  if (!s || s.totalShown <= 0) return '—'
  return `${Math.round((s.totalCorrect / s.totalShown) * 100)}%`
})

const loadStudyStats = async () => {
  studyStatsLoading.value = true
  studyStatsError.value = ''
  try {
    const res = await $fetch<{
      distinctUsers: number
      totalProgressRecords: number
      totalTimesShown: number
      totalTimesCorrect: number
    }>('/api/admin/study/stats')
    studyStats.value = res
  } catch (e: any) {
    studyStatsError.value = e.data?.message || 'Failed to load study stats'
  } finally {
    studyStatsLoading.value = false
  }
}

const loadStudyUsers = async () => {
  studyUsersLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('limit', String(studyUserLimit.value))
    params.set('offset', String(studyUserOffset.value))
    if (studyUserSearch.value.trim()) params.set('q', studyUserSearch.value.trim())
    const res = await $fetch<{ users: Array<{ id: string; email: string; name: string | null }>; total: number }>(
      `/api/admin/users?${params}`
    )
    studyUsers.value = res.users ?? []
    studyUserTotal.value = res.total ?? 0
  } catch (e: any) {
    studyUsers.value = []
    studyUserTotal.value = 0
  } finally {
    studyUsersLoading.value = false
  }
}

const loadStudyUserStats = async () => {
  if (!selectedStudyUserId.value) {
    studyUserStats.value = null
    studyUserStatsError.value = ''
    return
  }
  studyUserStatsLoading.value = true
  studyUserStatsError.value = ''
  try {
    const params = new URLSearchParams()
    params.set('limit', String(studyWordsLimit.value))
    params.set('offset', String(studyWordsOffset.value))
    const res = await $fetch<StudyUserStats>(
      `/api/admin/study/users/${selectedStudyUserId.value}?${params}`
    )
    studyUserStats.value = res
  } catch (e: any) {
    studyUserStatsError.value = e.data?.message || 'Failed to load user study data'
    studyUserStats.value = null
  } finally {
    studyUserStatsLoading.value = false
  }
}

function wordEntryWord (wd: unknown): string {
  if (wd && typeof wd === 'object' && wd !== null && 'wordEntry' in wd) {
    const we = (wd as { wordEntry?: { word?: string } }).wordEntry
    if (we && typeof we === 'object' && typeof we.word === 'string') return we.word
  }
  return '—'
}

function wordEntryTranslation (wd: unknown): string {
  if (wd && typeof wd === 'object' && wd !== null && 'wordEntry' in wd) {
    const we = (wd as { wordEntry?: { wordTranslation?: string } }).wordEntry
    if (we && typeof we === 'object' && typeof we.wordTranslation === 'string') return we.wordTranslation
  }
  return '—'
}

watch(showStudyFlashcards, (newVal) => {
  if (newVal) {
    loadStudyUsers()
    loadStudyStats()
  } else {
    selectedStudyUserId.value = ''
    studyUserStats.value = null
  }
})

// Support Tickets
type SupportTicket = {
  id: string
  user_id?: string
  email: string
  page_url: string | null
  reference: string | null
  type_bug: number
  type_suggestion: number
  type_help: number
  description: string
  status: string
  created_at: number
  updated_at: number
}
type SupportReply = { id: string; author_type: string; message: string; created_at: number }
const supportTickets = ref<SupportTicket[]>([])
const supportTicketsLoading = ref(false)
const supportTicketsError = ref('')
const supportStatusFilter = ref('')
const supportSearch = ref('')
const supportLimit = ref(50)
const supportOffset = ref(0)
const supportTicketsTotal = ref(0)
const selectedSupportTicket = ref<{ ticket: SupportTicket; replies: SupportReply[] } | null>(null)
const supportReplyText = ref('')
const supportReplySending = ref(false)
const supportTicketEditStatus = ref('')
const supportTicketMessage = ref('')
const supportTicketMessageType = ref<'success' | 'error'>('success')

const formatSupportTypes = (t: { type_bug: number; type_suggestion: number; type_help: number }) => {
  const parts: string[] = []
  if (t.type_bug) parts.push('Bug')
  if (t.type_suggestion) parts.push('Suggestion')
  if (t.type_help) parts.push('Help')
  return parts.length ? parts.join(', ') : 'General'
}

const loadSupportTickets = async () => {
  supportTicketsLoading.value = true
  supportTicketsError.value = ''
  try {
    const params = new URLSearchParams()
    if (supportStatusFilter.value) params.set('status', supportStatusFilter.value)
    if (supportSearch.value.trim()) params.set('search', supportSearch.value.trim())
    params.set('limit', String(supportLimit.value))
    params.set('offset', String(supportOffset.value))
    const res = await $fetch<{ tickets: SupportTicket[]; total: number; limit: number; offset: number }>(
      `/api/admin/support/tickets?${params}`
    )
    supportTickets.value = res.tickets || []
    supportTicketsTotal.value = res.total
    supportOffset.value = res.offset
  } catch (e: any) {
    supportTicketsError.value = e.data?.message || 'Failed to load tickets'
  } finally {
    supportTicketsLoading.value = false
  }
}

const loadSupportTicketDetail = async (ticketId: string) => {
  try {
    const res = await $fetch<{ ticket: SupportTicket; replies: SupportReply[] }>(
      `/api/admin/support/tickets/${ticketId}`
    )
    selectedSupportTicket.value = { ticket: res.ticket, replies: res.replies || [] }
    supportTicketEditStatus.value = res.ticket.status
    supportReplyText.value = ''
    supportTicketMessage.value = ''
  } catch (e: any) {
    supportTicketMessage.value = e.data?.message || 'Failed to load ticket'
    supportTicketMessageType.value = 'error'
  }
}

const sendSupportReply = async () => {
  if (!selectedSupportTicket.value || !supportReplyText.value.trim()) return
  supportReplySending.value = true
  supportTicketMessage.value = ''
  try {
    await $fetch(`/api/admin/support/tickets/${selectedSupportTicket.value.ticket.id}/reply`, {
      method: 'POST',
      body: { message: supportReplyText.value.trim() }
    })
    supportTicketMessage.value = 'Reply sent'
    supportTicketMessageType.value = 'success'
    supportReplyText.value = ''
    await loadSupportTicketDetail(selectedSupportTicket.value.ticket.id)
  } catch (e: any) {
    supportTicketMessage.value = e.data?.message || 'Failed to send reply'
    supportTicketMessageType.value = 'error'
  } finally {
    supportReplySending.value = false
  }
}

const updateSupportTicketStatus = async () => {
  if (!selectedSupportTicket.value || supportTicketEditStatus.value === selectedSupportTicket.value.ticket.status) return
  supportTicketMessage.value = ''
  try {
    await $fetch(`/api/admin/support/tickets/${selectedSupportTicket.value.ticket.id}`, {
      method: 'PUT',
      body: { status: supportTicketEditStatus.value }
    })
    supportTicketMessage.value = 'Status updated'
    supportTicketMessageType.value = 'success'
    selectedSupportTicket.value = {
      ...selectedSupportTicket.value,
      ticket: { ...selectedSupportTicket.value.ticket, status: supportTicketEditStatus.value }
    }
  } catch (e: any) {
    supportTicketMessage.value = e.data?.message || 'Failed to update status'
    supportTicketMessageType.value = 'error'
  }
}

const supportTicketsFrom = computed(() =>
  supportTicketsTotal.value ? supportOffset.value + 1 : 0
)
const supportTicketsTo = computed(() =>
  supportTicketsTotal.value ? Math.min(supportOffset.value + supportTickets.value.length, supportTicketsTotal.value) : 0
)
const hasPrevSupportPage = computed(() => supportOffset.value > 0)
const hasNextSupportPage = computed(() => supportOffset.value + supportTickets.value.length < supportTicketsTotal.value)
const goToPrevSupportPage = async () => {
  if (!hasPrevSupportPage.value) return
  supportOffset.value = Math.max(0, supportOffset.value - supportLimit.value)
  await loadSupportTickets()
}
const goToNextSupportPage = async () => {
  if (!hasNextSupportPage.value) return
  supportOffset.value += supportLimit.value
  await loadSupportTickets()
}
let supportSearchTimeout: ReturnType<typeof setTimeout> | null = null
const handleSupportSearchChange = () => {
  if (supportSearchTimeout) clearTimeout(supportSearchTimeout)
  supportSearchTimeout = setTimeout(() => {
    supportOffset.value = 0
    loadSupportTickets()
  }, 300)
}
watch(showSupportTickets, (newVal) => {
  if (newVal) loadSupportTickets()
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
