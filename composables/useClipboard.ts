import { ref } from 'vue'
import { copyToClipboard } from '~/utils/clipboard'

const COPIED_RESET_MS = 2000

/**
 * Composable for copy-to-clipboard with temporary "copied" feedback.
 * Returns copiedStatus (ref) and copy(text, id) to copy and show id for COPIED_RESET_MS.
 */
export function useClipboard () {
  const copiedStatus = ref<string | null>(null)

  async function copy (text: string, id: string) {
    await copyToClipboard(text)
    copiedStatus.value = id
    setTimeout(() => {
      if (copiedStatus.value === id) {
        copiedStatus.value = null
      }
    }, COPIED_RESET_MS)
  }

  return { copiedStatus, copy }
}
