import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  if (!userData.id) {
    throw createError({
      statusCode: 401,
      message: 'User not found'
    })
  }

  let body: { wordListId?: number; action?: string } = {}
  try {
    body = await readBody(event).catch(() => ({}))
  } catch {
    body = {}
  }

  const wordListId = typeof body.wordListId === 'number' ? body.wordListId : parseInt(String(body.wordListId || ''), 10)
  const action = body.action === 'show' || body.action === 'correct' ? body.action : null

  if (!wordListId || isNaN(wordListId) || !action) {
    throw createError({
      statusCode: 400,
      message: 'Body must include wordListId (number) and action ("show" or "correct")'
    })
  }

  try {
    // Verify word belongs to user (user_word_list row exists and user_id matches)
    const wordRow = await db.prepare(
      'SELECT id FROM user_word_list WHERE id = ? AND user_id = ?'
    )
      .bind(wordListId, userData.id)
      .first()

    if (!wordRow) {
      throw createError({
        statusCode: 404,
        message: 'Word not found or does not belong to you'
      })
    }

    const now = Math.floor(Date.now() / 1000)

    if (action === 'show') {
      const existing = await db.prepare(
        'SELECT times_shown FROM word_list_progress WHERE user_id = ? AND word_list_id = ?'
      )
        .bind(userData.id, wordListId)
        .first()

      if (existing) {
        await db.prepare(
          'UPDATE word_list_progress SET times_shown = times_shown + 1, updated_at = ? WHERE user_id = ? AND word_list_id = ?'
        )
          .bind(now, userData.id, wordListId)
          .run()
      } else {
        await db.prepare(
          'INSERT INTO word_list_progress (user_id, word_list_id, times_shown, times_correct, updated_at) VALUES (?, ?, 1, 0, ?)'
        )
          .bind(userData.id, wordListId, now)
          .run()
      }
    } else {
      // action === 'correct'
      const existing = await db.prepare(
        'SELECT times_shown, times_correct, attempts_until_first_correct FROM word_list_progress WHERE user_id = ? AND word_list_id = ?'
      )
        .bind(userData.id, wordListId)
        .first() as { times_shown: number; times_correct: number; attempts_until_first_correct: number | null } | null

      if (existing) {
        const newTimesCorrect = existing.times_correct + 1
        const setFirstCorrect =
          existing.attempts_until_first_correct == null
            ? existing.times_shown
            : existing.attempts_until_first_correct
        await db.prepare(
          'UPDATE word_list_progress SET times_correct = times_correct + 1, attempts_until_first_correct = ?, updated_at = ? WHERE user_id = ? AND word_list_id = ?'
        )
          .bind(setFirstCorrect, now, userData.id, wordListId)
          .run()
      } else {
        await db.prepare(
          'INSERT INTO word_list_progress (user_id, word_list_id, times_shown, times_correct, attempts_until_first_correct, updated_at) VALUES (?, ?, 1, 1, 1, ?)'
        )
          .bind(userData.id, wordListId, now)
          .run()
      }
    }

    return { success: true }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to update progress'
    })
  }
})
