/**
 * Copy text to the clipboard. Uses Clipboard API with execCommand fallback.
 */
export async function copyToClipboard (text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    if (typeof document === 'undefined') return
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
