import { createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])
  const ticketId = getRouterParam(event, 'id')
  if (!ticketId) {
    throw createError({
      statusCode: 400,
      message: 'Ticket ID is required'
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
    .prepare(
      'SELECT id, user_id, email, page_url, reference, type_bug, type_suggestion, type_help, description, status, created_at, updated_at FROM support_tickets WHERE id = ?'
    )
    .bind(ticketId)
    .first()) as {
    id: string
    user_id: string
    email: string
    page_url: string | null
    reference: string | null
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

  const replies = (await db
    .prepare(
      'SELECT id, ticket_id, author_type, author_id, message, created_at FROM support_ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC'
    )
    .bind(ticketId)
    .all()) as {
    results: Array<{
      id: string
      ticket_id: string
      author_type: string
      author_id: string | null
      message: string
      created_at: number
    }>
  }

  return {
    ticket: {
      id: ticket.id,
      user_id: ticket.user_id,
      email: ticket.email,
      page_url: ticket.page_url,
      reference: ticket.reference,
      type_bug: ticket.type_bug,
      type_suggestion: ticket.type_suggestion,
      type_help: ticket.type_help,
      description: ticket.description,
      status: ticket.status,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    },
    replies: replies.results || []
  }
})
