import { defineEventHandler } from 'h3'
import { getMsPerWord, getGrammarMs } from '~/server/utils/system-settings'

export default defineEventHandler(async (event) => {
  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  const [msPerWord, grammarMs] = await Promise.all([getMsPerWord(db), getGrammarMs(db)])
  return {
    msPerWord: Math.ceil(msPerWord),
    secondsPerWord: Math.ceil(msPerWord / 1000),
    grammarMs: Math.ceil(grammarMs),
  }
})
