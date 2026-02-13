import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

/**
 * Shared state for support ticket context when on a text page (Word Explorer).
 * Pages and modals set their view name via setSupportView(); the Support modal
 * reads this to include view and Sefaria ref in tickets.
 */
export interface SupportPageContext {
  sefariaRef: string | null
  bookTitle: string | null
  bookPath: string | null
  /** Name of the current view/modal (e.g. "Book Reader", "My Word List") for support context */
  viewName: string | null
}

export { SUPPORT_VIEW_NAMES }

export function useSupportPageContext() {
  const state = useState<SupportPageContext | null>('support-page-context', () => null)

  function setSupportView(
    viewName: string,
    overrides?: Partial<Pick<SupportPageContext, 'sefariaRef' | 'bookTitle' | 'bookPath'>>
  ) {
    state.value = {
      viewName,
      sefariaRef: overrides?.sefariaRef ?? null,
      bookTitle: overrides?.bookTitle ?? null,
      bookPath: overrides?.bookPath ?? null
    }
  }

  function clearSupportView() {
    state.value = null
  }

  /** Update only ref fields (e.g. from index when in Book Reader). Keeps existing viewName. */
  function updateSupportRefs(refs: Partial<Pick<SupportPageContext, 'sefariaRef' | 'bookTitle' | 'bookPath'>>) {
    const current = state.value
    state.value = current
      ? { ...current, ...refs }
      : { viewName: null, sefariaRef: null, bookTitle: null, bookPath: null, ...refs }
  }

  return {
    supportPageContext: state,
    setSupportView,
    clearSupportView,
    updateSupportRefs
  }
}
