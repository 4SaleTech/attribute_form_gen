import { describe, it, expect, vi } from 'vitest'
import { runSubmitPipeline } from './submit'

const form = {
  formId: 'f',
  version: 1,
  title: { en: 'x', ar: 'y' },
  fields: [],
  attributes: [],
  supported_locales: ['en','ar'],
  default_locale: 'en',
  submit: {
    actions: [
      { type: 'native_bridge', enabled: true },
      { type: 'server_persist', enabled: true },
      { type: 'webhooks', enabled: true },
    ],
    ordering: ['native_bridge','server_persist','webhooks'],
    on_error: 'continue',
    timeout_ms: 50
  }
} as any

describe('submit pipeline', () => {
  it('continues on error when on_error=continue', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true })
    await runSubmitPipeline(form, { formId: 'f', version: 1, submittedAt: Date.now(), answers: {}, meta: {} })
    expect(fetchSpy).toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})



