import { defineEventHandler } from 'h3'
import { $fetch } from 'ofetch'
import { requireUserRole } from '~/server/utils/auth'

// Fallback prices in USD per 1M tokens. Used when OpenRouter doesn't list a model.
const STATIC_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':                    { input: 2.50,  output: 10.00 },
  'gpt-4o-2024-11-20':         { input: 2.50,  output: 10.00 },
  'gpt-4o-2024-08-06':         { input: 2.50,  output: 10.00 },
  'gpt-4o-2024-05-13':         { input: 5.00,  output: 15.00 },
  'gpt-4o-mini':               { input: 0.15,  output: 0.60  },
  'gpt-4o-mini-2024-07-18':    { input: 0.15,  output: 0.60  },
  'gpt-4.1':                   { input: 2.00,  output: 8.00  },
  'gpt-4.1-mini':              { input: 0.40,  output: 1.60  },
  'gpt-4.1-nano':              { input: 0.10,  output: 0.40  },
  'o1':                        { input: 15.00, output: 60.00 },
  'o1-2024-12-17':             { input: 15.00, output: 60.00 },
  'o1-mini':                   { input: 3.00,  output: 12.00 },
  'o1-mini-2024-09-12':        { input: 3.00,  output: 12.00 },
  'o1-preview':                { input: 15.00, output: 60.00 },
  'o1-preview-2024-09-12':     { input: 15.00, output: 60.00 },
  'o3':                        { input: 10.00, output: 40.00 },
  'o3-mini':                   { input: 1.10,  output: 4.40  },
  'o4-mini':                   { input: 1.10,  output: 4.40  },
  'gpt-4-turbo':               { input: 10.00, output: 30.00 },
  'gpt-4-turbo-2024-04-09':    { input: 10.00, output: 30.00 },
  'gpt-4':                     { input: 30.00, output: 60.00 },
  'gpt-4-32k':                 { input: 60.00, output: 120.00 },
  'gpt-3.5-turbo':             { input: 0.50,  output: 1.50  },
  'gpt-3.5-turbo-0125':        { input: 0.50,  output: 1.50  },
  'gpt-3.5-turbo-1106':        { input: 1.00,  output: 2.00  },
}

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // Start with static fallback; live data from OpenRouter will overwrite entries it knows about.
  const pricing: Record<string, { input: number; output: number }> = { ...STATIC_PRICING }

  try {
    const data = await $fetch<{
      data: Array<{ id: string; pricing?: { prompt?: string; completion?: string } }>
    }>('https://openrouter.ai/api/v1/models')

    for (const model of data.data ?? []) {
      if (!model.id.startsWith('openai/')) continue
      const id = model.id.slice('openai/'.length)
      const inputPerToken = parseFloat(model.pricing?.prompt ?? '0')
      const outputPerToken = parseFloat(model.pricing?.completion ?? '0')
      if (!isFinite(inputPerToken) || !isFinite(outputPerToken)) continue
      pricing[id] = {
        input: Math.round(inputPerToken * 1_000_000 * 100) / 100,
        output: Math.round(outputPerToken * 1_000_000 * 100) / 100,
      }
    }
  } catch {
    // OpenRouter unavailable — return static pricing only
  }

  return { pricing }
})
