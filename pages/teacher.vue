<template>
  <div class="container mx-auto p-3 sm:p-4 max-w-5xl">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-800">🏫 Teacher Dashboard</h1>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-2 py-1 text-xs font-medium border border-green-500 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-green-50 hover:border-green-600"
          @click="showUsageModal = true"
        >
          Usage
        </button>
        <NuxtLink to="/" class="text-blue-600 hover:underline flex items-center gap-1 min-h-[44px] items-center text-sm">
          ← Back to App
        </NuxtLink>
      </div>
    </div>

    <div v-if="!loggedIn || !isTeacher" class="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
      <p class="font-semibold">Teacher access required</p>
      <p class="mt-1 text-sm">Your account must have the teacher role to access this page.</p>
    </div>

    <div v-else class="space-y-6">

      <!-- Class selector + create -->
      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 class="text-lg font-semibold text-gray-800">My Classes</h2>
          <button
            type="button"
            class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            @click="showCreateClassModal = true"
          >
            + New Class
          </button>
        </div>

        <div v-if="classesLoading" class="text-gray-500 text-sm py-4">Loading…</div>
        <div v-else-if="classes.length === 0" class="text-gray-500 text-sm py-4">No classes yet. Create your first class above.</div>
        <div v-else class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="cls in classes"
            :key="cls.id"
            type="button"
            class="px-4 py-2 text-sm rounded-lg border transition-colors"
            :class="activeClassId === cls.id
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'"
            @click="selectClass(cls.id)"
          >
            {{ cls.name }}
            <span class="text-xs opacity-70 ml-1">({{ cls.studentCount }})</span>
          </button>
        </div>

        <!-- Active class details -->
        <div v-if="activeClass" class="space-y-3">
          <div class="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p class="text-xs text-gray-500">Invite Code</p>
              <p class="text-lg font-mono font-bold tracking-widest text-indigo-700">{{ activeClass.inviteCode }}</p>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100"
              @click="copyInviteCode(activeClass.inviteCode)"
            >
              {{ copiedCode ? 'Copied!' : 'Copy' }}
            </button>
            <div class="ml-auto">
              <button
                type="button"
                class="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                @click="confirmDeleteClass(activeClass.id)"
              >
                Delete Class
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Students roster -->
      <section v-if="activeClassId" class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">Students</h2>
        <div v-if="studentsLoading" class="text-gray-500 text-sm py-4">Loading students…</div>
        <div v-else-if="students.length === 0" class="text-gray-500 text-sm py-4">No students have joined this class yet. Share the invite code above.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th class="pb-2 pr-4">Name / Email</th>
                <th class="pb-2 pr-4 text-center">Words Studied</th>
                <th class="pb-2 pr-4 text-center">Correct</th>
                <th class="pb-2 pr-4 text-center">Shown</th>
                <th class="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="student in students"
                :key="student.id"
                class="border-b border-gray-100 hover:bg-gray-50"
              >
                <td class="py-2.5 pr-4">
                  <p class="font-medium text-gray-800">{{ student.name || student.email }}</p>
                  <p v-if="student.name" class="text-xs text-gray-400">{{ student.email }}</p>
                </td>
                <td class="py-2.5 pr-4 text-center text-gray-700">{{ student.wordsStudied }}</td>
                <td class="py-2.5 pr-4 text-center text-green-700">{{ student.totalCorrect }}</td>
                <td class="py-2.5 pr-4 text-center text-gray-500">{{ student.totalShown }}</td>
                <td class="py-2.5">
                  <button
                    type="button"
                    class="text-xs text-red-500 hover:text-red-700 hover:underline"
                    @click="removeStudent(student.id)"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Progress matrix for a shared list -->
      <section v-if="activeClassId" class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <h2 class="text-lg font-semibold text-gray-800">Word List Progress</h2>
          <select
            v-if="sharedLists.length > 0"
            v-model="selectedListId"
            class="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          >
            <option :value="null">All shared lists</option>
            <option v-for="list in sharedLists" :key="list.id" :value="list.id">{{ list.name }}</option>
          </select>
        </div>

        <div v-if="progressLoading" class="text-gray-500 text-sm py-4">Loading progress…</div>
        <div v-else-if="sharedLists.length === 0" class="text-gray-500 text-sm py-4">
          No lists are shared with this class yet. Share a word list from your Word List modal.
        </div>
        <div v-else-if="progressMatrix.length === 0" class="text-gray-500 text-sm py-4">No progress data yet.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-200 text-left">
                <th class="pb-2 pr-3 font-semibold text-gray-500">Word</th>
                <th
                  v-for="student in progressStudents"
                  :key="student.id"
                  class="pb-2 px-2 font-semibold text-gray-500 text-center truncate max-w-[80px]"
                  :title="student.email"
                >
                  {{ student.name || student.email.split('@')[0] }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="word in progressWords"
                :key="word.wordId"
                class="border-b border-gray-50 hover:bg-gray-50"
              >
                <td class="py-1.5 pr-3 font-medium text-blue-700" style="direction: rtl">
                  {{ word.word || '—' }}
                  <span class="text-gray-500 font-normal text-xs" style="direction: ltr"> {{ word.wordTranslation }}</span>
                </td>
                <td
                  v-for="student in progressStudents"
                  :key="student.id"
                  class="py-1.5 px-2 text-center"
                  :title="`${student.name || student.email}: ${getCellData(word.wordId, student.id)?.timesCorrect ?? 0} correct / ${getCellData(word.wordId, student.id)?.timesShown ?? 0} shown`"
                >
                  <span v-if="!getCellData(word.wordId, student.id)?.timesShown" class="text-gray-300">—</span>
                  <span v-else-if="getCellData(word.wordId, student.id)!.timesCorrect > 0" class="text-green-600">✅</span>
                  <span v-else class="text-amber-500">⭕</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Create Class modal -->
    <div
      v-if="showCreateClassModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="showCreateClassModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 class="text-base font-semibold text-gray-900">Create New Class</h3>
        <input
          v-model="newClassName"
          type="text"
          maxlength="100"
          placeholder="Class name"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          @keyup.enter="createClass"
        />
        <div class="flex justify-end gap-2">
          <button type="button" class="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50" @click="showCreateClassModal = false; newClassName = ''">Cancel</button>
          <button type="button" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50" :disabled="!newClassName.trim()" @click="createClass">Create</button>
        </div>
      </div>
    </div>

    <!-- Delete class confirmation -->
    <div
      v-if="classToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="classToDelete = null"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 class="text-base font-semibold text-gray-900">Delete Class</h3>
        <p class="text-sm text-gray-700">Delete <strong>{{ classes.find(c => c.id === classToDelete)?.name }}</strong>? All students will be removed. This cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50" @click="classToDelete = null">Cancel</button>
          <button type="button" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700" @click="deleteClass">Delete</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Usage modal -->
  <div
    v-if="showUsageModal"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
    @click.self="showUsageModal = false"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 class="text-sm font-semibold text-gray-900">Usage</h3>
        <button
          type="button"
          class="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close"
          @click="showUsageModal = false"
        >
          <span class="text-lg leading-none">×</span>
        </button>
      </div>
      <div class="p-4 overflow-y-auto text-sm text-gray-600 space-y-4">
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">My Classes</h4>
          <p>
            Click <strong>+ New Class</strong> to create a class — each class gets a unique invite code. Share that code with your students; they enter it on their <strong>Settings</strong> page to join. You can have multiple classes and switch between them using the class buttons. Use <strong>Delete Class</strong> to permanently remove a class and unenroll all its students.
          </p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">Students</h4>
          <p>
            The student roster shows everyone who has joined the selected class, along with their all-time study stats: words studied (distinct words), correct answers, and total card views. Use <strong>Remove</strong> to unenroll a student — they can rejoin with the same invite code if needed.
          </p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">Sharing Word Lists with the Class</h4>
          <p>
            To share a word list with your class, go to <strong>My Word List</strong> (from any book page), select a named list, and click <strong>📚 Share with Class</strong>. Students will see the shared list automatically in their own My Word List as a read-only class list. You can share multiple lists with the same class.
          </p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">Word List Progress</h4>
          <p>
            Once a list is shared with a class, the progress matrix shows each word as a row and each student as a column. <strong>✅</strong> means the student answered correctly at least once; <strong>⭕</strong> means they've attempted it but not gotten it right yet; <strong>—</strong> means they haven't studied it at all. Hover over any cell to see exact correct/shown counts. Use the dropdown to filter by a specific shared list.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { loggedIn, isTeacher } = useAuth()

const classes = ref<Array<{ id: string; name: string; inviteCode: string; createdAt: number; studentCount: number }>>([])
const classesLoading = ref(false)
const activeClassId = ref<string | null>(null)
const showUsageModal = ref(false)
const showCreateClassModal = ref(false)
const newClassName = ref('')
const classToDelete = ref<string | null>(null)
const copiedCode = ref(false)

const students = ref<Array<{ id: string; name: string | null; email: string; joinedAt: number; wordsStudied: number; totalCorrect: number; totalShown: number }>>([])
const studentsLoading = ref(false)

const sharedLists = ref<Array<{ id: number; name: string }>>([])
const selectedListId = ref<number | null>(null)
const progressLoading = ref(false)
const progressRows = ref<Array<{
  wordId: number; listId: number | null; word: string | null; wordTranslation: string | null
  studentId: string; studentName: string | null; studentEmail: string
  timesShown: number; timesCorrect: number; attemptsUntilFirstCorrect: number | null
}>>([])

const activeClass = computed(() => classes.value.find(c => c.id === activeClassId.value) ?? null)

const progressStudents = computed(() => {
  const seen = new Set<string>()
  return progressRows.value.filter(r => {
    if (seen.has(r.studentId)) return false
    seen.add(r.studentId); return true
  }).map(r => ({ id: r.studentId, name: r.studentName, email: r.studentEmail }))
})

const progressWords = computed(() => {
  const seen = new Set<number>()
  return progressRows.value.filter(r => {
    if (seen.has(r.wordId)) return false
    seen.add(r.wordId); return true
  }).map(r => ({ wordId: r.wordId, word: r.word, wordTranslation: r.wordTranslation }))
})

function getCellData(wordId: number, studentId: string) {
  return progressRows.value.find(r => r.wordId === wordId && r.studentId === studentId) ?? null
}

async function fetchClasses() {
  classesLoading.value = true
  try {
    const res = await $fetch<{ classes: typeof classes.value }>('/api/teacher/classes')
    classes.value = res.classes || []
    if (classes.value.length > 0 && !activeClassId.value) {
      await selectClass(classes.value[0].id)
    }
  } finally {
    classesLoading.value = false
  }
}

async function selectClass(id: string) {
  activeClassId.value = id
  selectedListId.value = null
  await Promise.all([fetchStudents(id), fetchSharedLists(id), fetchProgress(id, null)])
}

async function fetchStudents(classId: string) {
  studentsLoading.value = true
  try {
    const res = await $fetch<{ students: typeof students.value }>(`/api/teacher/classes/${classId}/students`)
    students.value = res.students || []
  } finally {
    studentsLoading.value = false
  }
}

async function fetchSharedLists(classId: string) {
  try {
    const res = await $fetch<{ lists: Array<{ id: number; name: string; isClassShared?: boolean }> }>('/api/word-lists')
    // Filter to only lists shared with this class
    const listsRes = await $fetch<{ lists: Array<{ id: number; name: string }> }>('/api/word-lists')
    sharedLists.value = (listsRes.lists || []).filter((l: any) => !l.isShared)
  } catch {}
}

async function fetchProgress(classId: string, listId: number | null) {
  progressLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (listId !== null) params.listId = String(listId)
    const res = await $fetch<{ progress: typeof progressRows.value }>(`/api/teacher/classes/${classId}/progress`, { params })
    progressRows.value = res.progress || []
  } finally {
    progressLoading.value = false
  }
}

watch(selectedListId, (listId) => {
  if (activeClassId.value) fetchProgress(activeClassId.value, listId)
})

async function createClass() {
  const name = newClassName.value.trim()
  if (!name) return
  try {
    const cls = await $fetch<{ id: string; name: string; inviteCode: string; createdAt: number; studentCount: number }>(
      '/api/teacher/classes', { method: 'POST', body: { name } }
    )
    classes.value.push(cls)
    showCreateClassModal.value = false
    newClassName.value = ''
    await selectClass(cls.id)
  } catch (err: any) {
    alert(err?.data?.message || 'Failed to create class')
  }
}

function confirmDeleteClass(id: string) {
  classToDelete.value = id
}

async function deleteClass() {
  const id = classToDelete.value
  if (!id) return
  try {
    await $fetch(`/api/teacher/classes/${id}`, { method: 'DELETE' })
    classes.value = classes.value.filter(c => c.id !== id)
    classToDelete.value = null
    if (activeClassId.value === id) {
      activeClassId.value = classes.value[0]?.id ?? null
      if (activeClassId.value) await selectClass(activeClassId.value)
      else { students.value = []; progressRows.value = [] }
    }
  } catch (err: any) {
    alert(err?.data?.message || 'Failed to delete class')
  }
}

async function removeStudent(userId: string) {
  if (!activeClassId.value) return
  try {
    await $fetch(`/api/teacher/classes/${activeClassId.value}/students/${userId}`, { method: 'DELETE' })
    students.value = students.value.filter(s => s.id !== userId)
  } catch (err: any) {
    alert(err?.data?.message || 'Failed to remove student')
  }
}

async function copyInviteCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    copiedCode.value = true
    setTimeout(() => { copiedCode.value = false }, 2000)
  } catch {}
}

onMounted(() => {
  if (loggedIn.value && isTeacher.value) fetchClasses()
})

watch(loggedIn, (v) => { if (v && isTeacher.value) fetchClasses() })
</script>
