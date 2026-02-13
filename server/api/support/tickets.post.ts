import { createError } from 'h3'
import { randomUUID } from 'uncrypto'
import { requireUserRole } from '~/server/utils/auth'
import { sendNewTicketNotification } from '~/server/utils/email'

const MAX_DESCRIPTION_LENGTH = 2000

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  const userId = userData.id
  const email = (userData as any).email
  if (!userId || !email) {
    throw createError({
      statusCode: 401,
      message: 'User session incomplete'
    })
  }

  const body = await readBody(event)
  const pageUrl = typeof body?.pageUrl === 'string' ? body.pageUrl.trim().slice(0, 500) : ''
  const reference = typeof body?.reference === 'string' ? body.reference.trim().slice(0, 500) : ''
  const typeBug = Boolean(body?.typeBug)
  const typeSuggestion = Boolean(body?.typeSuggestion)
  const typeHelp = Boolean(body?.typeHelp)
  const description = typeof body?.description === 'string' ? body.description.trim() : ''

  if (!description) {
    throw createError({
      statusCode: 400,
      message: 'Description is required'
    })
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
    })
  }
  if (!typeBug && !typeSuggestion && !typeHelp) {
    throw createError({
      statusCode: 400,
      message: 'Please select at least one type: Bug, Suggestion, or Help'
    })
  }

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  await db
    .prepare(
      `INSERT INTO support_tickets (id, user_id, email, page_url, reference, type_bug, type_suggestion, type_help, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
    )
    .bind(id, userId, email, pageUrl || null, reference || null, typeBug ? 1 : 0, typeSuggestion ? 1 : 0, typeHelp ? 1 : 0, description, now, now)
    .run()

  const ticket = {
    id,
    email,
    page_url: pageUrl || null,
    reference: reference || null,
    type_bug: typeBug ? 1 : 0,
    type_suggestion: typeSuggestion ? 1 : 0,
    type_help: typeHelp ? 1 : 0,
    description,
    status: 'new',
    created_at: now,
    updated_at: now
  }

  try {
    await sendNewTicketNotification(event, ticket)
  } catch (err) {
    console.error('Failed to send support ticket emails:', err)
  }

  return { ticket }
})
