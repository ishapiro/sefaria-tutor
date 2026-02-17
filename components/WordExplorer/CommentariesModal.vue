<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/50 overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
      <div class="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <h3 class="text-sm font-semibold text-gray-900">
          Commentaries &amp; links
          <span v-if="refDisplay" class="font-normal text-gray-500 ml-1">({{ refDisplay }})</span>
        </h3>
        <button
          type="button"
          class="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close"
          @click="$emit('close')"
        >
          <span class="text-lg leading-none">×</span>
        </button>
      </div>
      <div class="p-4 overflow-y-auto flex-1 min-h-0">
        <div v-if="loading" class="text-gray-500 py-4">Loading…</div>
        <div v-else-if="!list.length" class="text-gray-500 py-4">No related commentaries or links for this reference.</div>
        <ul v-else class="space-y-3">
          <li
            v-for="(link, idx) in list"
            :key="link.ref + String(idx)"
            class="border border-gray-100 rounded-lg p-3 hover:bg-blue-50/50 hover:border-blue-200 transition-colors active:bg-blue-100"
          >
            <button
              type="button"
              class="w-full text-left touch-manipulation min-h-[44px] py-1"
              @click="$emit('select-link', link)"
            >
              <div class="font-medium text-blue-700">{{ link.index_title }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ link.ref }}</div>
              <p
                v-if="getLinkDisplayText(link)"
                class="text-sm text-gray-700 mt-2 line-clamp-2"
                :style="(!link.text?.length && link.he) ? 'direction: rtl' : undefined"
                v-html="sanitizeSefariaVerseHtml(getLinkDisplayText(link))"
              />
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { sanitizeSefariaVerseHtml } from '~/utils/text'

export interface CommentariesLink {
  ref: string
  index_title: string
  type?: string
  category?: string
  text?: string[] | string[][]
  he?: string
}

const props = defineProps<{
  open: boolean
  refDisplay: string | null
  loading: boolean
  list: CommentariesLink[]
}>()

defineEmits<{
  close: []
  'select-link': [link: CommentariesLink]
}>()

/** First displayable text from a link (Sefaria may return nested JaggedArray). */
function getLinkDisplayText (link: { text?: string[] | string[][]; he?: string }): string {
  const t = link.text
  if (Array.isArray(t) && t.length > 0) {
    const first = t[0]
    return typeof first === 'string' ? first : (Array.isArray(first) && first.length > 0 ? String(first[0]) : '')
  }
  return link.he ?? ''
}
</script>
