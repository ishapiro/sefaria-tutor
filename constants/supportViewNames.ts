/**
 * Canonical view names for support ticket context.
 * One unique name per Vue component that represents a user-visible view.
 * Used so support tickets record which screen/modal the user was viewing.
 */
export const SUPPORT_VIEW_NAMES = {
  // Pages
  BOOK_BROWSER: 'Book Browser',
  BOOK_READER: 'Book Reader',
  ADMIN: 'Admin',
  LOGIN: 'Login',
  RESET_PASSWORD: 'Reset Password',
  DICTIONARY: 'Dictionary',

  // Modals / overlays
  MY_WORD_LIST: 'My Word List',
  MY_NOTES: 'My Notes',
  NOTE_EDITOR: 'Note Editor',
  TRANSLATION: 'Translation',
  HELP: 'Help',
  DEBUG: 'Debug',
} as const

export type SupportViewName = (typeof SUPPORT_VIEW_NAMES)[keyof typeof SUPPORT_VIEW_NAMES]
