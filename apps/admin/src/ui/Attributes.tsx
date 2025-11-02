import React from 'react'

type ENAR = { en: string; ar: string }
type Attribute = { key: string; label: ENAR; default_position: number; status: string }

function Editor({ initial, onClose, onSaved }: { initial?: Attribute; onClose: ()=>void; onSaved: ()=>void }) {
  const [a, setA] = React.useState<Attribute>(initial || { key:'', label:{en:'',ar:''}, default_position:0, status:'active' })
  const [err, setErr] = React.useState('')
  const save = async () => {
    setErr('')
    if (!a.key) { setErr('Key required'); return }
    if (!a.label.en) { setErr('EN label required'); return }
    const body = { key:a.key, label:a.label, default_position:a.default_position, status:a.status }
    const res = await fetch('/api/attributes' + (initial? '/' + encodeURIComponent(initial.key): ''), {
      method: initial? 'PUT':'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer dev-admin-token' }, body: JSON.stringify(body)
    })
    if (!res.ok) { setErr('Save failed'); return }
    onSaved(); onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-[600px]">
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">{initial? 'Edit':'Add'} Attribute</h3><button onClick={onClose}>Close</button></div>
        {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Key<input className="border p-1 w-full" value={a.key} disabled={!!initial} onChange={e=>setA(prev=>({ ...prev, key:e.target.value }))} /></label>
          <label className="block">Position<input type="number" className="border p-1 w-full" value={a.default_position} onChange={e=>setA(prev=>({ ...prev, default_position:Number(e.target.value) }))} /></label>
          <label className="block">Label EN<input className="border p-1 w-full" value={a.label.en} onChange={e=>setA(prev=>({ ...prev, label:{ ...prev.label, en:e.target.value }}))} /></label>
          <label className="block">Label AR (Optional)<input className="border p-1 w-full" value={a.label.ar} onChange={e=>setA(prev=>({ ...prev, label:{ ...prev.label, ar:e.target.value }}))} /></label>
          <label className="block">Status<select className="border p-1 w-full" value={a.status} onChange={e=>setA(prev=>({ ...prev, status:e.target.value }))}><option>active</option><option>inactive</option></select></label>
        </div>
        <div className="mt-3 flex gap-2"><button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={save}>Save</button><button className="px-3 py-1 border rounded" onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  )
}

export const Attributes: React.FC = () => {
  const [items, setItems] = React.useState<Attribute[]>([])
  const [editing, setEditing] = React.useState<Attribute|undefined>(undefined)
  const [adding, setAdding] = React.useState(false)
  const load = async () => {
    try {
      const r = await fetch('/api/attributes', { headers:{ Authorization:'Bearer dev-admin-token' } })
      if (!r.ok) {
        console.error('Failed to load attributes:', r.status, await r.text())
        return
      }
      const a = await r.json()
      setItems(a)
    } catch (err) {
      console.error('Error loading attributes:', err)
    }
  }
  React.useEffect(()=>{ load() }, [])

  const del = async (key: string) => {
    if (!confirm('Delete attribute ' + key + '?')) return
    await fetch('/api/attributes/' + encodeURIComponent(key), { method:'DELETE', headers:{ Authorization:'Bearer dev-admin-token' } })
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Attributes</h2><button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={()=>setAdding(true)}>Add</button></div>
      <table className="w-full border text-sm">
        <thead><tr className="bg-slate-50"><th className="border p-2 text-left">Key</th><th className="border p-2 text-left">Label (EN / AR)</th><th className="border p-2 text-left">Position</th><th className="border p-2 text-left">Status</th><th className="border p-2"></th></tr></thead>
        <tbody>
          {items.map(a => (
            <tr key={a.key}>
              <td className="border p-2">{a.key}</td>
              <td className="border p-2">{a.label?.en} / {a.label?.ar}</td>
              <td className="border p-2">{a.default_position}</td>
              <td className="border p-2">{a.status}</td>
              <td className="border p-2 text-right space-x-2">
                <button className="underline" onClick={()=>setEditing(a)}>Edit</button>
                <button className="underline text-red-600" onClick={()=>del(a.key)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {adding && <Editor onClose={()=>setAdding(false)} onSaved={load} />}
      {editing && <Editor initial={editing} onClose={()=>setEditing(undefined)} onSaved={load} />}
    </div>
  )
}



