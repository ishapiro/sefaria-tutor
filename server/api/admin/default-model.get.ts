import { createError, defineEventHandler } from 'h3'
import { requireUserRole } from '~/server/utils/auth'
import { getDefaultTranslationModel } from '~/server/utils/system-settings'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  const model = await getDefaultTranslationModel(db)
  return { model }
})
