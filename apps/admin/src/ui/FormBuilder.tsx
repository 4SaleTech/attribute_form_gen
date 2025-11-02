import React from 'react'
import { createRenderer } from '@pkg/renderer'

type ENAR = { en: string; ar: string }
type Attribute = { key: string; label: ENAR }

export const FormBuilder: React.FC = () => {
  const [formId, setFormId] = React.useState('')
  const [title, setTitle] = React.useState<ENAR>({ en:'', ar:'' })
  const [attrs, setAttrs] = React.useState<Attribute[]>([])
  const [selected, setSelected] = React.useState<string[]>([])
  const [locale, setLocale] = React.useState<'en'|'ar'>('en')
  const [thank, setThank] = React.useState<{ show:boolean; title:ENAR; message:ENAR }>({ show:false, title:{ en:'', ar:'' }, message:{ en:'', ar:'' } })
  const [submit, setSubmit] = React.useState<any>({
    actions:[
      { type:'native_bridge', enabled:false },
      { type:'server_persist', enabled:false },
      { type:'webhooks', enabled:false },
      { type:'redirect', enabled:false, url:'' }
    ],
    ordering:['native_bridge','server_persist','webhooks','redirect'],
    idempotency:{ enabled:false, key:'' },
    timeout_ms:6000,
    on_error:'continue'
  })
  const previewRef = React.useRef<HTMLDivElement | null>(null)
  const rendererRef = React.useRef<ReturnType<typeof createRenderer> | null>(null)

  React.useEffect(()=>{
    fetch('/api/attributes', { headers:{ Authorization:'Bearer dev-admin-token' } })
      .then(r=>r.json()).then((list)=>{ setAttrs(list) })
  },[])

  const move = (key: string, dir: -1|1) => {
    const i = selected.indexOf(key); if (i<0) return
    const j = i + dir; if (j<0 || j>=selected.length) return
    const copy = [...selected];
    const [it] = copy.splice(i,1);
    copy.splice(j,0,it)
    setSelected(copy)
  }

  const publish = async () => {
    if (!formId.trim()) { alert('Form ID is required'); return }
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
    const body = { formId, title, attributes:selected, thankYou: thank, submit }
    const res = await fetch('/api/forms/publish', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer dev-admin-token' }, body: JSON.stringify(body) })
    const j = await res.json(); alert(JSON.stringify(j))
  }

  const preview = async () => {
    if (!formId.trim()) { alert('Form ID is required'); return }
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
        <label className="block">Form ID<input className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={formId} onChange={e=>setFormId(e.target.value)} placeholder="e.g. service-intake" /></label>
        <label className="block">Title (EN)<input className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={title.en} onChange={e=>setTitle(prev=>({ ...prev, en:e.target.value }))} placeholder="English title" /></label>
        <label className="block">Title (AR)<input className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={title.ar} onChange={e=>setTitle(prev=>({ ...prev, ar:e.target.value }))} placeholder="العنوان بالعربية" /></label>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Attributes (order matters)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Available</div>
            <ul className="border rounded divide-y dark:border-slate-600">
              {attrs.filter(a=>!selected.includes(a.key)).map(a=> (
                <li key={a.key} className="p-2 flex items-center justify-between dark:hover:bg-slate-800">
                  <span>{a.key}</span>
                  <button className="text-sm underline dark:text-blue-400" onClick={()=>setSelected(prev=>[...prev, a.key])}>Add</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Selected</div>
            <ul className="border rounded divide-y dark:border-slate-600">
              {selected.map(key => (
                <li key={key} className="p-2 flex items-center justify-between dark:hover:bg-slate-800">
                  <span>{key}</span>
                  <div className="space-x-2">
                    <button className="text-sm dark:text-slate-300" onClick={()=>move(key,-1)}>↑</button>
                    <button className="text-sm dark:text-slate-300" onClick={()=>move(key,1)}>↓</button>
                    <button className="text-sm underline text-red-600 dark:text-red-400" onClick={()=>setSelected(prev=>prev.filter(k=>k!==key))}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
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
          {['native_bridge','server_persist','webhooks','redirect'].map(t => (
            <div key={t} className="mb-2">
              <label className="block"><input type="checkbox" checked={!!submit.actions.find((a:any)=>a.type===t && a.enabled)} onChange={e=>{
                const a = submit.actions.map((x:any)=> x.type===t? { ...x, enabled:e.target.checked }: x)
                setSubmit((prev:any)=>({ ...prev, actions:a }))
              }} /> {' '}{
                t==='native_bridge'? 'Post to native bridge': t==='server_persist'? 'Save responses': t==='webhooks'? 'Trigger webhooks': 'Redirect'
              }</label>
              {t==='redirect' && submit.actions.find((a:any)=>a.type==='redirect')?.enabled && (
                <input className="border p-1 w-full mt-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="https://... or /path" value={submit.actions.find((a:any)=>a.type==='redirect')?.url||''} onChange={e=>{
                  const a = submit.actions.map((x:any)=> x.type==='redirect'? { ...x, url:e.target.value }: x)
                  setSubmit((prev:any)=>({ ...prev, actions:a }))
                }} />
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
                <span>{t}</span>
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
                  <span className="px-2 py-1 border rounded dark:border-slate-600">{t==='native_bridge'?'Bridge': t==='server_persist'?'Save': t==='webhooks'?'Webhooks':'Redirect'}</span>
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


