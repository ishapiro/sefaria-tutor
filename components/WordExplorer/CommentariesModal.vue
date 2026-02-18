<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/50 overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
      <div class="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <h3 class="text-sm font-semibold text-gray-900 min-w-0">
          Commentaries &amp; links
          <span v-if="refDisplay" class="font-normal text-gray-500 ml-1">({{ refDisplay }})</span>
        </h3>
        <button
          type="button"
          class="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          aria-label="Close"
          @click="$emit('close')"
        >
          <span class="text-lg leading-none">×</span>
        </button>
      </div>
      <!-- Mobile: size to content (no flex-1) to avoid bottom white space. Desktop: fill and scroll (flex-1 min-h-0). -->
      <div class="overflow-y-auto max-h-[70vh] sm:max-h-none sm:flex-1 sm:min-h-0 p-4">
        <div v-if="loading" class="text-gray-500 py-4">Loading…</div>
        <template v-else>
          <div v-if="!list.length && !additionalLinks.length" class="text-gray-500 py-4">No related commentaries or links for this reference.</div>
          <template v-else>
            <ul v-if="list.length" class="space-y-1.5 sm:space-y-3">
              <li
                v-for="(link, idx) in list"
                :key="'c-' + link.ref + String(idx)"
                class="border border-gray-100 rounded-md sm:rounded-lg px-2.5 py-2 sm:p-3 hover:bg-blue-50/50 hover:border-blue-200 transition-colors active:bg-blue-100"
              >
                <button
                  type="button"
                  class="w-full text-left touch-manipulation min-h-[40px] sm:min-h-[44px] py-0.5 sm:py-1"
                  @click="$emit('select-link', link)"
                >
                  <div class="font-medium text-blue-700 text-sm sm:text-base">{{ link.index_title }}</div>
                  <div class="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">{{ link.ref }}</div>
                  <p
                    v-if="getLinkDisplayText(link)"
                    class="text-xs sm:text-sm text-gray-600 sm:text-gray-700 mt-1.5 sm:mt-2 line-clamp-1 sm:line-clamp-2"
                    :style="(!link.text?.length && link.he) ? 'direction: rtl' : undefined"
                    v-html="sanitizeSefariaVerseHtml(getLinkDisplayText(link))"
                  />
                </button>
              </li>
            </ul>
            <div v-if="additionalLinks.length" class="mt-4 pt-3 border-t border-gray-200">
              <button
                type="button"
                class="w-full text-left px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-md sm:rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm sm:text-base touch-manipulation"
                @click="showAdditionalLinks = !showAdditionalLinks"
              >
                {{ showAdditionalLinks ? 'Hide additional links' : 'Additional links' }}
                <span class="text-gray-500 font-normal ml-1">({{ additionalLinks.length }})</span>
              </button>
              <ul v-show="showAdditionalLinks" class="mt-2 space-y-1.5 sm:space-y-3">
                <li
                  v-for="(link, idx) in additionalLinks"
                  :key="'a-' + link.ref + String(idx)"
                  class="border border-gray-100 rounded-md sm:rounded-lg px-2.5 py-2 sm:p-3 hover:bg-blue-50/50 hover:border-blue-200 transition-colors active:bg-blue-100"
                >
                  <button
                    type="button"
                    class="w-full text-left touch-manipulation min-h-[40px] sm:min-h-[44px] py-0.5 sm:py-1"
                    @click="$emit('select-link', link)"
                  >
                    <div class="font-medium text-blue-700 text-sm sm:text-base">{{ link.index_title }}</div>
                    <div class="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">{{ link.ref }}</div>
                    <p
                      v-if="getLinkDisplayText(link)"
                      class="text-xs sm:text-sm text-gray-600 sm:text-gray-700 mt-1.5 sm:mt-2 line-clamp-1 sm:line-clamp-2"
                      :style="(!link.text?.length && link.he) ? 'direction: rtl' : undefined"
                      v-html="sanitizeSefariaVerseHtml(getLinkDisplayText(link))"
                    />
                  </button>
                </li>
              </ul>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { sanitizeSefariaVerseHtml } from '~/utils/text'

export interface CommentariesLink {
  ref: string
  index_title: string
  type?: string
  category?: string
  text?: string[] | string[][]
  he?: string
}

const props = withDefaults(defineProps<{
  open: boolean
  refDisplay: string | null
  loading: boolean
  list: CommentariesLink[]
  additionalLinks?: CommentariesLink[]
}>(), { additionalLinks: () => [] })

const showAdditionalLinks = ref(false)
watch(() => props.open, (isOpen) => { if (!isOpen) showAdditionalLinks.value = false })

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
