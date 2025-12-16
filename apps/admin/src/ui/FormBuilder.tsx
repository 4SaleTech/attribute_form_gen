import React from 'react'
import { createRenderer } from '@pkg/renderer'

type ENAR = { en: string; ar: string }
type Attribute = { key: string; default_position?: number }

// Generate a unique form ID
function generateFormId(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'form-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

export const FormBuilder: React.FC = () => {
  const [formId, setFormId] = React.useState(() => generateFormId())
  const [title, setTitle] = React.useState<ENAR>({ en:'', ar:'' })
  const [attrs, setAttrs] = React.useState<Attribute[]>([])
  const [selected, setSelected] = React.useState<string[]>([])
  const [locale, setLocale] = React.useState<'en'|'ar'>('en')
  const [attrSearch, setAttrSearch] = React.useState('')
  const [thank, setThank] = React.useState<{ show:boolean; title:ENAR; message:ENAR }>({ show:false, title:{ en:'', ar:'' }, message:{ en:'', ar:'' } })
  const [submit, setSubmit] = React.useState<any>({
    actions:[
      { type:'native_bridge', enabled:false },
      { type:'server_persist', enabled:false },
      { type:'webhooks', enabled:false },
      { type:'nextjs_post', enabled:false },
      { type:'redirect', enabled:false, url:'' },
      { type:'purchase_authenticated', enabled:false, purchase_auth_config: {
        require_authentication: true,
        auth_api_base_url: 'https://staging-services.q84sale.com',
        device_id: '',
        app_signature: '',
        version_number: '26.0.0',
        purchase_api_url: 'https://staging-services.q84sale.com/api/v1/cashier/billing/purchase-with-method',
        adv_id_field: 'adv_id',
        item_id_field: 'item_id',
        category_id_field: 'category_id',
        district_id_field: 'district_id',
        payment_method: 'CARD',
        user_lang: 'en',
        additional_webhooks: []
      }}
    ],
    ordering:['native_bridge','server_persist','webhooks','nextjs_post','redirect','purchase_authenticated'],
    idempotency:{ enabled:false, key:'' },
    timeout_ms:6000,
    on_error:'continue'
  })
  const [nextjsConfig, setNextjsConfig] = React.useState<{url:string, enabled:boolean} | null>(null)
  const [userToken, setUserToken] = React.useState<string>('')
  const previewRef = React.useRef<HTMLDivElement | null>(null)
  const rendererRef = React.useRef<ReturnType<typeof createRenderer> | null>(null)

  React.useEffect(()=>{
    fetch('/api/attributes', { headers:{ Authorization:'Bearer dev-admin-token' } })
      .then(r=>r.json()).then((list)=>{ setAttrs(list) })
    fetch('/api/config')
      .then(r=>r.json())
      .then((data:any)=>{ 
        if (data.nextjsPost) {
          setNextjsConfig({ url: data.nextjsPost.url || '', enabled: data.nextjsPost.enabled || false })
        }
      })
      .catch(()=>{})
  },[])

  const move = (key: string, dir: -1|1) => {
    const i = selected.indexOf(key); if (i<0) return
    const j = i + dir; if (j<0 || j>=selected.length) return
    const copy = [...selected];
    const [it] = copy.splice(i,1);
    copy.splice(j,0,it)
    setSelected(copy)
  }

  const generateNewFormId = () => {
    setFormId(generateFormId())
  }

  const publish = async () => {
    if (!title.en.trim()) { alert('Title (EN) is required'); return }
    if (!title.ar.trim()) { alert('Title (AR) is required'); return }
    if (selected.length === 0) { alert('At least one attribute must be selected'); return }
    if (thank.show) {
      if (!thank.title.en.trim()) { alert('Thank you Title (EN) is required when "Show after submit" is checked'); return }
      if (!thank.title.ar.trim()) { alert('Thank you Title (AR) is required when "Show after submit" is checked'); return }
      if (!thank.message.en.trim()) { alert('Thank you Message (EN) is required when "Show after submit" is checked'); return }
      if (!thank.message.ar.trim()) { alert('Thank you Message (AR) is required when "Show after submit" is checked'); return }
    }
    const enabled = submit.actions.filter((a:any)=>a.enabled)
    if (enabled.length===0) { alert('Enable at least one action'); return }
    const red = submit.actions.find((a:any)=>a.type==='redirect')
    if (red?.enabled && !(String(red.url||'').startsWith('http://') || String(red.url||'').startsWith('https://') || String(red.url||'').startsWith('/'))) { alert('Redirect URL must be http(s) or a relative path'); return }
    const nextjs = submit.actions.find((a:any)=>a.type==='nextjs_post')
    if (nextjs?.enabled && (!nextjsConfig?.enabled || !nextjsConfig?.url)) { alert('Next.js POST is not configured. Set NEXTJS_POST_URL and NEXTJS_POST_ENABLED environment variables.'); return }
    const body: any = { formId, title, attributes:selected, thankYou: thank, submit }
    
    // Conditionally include Authorization header only if user token is provided
    // If user token is provided, it will create a user-specific form
    // If not provided, it will create a normal form
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (userToken.trim()) {
      headers['Authorization'] = `Bearer ${userToken.trim()}`
    }
    
    const res = await fetch('/api/forms/publish', { method:'POST', headers, body: JSON.stringify(body) })
    const j = await res.json()
    if (j.isDuplicate) {
      alert(`A form with the same configuration already exists!\n\nForm ID: ${j.formId}\nVersion: ${j.version}\n\nURLs:\nEN: ${j.urls.en}\nAR: ${j.urls.ar}`)
    } else {
      if (j.instanceId) {
        alert(`Form published successfully!\n\nForm ID: ${j.formId}\nVersion: ${j.version}\nInstance ID: ${j.instanceId}\n\nURLs:\nEN: ${j.urls.en}\nAR: ${j.urls.ar}`)
    } else {
      alert(`Form published successfully!\n\nForm ID: ${j.formId}\nVersion: ${j.version}\n\nURLs:\nEN: ${j.urls.en}\nAR: ${j.urls.ar}`)
      }
    }
  }

  const preview = async () => {
    if (!title.en.trim()) { alert('Title (EN) is required'); return }
    if (!title.ar.trim()) { alert('Title (AR) is required'); return }
    if (selected.length === 0) { alert('At least one attribute must be selected'); return }
    const body = { formId, title, attributes:selected, thankYou: thank, submit, onMissing:'skip' }
    const res = await fetch('/api/forms/generate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) })
    const form = await res.json()
    if (!rendererRef.current) rendererRef.current = createRenderer({})
    if (previewRef.current) rendererRef.current.renderForm(previewRef.current, form, { locale })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <label className="block">
          Form ID
          <div className="flex items-center gap-2">
            <input 
              className="border p-1 flex-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
              value={formId} 
              readOnly
              disabled
            />
            <button 
              type="button"
              onClick={generateNewFormId}
              className="px-2 py-1 text-sm border rounded dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 hover:bg-slate-100"
              title="Generate new Form ID"
            >
              🔄
            </button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-generated</div>
        </label>
        <label className="block">Title (EN)<input className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={title.en} onChange={e=>setTitle(prev=>({ ...prev, en:e.target.value }))} placeholder="English title" /></label>
        <label className="block">Title (AR)<input className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={title.ar} onChange={e=>setTitle(prev=>({ ...prev, ar:e.target.value }))} placeholder="العنوان بالعربية" /></label>
      </div>

      <div className="mb-4">
        <label className="block">
          User Token (Optional - for user-specific forms)
          <input 
            className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
            type="text"
            value={userToken} 
            onChange={e=>setUserToken(e.target.value)} 
            placeholder="Enter user token (e.g., 2160720|peBF4cQygr0PAt1dsjX2B4PVQojsfhU9sKfGhKsI)" 
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            If provided, this form will be user-specific and tied to this token. Leave empty for a normal form.
          </div>
        </label>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Attributes (order matters)</h3>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search attributes..."
            value={attrSearch}
            onChange={(e) => setAttrSearch(e.target.value)}
            className="border rounded p-2 w-full mb-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto border rounded p-2 dark:border-slate-600">
            {attrs
              .filter(a => a.key.toLowerCase().includes(attrSearch.toLowerCase()))
              .map(a => {
                const isSelected = selected.includes(a.key)
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelected(prev => prev.filter(k => k !== a.key))
                      } else {
                        setSelected(prev => [...prev, a.key])
                      }
                    }}
                    className={`px-3 py-1 rounded border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-700 dark:border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700'
                    }`}
                  >
                    {a.key}
                  </button>
                )
              })}
          </div>
        </div>
        {selected.length > 0 && (
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Selected (in order)</div>
            <ul className="border rounded divide-y dark:border-slate-600">
              {selected.map(key => (
                <li key={key} className="p-2 flex items-center justify-between dark:hover:bg-slate-800">
                  <span>{key}</span>
                  <div className="space-x-2">
                    <button className="text-sm dark:text-slate-300" onClick={()=>move(key,-1)} disabled={selected.indexOf(key) === 0}>↑</button>
                    <button className="text-sm dark:text-slate-300" onClick={()=>move(key,1)} disabled={selected.indexOf(key) === selected.length - 1}>↓</button>
                    <button className="text-sm underline text-red-600 dark:text-red-400" onClick={()=>setSelected(prev=>prev.filter(k=>k!==key))}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <h3 className="font-semibold mb-2">Thank you</h3>
          <label className="block mb-2"><input type="checkbox" checked={thank.show} onChange={e=>setThank(prev=>({ ...prev, show:e.target.checked }))} /> Show after submit</label>
          <label className="block">
            Title EN
            {thank.show && <span className="text-red-500 ml-1">*</span>}
            <input 
              className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
              value={thank.title.en} 
              onChange={e=>setThank(prev=>({ ...prev, title:{ ...prev.title, en:e.target.value }}))} 
              placeholder={thank.show ? "Required" : "Optional"}
            />
          </label>
          <label className="block">
            Title AR
            {thank.show && <span className="text-red-500 ml-1">*</span>}
            <input 
              className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
              value={thank.title.ar} 
              onChange={e=>setThank(prev=>({ ...prev, title:{ ...prev.title, ar:e.target.value }}))} 
              placeholder={thank.show ? "Required" : "Optional"}
            />
          </label>
          <label className="block">
            Message EN
            {thank.show && <span className="text-red-500 ml-1">*</span>}
            <input 
              className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
              value={thank.message.en} 
              onChange={e=>setThank(prev=>({ ...prev, message:{ ...prev.message, en:e.target.value }}))} 
              placeholder={thank.show ? "Required" : "Optional"}
            />
          </label>
          <label className="block">
            Message AR
            {thank.show && <span className="text-red-500 ml-1">*</span>}
            <input 
              className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
              value={thank.message.ar} 
              onChange={e=>setThank(prev=>({ ...prev, message:{ ...prev.message, ar:e.target.value }}))} 
              placeholder={thank.show ? "Required" : "Optional"}
            />
          </label>
        </div>

        <div className="col-span-1">
          <h3 className="font-semibold mb-2">Submit Actions</h3>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Choose what happens when the user submits the form.</div>
          {['native_bridge','server_persist','webhooks','nextjs_post','redirect','purchase_authenticated'].map(t => (
            <div key={t} className="mb-2">
              <label className="block"><input type="checkbox" checked={!!submit.actions.find((a:any)=>a.type===t && a.enabled)} onChange={e=>{
                const a = submit.actions.map((x:any)=> x.type===t? { ...x, enabled:e.target.checked }: x)
                setSubmit((prev:any)=>({ ...prev, actions:a }))
              }} /> {' '}{
                t==='native_bridge'? 'Post to native bridge': 
                t==='server_persist'? 'Save responses': 
                t==='webhooks'? 'Trigger webhooks': 
                t==='nextjs_post'? 'Post to Next.js': 
                t==='purchase_authenticated'? 'Authenticated Purchase':
                'Redirect'
              }</label>
              {t==='redirect' && submit.actions.find((a:any)=>a.type==='redirect')?.enabled && (
                <div className="mt-1">
                  <input 
                    className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                    placeholder="https://example.com/booking?formSubmissionId={{.submissionId}}&name={{.name}}" 
                    value={submit.actions.find((a:any)=>a.type==='redirect')?.url||''} 
                    onChange={e=>{
                      const a = submit.actions.map((x:any)=> x.type==='redirect'? { ...x, url:e.target.value }: x)
                      setSubmit((prev:any)=>({ ...prev, actions:a }))
                    }} 
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <div className="mb-1">💡 Use templates: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.submissionId}}'}</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.formId}}'}</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.fieldName}}'}</code></div>
                    <details className="cursor-pointer">
                      <summary className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100">Available variables</summary>
                      <div className="mt-1 ml-2 space-y-0.5 text-xs">
                        <div><code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.formId}}'}</code> - Form ID</div>
                        <div><code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.version}}'}</code> - Form version</div>
                        <div><code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.submissionId}}'}</code> - Submission ID (requires "Save responses" enabled)</div>
                        <div><code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.fieldName}}'}</code> - Any form field (e.g., <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.name}}'}</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.email}}'}</code>)</div>
                        <div><code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.meta.locale}}'}</code> - Submission locale</div>
                        <div><code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{.meta.sessionId}}'}</code> - Session ID</div>
                      </div>
                    </details>
                  </div>
                </div>
              )}
              {t==='nextjs_post' && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {nextjsConfig?.enabled && nextjsConfig?.url ? (
                    <>Configured: {nextjsConfig.url}</>
                  ) : (
                    <>Not configured. Set NEXTJS_POST_URL and NEXTJS_POST_ENABLED env vars.</>
                  )}
                </div>
              )}
              {t==='purchase_authenticated' && submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.enabled && (
                <div className="mt-2 p-3 border rounded bg-slate-50 dark:bg-slate-900 dark:border-slate-600 space-y-2">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Purchase Authentication Settings</div>
                  <label className="block text-xs">
                    <input type="checkbox" checked={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.require_authentication !== false} onChange={e=>{
                      const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, require_authentication:e.target.checked }}: x)
                      setSubmit((prev:any)=>({ ...prev, actions:a }))
                    }} /> Require Authentication
                  </label>
                  <label className="block text-xs">
                    Auth API Base URL
                    <input className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                      value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.auth_api_base_url||''} 
                      onChange={e=>{
                        const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, auth_api_base_url:e.target.value }}: x)
                        setSubmit((prev:any)=>({ ...prev, actions:a }))
                      }}
                    />
                  </label>
                  <label className="block text-xs">
                    Purchase API URL
                    <input className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                      value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.purchase_api_url||''} 
                      onChange={e=>{
                        const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, purchase_api_url:e.target.value }}: x)
                        setSubmit((prev:any)=>({ ...prev, actions:a }))
                      }}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs">
                      Device ID
                      <input className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                        value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.device_id||''} 
                        onChange={e=>{
                          const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, device_id:e.target.value }}: x)
                          setSubmit((prev:any)=>({ ...prev, actions:a }))
                        }}
                      />
                    </label>
                    <label className="block text-xs">
                      App Signature
                      <input className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                        value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.app_signature||''} 
                        onChange={e=>{
                          const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, app_signature:e.target.value }}: x)
                          setSubmit((prev:any)=>({ ...prev, actions:a }))
                        }}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs">
                      ADV ID Field
                      <input className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                        value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.adv_id_field||'adv_id'} 
                        onChange={e=>{
                          const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, adv_id_field:e.target.value }}: x)
                          setSubmit((prev:any)=>({ ...prev, actions:a }))
                        }}
                      />
                    </label>
                    <label className="block text-xs">
                      Item ID Field
                      <input className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                        value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.item_id_field||'item_id'} 
                        onChange={e=>{
                          const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, item_id_field:e.target.value }}: x)
                          setSubmit((prev:any)=>({ ...prev, actions:a }))
                        }}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs">
                      Category ID Field
                      <input className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                        value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.category_id_field||'category_id'} 
                        onChange={e=>{
                          const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, category_id_field:e.target.value }}: x)
                          setSubmit((prev:any)=>({ ...prev, actions:a }))
                        }}
                      />
                    </label>
                    <label className="block text-xs">
                      District ID Field
                      <input className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                        value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.district_id_field||'district_id'} 
                        onChange={e=>{
                          const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, district_id_field:e.target.value }}: x)
                          setSubmit((prev:any)=>({ ...prev, actions:a }))
                        }}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs">
                      Payment Method
                      <select className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                        value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.payment_method||'CARD'} 
                        onChange={e=>{
                          const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, payment_method:e.target.value }}: x)
                          setSubmit((prev:any)=>({ ...prev, actions:a }))
                        }}>
                        <option value="CARD">Card</option>
                        <option value="CASH">Cash</option>
                        <option value="KNET">KNET</option>
                      </select>
                    </label>
                    <label className="block text-xs">
                      User Language
                      <select className="border p-1 w-full text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                        value={submit.actions.find((a:any)=>a.type==='purchase_authenticated')?.purchase_auth_config?.user_lang||'en'} 
                        onChange={e=>{
                          const a = submit.actions.map((x:any)=> x.type==='purchase_authenticated'? { ...x, purchase_auth_config:{ ...x.purchase_auth_config, user_lang:e.target.value }}: x)
                          setSubmit((prev:any)=>({ ...prev, actions:a }))
                        }}>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">Timeout (ms)<input type="number" className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={submit.timeout_ms||0} onChange={e=>setSubmit((prev:any)=>({ ...prev, timeout_ms:Number(e.target.value) }))} /></label>
            <label className="block">On error<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={submit.on_error} onChange={e=>setSubmit((prev:any)=>({ ...prev, on_error:e.target.value }))}><option value="continue">continue</option><option value="stop">stop</option><option value="show_error">show_error</option></select></label>
          </div>
          <div className="mt-3">
            <label className="block"><input type="checkbox" checked={!!submit.idempotency?.enabled} onChange={e=>setSubmit((prev:any)=>({ ...prev, idempotency:{ ...(prev.idempotency||{}), enabled:e.target.checked, key: prev.idempotency?.key || 'sessionId' } }))} /> Prevent duplicate submissions</label>
            {submit.idempotency?.enabled && (
              <label className="block mt-1">Idempotency key<input className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={submit.idempotency?.key||'sessionId'} onChange={e=>setSubmit((prev:any)=>({ ...prev, idempotency:{ ...(prev.idempotency||{}), key:e.target.value } }))} /></label>
            )}
          </div>
        </div>

        <div className="col-span-1">
          <h3 className="font-semibold mb-2">Action order</h3>
          <ul className="border rounded divide-y dark:border-slate-600">
            {submit.ordering.map((t:string, idx:number) => (
              <li key={t} className="p-2 flex items-center justify-between dark:hover:bg-slate-800">
                <span>{t==='native_bridge'?'Bridge': t==='server_persist'?'Save': t==='webhooks'?'Webhooks': t==='nextjs_post'?'Next.js': t==='purchase_authenticated'?'Purchase Auth': 'Redirect'}</span>
                <div className="space-x-2">
                  <button className="text-sm dark:text-slate-300" onClick={()=>{
                    if (idx===0) return; const o=[...submit.ordering]; const [it]=o.splice(idx,1); o.splice(idx-1,0,it); setSubmit((prev:any)=>({ ...prev, ordering:o }))
                  }}>↑</button>
                  <button className="text-sm dark:text-slate-300" onClick={()=>{
                    if (idx===submit.ordering.length-1) return; const o=[...submit.ordering]; const [it]=o.splice(idx,1); o.splice(idx+1,0,it); setSubmit((prev:any)=>({ ...prev, ordering:o }))
                  }}>↓</button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 text-sm">
            <div className="font-medium mb-1">Submit Flow Preview</div>
            <div className="flex items-center flex-wrap gap-1">
              <span className="px-2 py-1 border rounded dark:border-slate-600">User Submit</span>
              {submit.ordering.map((t:string) => (
                <React.Fragment key={t}>
                  <span>→</span>
                  <span className="px-2 py-1 border rounded dark:border-slate-600">{t==='native_bridge'?'Bridge': t==='server_persist'?'Save': t==='webhooks'?'Webhooks': t==='nextjs_post'?'Next.js': t==='purchase_authenticated'?'Purchase':'Redirect'}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="bg-slate-700 text-white rounded px-3 py-1 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500" onClick={preview}>Preview</button>
        <button className="bg-blue-600 text-white rounded px-3 py-1 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600" onClick={publish}>Publish</button>
      </div>

      <div className="border rounded p-3 dark:border-slate-600" dir={locale==='ar'?'rtl':'ltr'}>
        <div ref={previewRef} />
      </div>
    </div>
  )
}


