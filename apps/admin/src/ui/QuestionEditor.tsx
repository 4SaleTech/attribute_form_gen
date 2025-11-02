import React from 'react'

type ENAR = { en: string; ar: string }

export type Question = {
  id?: number
  attribute_key: string
  type: string
  name: string
  label: ENAR
  props: any
  status?: string
}

type Props = {
  attributes: { key: string; label: ENAR }[]
  value?: Question
  onClose: () => void
  onSaved: () => void
}

const Field = ({ label, children }: { label: string; children: any }) => (
  <label className="block space-y-1">
    <span className="text-sm font-medium">{label}</span>
    <div>{children}</div>
  </label>
)

function TabsENAR({ value, onChange }: { value: ENAR; onChange: (v: ENAR) => void }) {
  const [tab, setTab] = React.useState<'en'|'ar'>('en')
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button type="button" className={`px-2 py-1 border rounded ${tab==='en'?'bg-slate-200':''}`} onClick={()=>setTab('en')}>EN</button>
        <button type="button" className={`px-2 py-1 border rounded ${tab==='ar'?'bg-slate-200':''}`} onClick={()=>setTab('ar')}>AR</button>
      </div>
      <input className="border p-1 w-full" value={value[tab] || ''} onChange={e=>onChange({ ...value, [tab]: e.target.value })} />
    </div>
  )
}

function OptionsEditor({ value, onChange }: { value: any[]; onChange: (v:any[])=>void }) {
  const list = value || []
  return (
    <div className="space-y-2">
      {list.map((opt, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 items-center">
          <input className="border p-1 col-span-1" placeholder="value" value={opt.value||''} onChange={e=>{ const v=[...list]; v[i]={...v[i], value:e.target.value}; onChange(v) }} />
          <input className="border p-1 col-span-2" placeholder="label.en" value={opt.label?.en||''} onChange={e=>{ const v=[...list]; v[i]={...v[i], label:{...v[i].label, en:e.target.value}}; onChange(v) }} />
          <input className="border p-1 col-span-2" placeholder="label.ar" value={opt.label?.ar||''} onChange={e=>{ const v=[...list]; v[i]={...v[i], label:{...v[i].label, ar:e.target.value}}; onChange(v) }} />
        </div>
      ))}
      <button type="button" className="text-sm underline" onClick={()=>onChange([...(list||[]), { value:'', label:{ en:'', ar:'' } }])}>+ Add option</button>
    </div>
  )
}

export const QuestionEditor: React.FC<Props> = ({ attributes, value, onClose, onSaved }) => {
  const [q, setQ] = React.useState<Question>(value || { attribute_key:'', type:'text', name:'', label:{ en:'', ar:'' }, props:{ required:false }, status:'active' })
  const [error, setError] = React.useState<string>('')

  const save = async () => {
    setError('')
    if (!q.attribute_key || !q.type || !q.name) { setError('Please fill required fields.'); return }
    if (!q.label.en || !q.label.ar) { setError('Label EN/AR required.'); return }
    // basic props EN/AR checks for placeholder/help if present
    if (q.props?.placeholder && (!q.props.placeholder.en || !q.props.placeholder.ar)) { setError('Placeholder EN/AR required.'); return }
    if (q.props?.help && (!q.props.help.en || !q.props.help.ar)) { setError('Help EN/AR required.'); return }
    // radio/select options check
    if (['radio','select','multiselect'].includes(q.type) && Array.isArray(q.props?.options)) {
      for (const o of q.props.options) { if (!o.label?.en || !o.label?.ar) { setError('All options need EN/AR labels.'); return } }
    }
    const res = await fetch('/api/questions', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer dev-admin-token' }, body: JSON.stringify({ attribute_key:q.attribute_key, type:q.type, name:q.name, label:q.label, props:q.props, status:q.status||'active' }) })
    if (!res.ok) { const t = await res.text(); setError(t); return }
    onSaved(); onClose()
  }

  const setProp = (k: string, v: any) => setQ(prev => ({ ...prev, props: { ...(prev.props||{}), [k]: v } }))

  const typeProps = () => {
    switch (q.type) {
      case 'text':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Placeholder (EN/AR)"><TabsENAR value={q.props?.placeholder||{en:'',ar:''}} onChange={v=>setProp('placeholder', v)} /></Field>
            <Field label="Help (EN/AR)"><TabsENAR value={q.props?.help||{en:'',ar:''}} onChange={v=>setProp('help', v)} /></Field>
            <Field label="Required"><input type="checkbox" checked={!!q.props?.required} onChange={e=>setProp('required', e.target.checked)} /></Field>
            <Field label="Max length"><input className="border p-1" type="number" value={q.props?.max_length||''} onChange={e=>setProp('max_length', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Pattern (regex)"><input className="border p-1 w-full" value={q.props?.pattern||''} onChange={e=>setProp('pattern', e.target.value)} /></Field>
            <Field label="Keyboard"><select className="border p-1" value={q.props?.keyboard||'default'} onChange={e=>setProp('keyboard', e.target.value)}><option>default</option><option>email</option><option>numeric</option></select></Field>
          </div>
        )
      case 'textarea':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Placeholder (EN/AR)"><TabsENAR value={q.props?.placeholder||{en:'',ar:''}} onChange={v=>setProp('placeholder', v)} /></Field>
            <Field label="Help (EN/AR)"><TabsENAR value={q.props?.help||{en:'',ar:''}} onChange={v=>setProp('help', v)} /></Field>
            <Field label="Required"><input type="checkbox" checked={!!q.props?.required} onChange={e=>setProp('required', e.target.checked)} /></Field>
            <Field label="Max length"><input className="border p-1" type="number" value={q.props?.max_length||''} onChange={e=>setProp('max_length', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Autosize"><input type="checkbox" checked={!!q.props?.autosize} onChange={e=>setProp('autosize', e.target.checked)} /></Field>
          </div>
        )
      case 'number':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Help (EN/AR)"><TabsENAR value={q.props?.help||{en:'',ar:''}} onChange={v=>setProp('help', v)} /></Field>
            <Field label="Required"><input type="checkbox" checked={!!q.props?.required} onChange={e=>setProp('required', e.target.checked)} /></Field>
            <Field label="Min"><input className="border p-1" type="number" value={q.props?.min||''} onChange={e=>setProp('min', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Max"><input className="border p-1" type="number" value={q.props?.max||''} onChange={e=>setProp('max', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Step"><input className="border p-1" type="number" value={q.props?.step||''} onChange={e=>setProp('step', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Unit (EN/AR)"><TabsENAR value={q.props?.unit||{en:'',ar:''}} onChange={v=>setProp('unit', v)} /></Field>
          </div>
        )
      case 'email':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Placeholder (EN/AR)"><TabsENAR value={q.props?.placeholder||{en:'',ar:''}} onChange={v=>setProp('placeholder', v)} /></Field>
            <Field label="Required"><input type="checkbox" checked={!!q.props?.required} onChange={e=>setProp('required', e.target.checked)} /></Field>
            <Field label="MX Check"><input type="checkbox" checked={!!q.props?.mx_check} onChange={e=>setProp('mx_check', e.target.checked)} /></Field>
          </div>
        )
      case 'phone':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Help (EN/AR)"><TabsENAR value={q.props?.help||{en:'',ar:''}} onChange={v=>setProp('help', v)} /></Field>
            <Field label="Required"><input type="checkbox" checked={!!q.props?.required} onChange={e=>setProp('required', e.target.checked)} /></Field>
            <Field label="Allowed countries (CSV)"><input className="border p-1" value={(q.props?.allowed_countries||[]).join(',')} onChange={e=>setProp('allowed_countries', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} /></Field>
            <Field label="Default country (ISO-2)"><input className="border p-1" value={q.props?.default_country||''} onChange={e=>setProp('default_country', e.target.value)} /></Field>
            <Field label="E.164 required"><input type="checkbox" checked={!!q.props?.e164_required} onChange={e=>setProp('e164_required', e.target.checked)} /></Field>
          </div>
        )
      case 'radio':
      case 'select':
      case 'multiselect':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Help (EN/AR)"><TabsENAR value={q.props?.help||{en:'',ar:''}} onChange={v=>setProp('help', v)} /></Field>
              <Field label="Required"><input type="checkbox" checked={!!q.props?.required} onChange={e=>setProp('required', e.target.checked)} /></Field>
              <Field label="Searchable"><input type="checkbox" checked={!!q.props?.searchable} onChange={e=>setProp('searchable', e.target.checked)} /></Field>
              <Field label="Allow custom"><input type="checkbox" checked={!!q.props?.allow_custom} onChange={e=>setProp('allow_custom', e.target.checked)} /></Field>
            </div>
            <div>
              <div className="font-medium mb-1">Static options</div>
              <OptionsEditor value={q.props?.options||[]} onChange={v=>setProp('options', v)} />
            </div>
          </div>
        )
      case 'checkbox':
      case 'switch':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Help (EN/AR)"><TabsENAR value={q.props?.help||{en:'',ar:''}} onChange={v=>setProp('help', v)} /></Field>
            <Field label="Required (must be true)"><input type="checkbox" checked={!!q.props?.required} onChange={e=>setProp('required', e.target.checked)} /></Field>
          </div>
        )
      case 'file_upload':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Help (EN/AR)"><TabsENAR value={q.props?.help||{en:'',ar:''}} onChange={v=>setProp('help', v)} /></Field>
            <Field label="Required"><input type="checkbox" checked={!!q.props?.required} onChange={e=>setProp('required', e.target.checked)} /></Field>
            <Field label="Accept MIME CSV"><input className="border p-1" value={(q.props?.accept||[]).join(',')} onChange={e=>setProp('accept', e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean))} /></Field>
            <Field label="Max size (MB)"><input className="border p-1" type="number" value={q.props?.max_size_mb||''} onChange={e=>setProp('max_size_mb', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Max files"><input className="border p-1" type="number" value={q.props?.max_files||1} onChange={e=>setProp('max_files', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Capture (camera)"><input type="checkbox" checked={!!q.props?.capture} onChange={e=>setProp('capture', e.target.checked)} /></Field>
          </div>
        )
      default:
        return <div className="text-sm text-slate-500">No additional settings for this type yet.</div>
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-[800px] max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{value? 'Edit field':'Add field'}</h2>
          <button className="text-sm underline" onClick={onClose}>Close</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 mb-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Attribute key">
            <select className="border p-1 w-full" value={q.attribute_key} onChange={e=>setQ(prev=>({ ...prev, attribute_key:e.target.value }))}>
              <option value="">-- select --</option>
              {attributes.map(a => <option key={a.key} value={a.key}>{a.key}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select className="border p-1 w-full" value={q.type} onChange={e=>setQ(prev=>({ ...prev, type:e.target.value }))}>
              {['text','textarea','number','email','phone','radio','select','multiselect','checkbox','switch','file_upload'].map(t=> <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Name (submission key)"><input className="border p-1 w-full" value={q.name} onChange={e=>setQ(prev=>({ ...prev, name:e.target.value }))} /></Field>
          <Field label="Label (EN/AR)"><TabsENAR value={q.label} onChange={v=>setQ(prev=>({ ...prev, label:v }))} /></Field>
        </div>
        <div className="mt-3 space-y-3">
          {typeProps()}
        </div>
        <div className="mt-4 flex gap-2">
          <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={save}>Save</button>
          <button className="px-3 py-1 border rounded" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}



