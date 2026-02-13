import { createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'
import { sendTicketUpdateNotification } from '~/server/utils/email'

const ALLOWED_STATUSES = ['new', 'open', 'closed', 'in-progress', 'wish-list', 'dismissed']

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])
  const ticketId = getRouterParam(event, 'id')
  if (!ticketId) {
    throw createError({
      statusCode: 400,
      message: 'Ticket ID is required'
    })
  }

  const body = await readBody(event)
  const newStatus = typeof body?.status === 'string' ? body.status.trim() : ''
  if (!ALLOWED_STATUSES.includes(newStatus)) {
    throw createError({
      statusCode: 400,
      message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`
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

  const existing = (await db
    .prepare('SELECT id, email, page_url, reference, type_bug, type_suggestion, type_help, description, status, created_at, updated_at FROM support_tickets WHERE id = ?')
    .bind(ticketId)
    .first()) as {
    id: string
    email: string
    page_url: string | null
    type_bug: number
    type_suggestion: number
    type_help: number
    description: string
    status: string
    created_at: number
    updated_at: number
  } | null

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Ticket not found'
    })
  }

  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?')
    .bind(newStatus, now, ticketId)
    .run()

  const ticket = {
    ...existing,
    status: newStatus,
    updated_at: now
  }

  try {
    await sendTicketUpdateNotification(event, ticket, { newStatus })
  } catch (err) {
    console.error('Failed to send ticket update email:', err)
  }

  return { ticket }
})
