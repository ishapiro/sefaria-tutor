import { TRANSLATION_PRIMARY_MODEL } from '~/utils/model-defaults'

/**
 * The OpenAI model currently in use for translation, shared between the page
 * that discovers it and the layout footer that displays it.
 */
export function useOpenAiModel () {
  return useState<string>('openai-model', () => TRANSLATION_PRIMARY_MODEL)
}
