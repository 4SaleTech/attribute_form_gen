import React from 'react'

type Item = { id: number; type: 'http'|'slack'; endpoint_url: string; http_method: string; content_type?: string; headers: Record<string,string>; body_template?: string; mode: 'raw'|'slack'; enabled: boolean }

type FormSnapshot = { formId: string; version: number; title: { en:string; ar:string }; createdAt: string }

function Editor({ value, onCancel, onSaved, formId, version }: { value?: Item; onCancel: ()=>void; onSaved: ()=>void; formId: string; version: number }) {
  const [w, setW] = React.useState<Item>(value || { id: 0, type:'http', endpoint_url:'', http_method:'POST', content_type:'application/json', headers:{}, body_template:'', mode:'raw', enabled:true })
  const [headersText, setHeadersText] = React.useState<string>(value? JSON.stringify(value.headers, null, 2): '{\n  "X-Auth": ""\n}')
  const [err, setErr] = React.useState('')

  const save = async () => {
    setErr('')
    if (!w.endpoint_url) { setErr('Endpoint URL is required'); return }
    try { const obj = headersText.trim()? JSON.parse(headersText): {}; setW(prev=>({ ...prev, headers: obj })) } catch { setErr('Headers must be valid JSON'); return }
    const body = { type: w.type, endpoint_url: w.endpoint_url, http_method: w.http_method||'POST', content_type: w.content_type || 'application/json', headers: (headersText.trim()? JSON.parse(headersText): {}), body_template: w.body_template || '', mode: w.mode, enabled: w.enabled }
    const url = `/api/forms/${encodeURIComponent(formId)}/${version}/webhooks` + (value? `/${value.id}`: '')
    const res = await fetch(url, { method: value? 'PUT':'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer dev-admin-token' }, body: JSON.stringify(body) })
    if (!res.ok) { setErr('Save failed'); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-800 p-4 rounded shadow w-[720px] max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">{value? 'Edit':'Add'} Webhook</h3><button className="dark:text-slate-300" onClick={onCancel}>Close</button></div>
        {err && <div className="text-red-600 dark:text-red-400 text-sm mb-2">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Type<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.type} onChange={e=>setW(prev=>({ ...prev, type: e.target.value as any }))}><option value="http">http</option><option value="slack">slack</option></select></label>
          <label className="block">Enabled<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={String(w.enabled)} onChange={e=>setW(prev=>({ ...prev, enabled: e.target.value==='true' }))}><option value="true">true</option><option value="false">false</option></select></label>
          <label className="block col-span-2">Endpoint URL<input className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.endpoint_url} onChange={e=>setW(prev=>({ ...prev, endpoint_url:e.target.value }))} /></label>
          <label className="block">HTTP Method<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.http_method} onChange={e=>setW(prev=>({ ...prev, http_method:e.target.value }))}><option>POST</option><option>PUT</option><option>PATCH</option></select></label>
          <label className="block">Mode<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.mode} onChange={e=>setW(prev=>({ ...prev, mode:e.target.value as any }))}><option value="raw">raw</option><option value="slack">slack</option></select></label>
          <label className="block">Content Type<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.content_type || 'application/json'} onChange={e=>setW(prev=>({ ...prev, content_type:e.target.value }))}><option value="application/json">application/json</option><option value="text/plain">text/plain</option></select></label>
          <label className="block col-span-2">Headers (JSON)
            <textarea className="border p-1 w-full h-32 font-mono text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={headersText} onChange={e=>setHeadersText(e.target.value)} />
          </label>
          <label className="block col-span-2">Body Template
            <textarea className="border p-1 w-full h-40 font-mono text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder={'Use variables: formId, version, submissionId, submittedAt, answers, meta. For JSON injection use: {{json answers}}'} value={w.body_template || ''} onChange={e=>setW(prev=>({ ...prev, body_template:e.target.value }))} />
          </label>
        </div>
        <div className="mt-3 flex gap-2"><button className="bg-blue-600 text-white px-3 py-1 rounded dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600" onClick={save}>Save</button><button className="px-3 py-1 border rounded dark:border-slate-600 dark:hover:bg-slate-700" onClick={onCancel}>Cancel</button></div>
      </div>
    </div>
  )
}

export const Webhooks: React.FC = () => {
  const [forms, setForms] = React.useState<FormSnapshot[]>([])
  const [formId, setFormId] = React.useState<string>('')
  const [version, setVersion] = React.useState<number>(0)
  const [items, setItems] = React.useState<Item[]>([])
  const [showEditor, setShowEditor] = React.useState(false)
  const [editing, setEditing] = React.useState<Item|undefined>(undefined)
  const [loading, setLoading] = React.useState(false)

  // Load forms list
  const loadForms = async () => {
    try {
      const r = await fetch('/api/forms', { headers:{ Authorization:'Bearer dev-admin-token' } })
      if (!r.ok) {
        console.error('Failed to load forms:', r.status, await r.text())
        return
      }
      const data = await r.json()
      setForms(data)
    } catch (err) {
      console.error('Error loading forms:', err)
    }
  }

  // Load webhooks for selected form/version
  const loadWebhooks = React.useCallback(async () => {
    if (!formId || !version) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const r = await fetch(`/api/forms/${encodeURIComponent(formId)}/${version}/webhooks`, { headers:{ Authorization:'Bearer dev-admin-token' } })
      if (r.ok) {
        setItems(await r.json())
      } else {
        setItems([])
      }
    } catch (err) {
      console.error('Error loading webhooks:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [formId, version])

  // Get unique form IDs
  const formIds = React.useMemo(() => {
    const unique = new Set<string>()
    forms.forEach(f => unique.add(f.formId))
    return Array.from(unique).sort()
  }, [forms])

  // Get versions for selected form ID
  const versions = React.useMemo(() => {
    if (!formId) return []
    return forms
      .filter(f => f.formId === formId)
      .sort((a, b) => b.version - a.version) // Sort descending (newest first)
      .map(f => f.version)
  }, [forms, formId])

  // Load forms on mount
  React.useEffect(() => { loadForms() }, [])

  // Auto-select first form when forms are loaded
  React.useEffect(() => {
    if (forms.length > 0 && !formId) {
      setFormId(forms[0].formId)
      setVersion(forms[0].version)
    }
  }, [forms, formId])

  // Reset version when formId changes
  React.useEffect(() => {
    if (formId && versions.length > 0 && !versions.includes(version)) {
      setVersion(versions[0])
    }
  }, [formId, versions, version])

  // Auto-load webhooks when formId or version changes
  React.useEffect(() => { loadWebhooks() }, [loadWebhooks])

  const canAddWebhook = formId && version > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="block">
          Form ID
          <select 
            className="border p-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 min-w-[200px]" 
            value={formId} 
            onChange={e => setFormId(e.target.value)}
          >
            <option value="">-- Select Form --</option>
            {formIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Version
          <select 
            className="border p-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 w-32" 
            value={version || ''} 
            onChange={e => setVersion(Number(e.target.value) || 0)}
            disabled={!formId}
          >
            <option value="">-- Select --</option>
            {versions.map(v => (
              <option key={v} value={v}>v{v}</option>
            ))}
          </select>
        </label>
        <button 
          className="bg-blue-600 text-white px-3 py-1 rounded dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={()=>{ setEditing(undefined); setShowEditor(true) }}
          disabled={!canAddWebhook}
        >
          Add webhook
        </button>
      </div>
      {loading && <div className="text-sm text-gray-600 dark:text-gray-400">Loading webhooks...</div>}
      <table className="w-full border text-sm dark:border-slate-600">
        <thead><tr className="bg-slate-50 dark:bg-slate-800"><th className="border p-2 text-left dark:border-slate-600">Type</th><th className="border p-2 text-left dark:border-slate-600">Endpoint</th><th className="border p-2 text-left dark:border-slate-600">Method</th><th className="border p-2 text-left dark:border-slate-600">Mode</th><th className="border p-2 text-left dark:border-slate-600">Enabled</th><th className="border p-2 dark:border-slate-600"></th></tr></thead>
        <tbody>
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="border p-4 text-center text-gray-500 dark:text-gray-400">
                {formId && version ? 'No webhooks configured for this form snapshot' : 'Select a form and version to view webhooks'}
              </td>
            </tr>
          )}
          {items.map(i => (
            <tr key={i.id}>
              <td className="border p-2 dark:border-slate-600">{i.type}</td>
              <td className="border p-2 truncate max-w-[320px] dark:border-slate-600" title={i.endpoint_url}>{i.endpoint_url}</td>
              <td className="border p-2 dark:border-slate-600">{i.http_method}</td>
              <td className="border p-2 dark:border-slate-600">{i.mode}</td>
              <td className="border p-2 dark:border-slate-600">{String(i.enabled)}</td>
              <td className="border p-2 text-right space-x-2 dark:border-slate-600">
                <button className="underline dark:text-blue-400" onClick={()=>{ setEditing(i); setShowEditor(true) }}>Edit</button>
                <button className="underline text-red-600 dark:text-red-400" onClick={async ()=>{ if (!confirm('Delete webhook?')) return; await fetch(`/api/forms/${encodeURIComponent(formId)}/${version}/webhooks/${i.id}`, { method:'DELETE', headers:{ Authorization:'Bearer dev-admin-token' } }); loadWebhooks() }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showEditor && <Editor value={editing} onCancel={()=>setShowEditor(false)} onSaved={()=>{ setShowEditor(false); loadWebhooks() }} formId={formId} version={version} />}
    </div>
  )
}


