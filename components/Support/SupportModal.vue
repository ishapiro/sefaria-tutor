<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
}>()

const route = useRoute()
const { loggedIn, user } = useAuth()
const { supportPageContext } = useSupportPageContext()

type View = 'not-logged-in' | 'options' | 'my-tickets' | 'ticket-detail' | 'new-ticket'

const view = ref<View>('options')
const tickets = ref<Array<{
  id: string
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
}>>([])
const selectedTicket = ref<{
  ticket: typeof tickets.value[0]
  replies: Array<{ id: string; author_type: string; message: string; created_at: number }>
} | null>(null)
const ticketsLoading = ref(false)
const ticketsError = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const submitLoading = ref(false)
const submitError = ref('')

const userEmail = computed(() => {
  const u = (user as any)?.value ?? user
  return u?.email || ''
})

const pageUrl = ref('')
const reference = ref('')

const newTicketForm = ref({
  typeBug: false,
  typeSuggestion: false,
  typeHelp: false,
  description: ''
})

function formatTypes(t: { type_bug: number; type_suggestion: number; type_help: number }) {
  const parts: string[] = []
  if (t.type_bug) parts.push('Bug')
  if (t.type_suggestion) parts.push('Suggestion')
  if (t.type_help) parts.push('Help')
  return parts.length ? parts.join(', ') : 'General'
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString()
}

function close() {
  emit('update:open', false)
  view.value = 'options'
  selectedTicket.value = null
  submitError.value = ''
}

function showOptions() {
  view.value = 'options'
  selectedTicket.value = null
}

async function loadTickets() {
  ticketsLoading.value = true
  ticketsError.value = ''
  try {
    const res = await $fetch<{ tickets: typeof tickets.value }>('/api/support/tickets')
    tickets.value = res.tickets || []
  } catch (e: any) {
    ticketsError.value = e.data?.message || 'Failed to load tickets'
  } finally {
    ticketsLoading.value = false
  }
}

function openMyTickets() {
  view.value = 'my-tickets'
  loadTickets()
}

function openNewTicket() {
  const path = route.fullPath || route.path || '/'
  const ctx = supportPageContext.value
  let refText = ''
  if (ctx?.sefariaRef && path === '/') {
    refText = ctx.sefariaRef.replace(/_/g, ' ').replace(/\./g, ':')
    reference.value = refText
  } else {
    reference.value = ''
  }
  // When on home index, add view/reference in () so support knows what the user was viewing
  if (path === '/' && (refText || ctx?.viewName)) {
    const contextPart = refText && ctx?.viewName ? `${ctx.viewName}: ${refText}` : (refText || ctx?.viewName || '')
    pageUrl.value = `/${contextPart ? ` (${contextPart})` : ''}`
  } else {
    pageUrl.value = path
  }
  newTicketForm.value = { typeBug: false, typeSuggestion: false, typeHelp: false, description: '' }
  view.value = 'new-ticket'
  submitError.value = ''
}

async function openTicketDetail(ticketId: string) {
  detailLoading.value = true
  detailError.value = ''
  try {
    const res = await $fetch<{ ticket: typeof tickets.value[0]; replies: any[] }>(`/api/support/tickets/${ticketId}`)
    selectedTicket.value = { ticket: res.ticket, replies: res.replies || [] }
    view.value = 'ticket-detail'
  } catch (e: any) {
    detailError.value = e.data?.message || 'Failed to load ticket'
  } finally {
    detailLoading.value = false
  }
}

async function submitNewTicket() {
  const { typeBug, typeSuggestion, typeHelp, description } = newTicketForm.value
  if (!typeBug && !typeSuggestion && !typeHelp) {
    submitError.value = 'Please select at least one type: Bug, Suggestion, or Help'
    return
  }
  if (!description.trim()) {
    submitError.value = 'Description is required'
    return
  }
  submitLoading.value = true
  submitError.value = ''
  try {
    await $fetch('/api/support/tickets', {
      method: 'POST',
      body: {
        pageUrl: pageUrl.value,
        reference: reference.value || undefined,
        typeBug,
        typeSuggestion,
        typeHelp,
        description: description.trim()
      }
    })
    view.value = 'my-tickets'
    loadTickets()
  } catch (e: any) {
    submitError.value = e.data?.message || 'Failed to create ticket'
  } finally {
    submitLoading.value = false
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (!loggedIn.value) {
      view.value = 'not-logged-in'
    } else {
      view.value = 'options'
    }
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="close"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto"
        role="dialog"
        aria-labelledby="support-modal-title"
      >
        <!-- Not logged in -->
        <div v-if="view === 'not-logged-in'" class="p-6">
          <h2 id="support-modal-title" class="text-lg font-semibold text-gray-900 mb-4">Support</h2>
          <p class="text-gray-700 mb-4">
            Support is provided for registered users. Registration is completely free and only requires an email address.
          </p>
          <p class="text-gray-700 mb-6">
            To register: go to <strong>Login</strong> in the top navigation, then click &quot;register a new account&quot;.
          </p>
          <div class="flex gap-3 justify-end">
            <NuxtLink
              to="/login"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              @click="close"
            >
              Login / Register
            </NuxtLink>
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              @click="close"
            >
              Close
            </button>
          </div>
        </div>

        <!-- Logged in - options -->
        <div v-else-if="view === 'options'" class="p-6">
          <h2 id="support-modal-title" class="text-lg font-semibold text-gray-900 mb-4">Support</h2>
          <div class="space-y-3">
            <button
              type="button"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left font-medium"
              @click="openMyTickets"
            >
              Existing tickets
            </button>
            <button
              type="button"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left font-medium"
              @click="openNewTicket"
            >
              New ticket
            </button>
          </div>
          <div class="mt-6 flex justify-end">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              @click="close"
            >
              Close
            </button>
          </div>
        </div>

        <!-- My tickets -->
        <div v-else-if="view === 'my-tickets'" class="p-6">
          <h2 id="support-modal-title" class="text-lg font-semibold text-gray-900 mb-4">My support tickets</h2>
          <div v-if="ticketsLoading" class="py-8 text-center text-gray-500">Loading tickets...</div>
          <div v-else-if="ticketsError" class="py-4 bg-red-50 text-red-700 rounded-lg px-4">{{ ticketsError }}</div>
          <div v-else-if="tickets.length === 0" class="py-8 text-center text-gray-600">
            You have no tickets yet. Click New ticket to create one.
          </div>
          <div v-else class="space-y-2 max-h-64 overflow-auto">
            <button
              v-for="t in tickets"
              :key="t.id"
              type="button"
              class="w-full px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left flex justify-between items-center"
              @click="openTicketDetail(t.id)"
            >
              <span class="text-sm font-medium truncate flex-1 mr-2">#{{ t.id.slice(0, 8) }} — {{ formatTypes(t) }}</span>
              <span class="text-xs text-gray-500 shrink-0">{{ t.status }}</span>
              <span class="text-xs text-gray-400 shrink-0 ml-2">{{ formatDate(t.created_at) }}</span>
            </button>
          </div>
          <div class="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              @click="openNewTicket"
            >
              New ticket
            </button>
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              @click="showOptions"
            >
              Back
            </button>
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              @click="close"
            >
              Close
            </button>
          </div>
        </div>

        <!-- Ticket detail -->
        <div v-else-if="view === 'ticket-detail' && selectedTicket" class="p-6">
          <h2 id="support-modal-title" class="text-lg font-semibold text-gray-900 mb-4">
            Ticket #{{ selectedTicket.ticket.id.slice(0, 8) }}
          </h2>
          <div class="text-sm text-gray-600 space-y-1 mb-4">
            <p><strong>Type:</strong> {{ formatTypes(selectedTicket.ticket) }}</p>
            <p><strong>Status:</strong> {{ selectedTicket.ticket.status }}</p>
            <p><strong>Page:</strong> {{ selectedTicket.ticket.page_url || 'N/A' }}</p>
            <p v-if="selectedTicket.ticket.reference"><strong>Reference:</strong> {{ selectedTicket.ticket.reference }}</p>
            <p><strong>Created:</strong> {{ formatDate(selectedTicket.ticket.created_at) }}</p>
          </div>
          <div class="border-t pt-4 space-y-4">
            <div>
              <p class="text-xs font-medium text-gray-500 mb-1">Your message</p>
              <p class="text-gray-700 whitespace-pre-wrap">{{ selectedTicket.ticket.description }}</p>
            </div>
            <div
              v-for="r in selectedTicket.replies"
              :key="r.id"
              class="pl-4 border-l-2 border-gray-200"
            >
              <p class="text-xs font-medium text-gray-500 mb-1">{{ r.author_type === 'admin' ? 'Support' : 'You' }}</p>
              <p class="text-gray-700 whitespace-pre-wrap">{{ r.message }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ formatDate(r.created_at) }}</p>
            </div>
          </div>
          <div class="mt-6">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              @click="openMyTickets"
            >
              Back to my tickets
            </button>
          </div>
        </div>

        <!-- New ticket form -->
        <div v-else-if="view === 'new-ticket'" class="p-6">
          <h2 id="support-modal-title" class="text-lg font-semibold text-gray-900 mb-4">New support ticket</h2>
          <form class="space-y-4" @submit.prevent="submitNewTicket">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="text"
                :value="userEmail"
                readonly
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Page</label>
              <input
                type="text"
                :value="pageUrl"
                readonly
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 text-sm truncate"
              />
            </div>
            <div v-if="reference">
              <label class="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input
                type="text"
                :value="reference"
                readonly
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div class="flex flex-wrap gap-4">
                <label class="flex items-center gap-2">
                  <input v-model="newTicketForm.typeBug" type="checkbox" class="w-4 h-4 text-indigo-600" />
                  <span>Bug</span>
                </label>
                <label class="flex items-center gap-2">
                  <input v-model="newTicketForm.typeSuggestion" type="checkbox" class="w-4 h-4 text-indigo-600" />
                  <span>Suggestion</span>
                </label>
                <label class="flex items-center gap-2">
                  <input v-model="newTicketForm.typeHelp" type="checkbox" class="w-4 h-4 text-indigo-600" />
                  <span>Help</span>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="newTicketForm.description"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe your issue or question..."
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <input type="text" value="new" readonly class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 max-w-[100px]" />
            </div>
            <div v-if="submitError" class="text-sm text-red-600">{{ submitError }}</div>
            <div class="flex gap-3">
              <button
                type="submit"
                :disabled="submitLoading"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {{ submitLoading ? 'Submitting...' : 'Submit' }}
              </button>
              <button
                type="button"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                @click="showOptions"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
