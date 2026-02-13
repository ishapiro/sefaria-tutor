import { createError, getRouterParam } from 'h3'
import { randomUUID } from 'uncrypto'
import { requireUserRole } from '~/server/utils/auth'
import { sendTicketUpdateNotification } from '~/server/utils/email'

const MAX_MESSAGE_LENGTH = 2000

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['admin'])
  const ticketId = getRouterParam(event, 'id')
  if (!ticketId) {
    throw createError({
      statusCode: 400,
      message: 'Ticket ID is required'
    })
  }

  const body = await readBody(event)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) {
    throw createError({
      statusCode: 400,
      message: 'Message is required'
    })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Message must be at most ${MAX_MESSAGE_LENGTH} characters`
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

  const ticket = (await db
    .prepare('SELECT id, email, page_url, type_bug, type_suggestion, type_help, description, status, created_at, updated_at FROM support_tickets WHERE id = ?')
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

  if (!ticket) {
    throw createError({
      statusCode: 404,
      message: 'Ticket not found'
    })
  }

  const replyId = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  await db
    .prepare(
      'INSERT INTO support_ticket_replies (id, ticket_id, author_type, author_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(replyId, ticketId, 'admin', userData.id || null, message, now)
    .run()

  await db
    .prepare('UPDATE support_tickets SET updated_at = ? WHERE id = ?')
    .bind(now, ticketId)
    .run()

  try {
    await sendTicketUpdateNotification(event, ticket, { replyText: message })
  } catch (err) {
    console.error('Failed to send ticket update email:', err)
  }

  return {
    reply: {
      id: replyId,
      ticket_id: ticketId,
      author_type: 'admin',
      author_id: userData.id || null,
      message,
      created_at: now
    }
  }
})
