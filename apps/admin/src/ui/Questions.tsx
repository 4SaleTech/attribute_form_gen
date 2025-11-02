import React from 'react'
import { QuestionEditor, type Question } from './QuestionEditor'

type Attribute = { key: string; default_position?: number }

export const Questions: React.FC = () => {
  const [attrs, setAttrs] = React.useState<Attribute[]>([])
  const [items, setItems] = React.useState<Question[]>([])
  const [showEditor, setShowEditor] = React.useState(false)
  const [editing, setEditing] = React.useState<Question | undefined>(undefined)

  const load = async () => {
    try {
      const r1 = await fetch('/api/attributes', { headers:{ Authorization:'Bearer dev-admin-token' } })
      if (!r1.ok) {
        console.error('Failed to load attributes:', r1.status, await r1.text())
        return
      }
      const a = await r1.json()
      setAttrs(a)
      
      const r2 = await fetch('/api/questions', { headers:{ Authorization:'Bearer dev-admin-token' } })
      if (!r2.ok) {
        console.error('Failed to load questions:', r2.status, await r2.text())
        return
      }
      const q = await r2.json()
      setItems(q)
    } catch (err) {
      console.error('Error loading questions:', err)
    }
  }
  React.useEffect(()=>{ load() }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Questions</h2>
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={()=>{ setEditing(undefined); setShowEditor(true) }}>Add field</button>
      </div>
      <table className="w-full border text-sm">
        <thead><tr className="bg-slate-50"><th className="border p-2 text-left">Attribute</th><th className="border p-2 text-left">Type</th><th className="border p-2 text-left">Name</th><th className="border p-2 text-left">Label (EN / AR)</th><th className="border p-2"></th></tr></thead>
        <tbody>
          {items.map((q:any)=>(
            <tr key={q.id}>
              <td className="border p-2">{q.attribute_key}</td>
              <td className="border p-2">{q.type}</td>
              <td className="border p-2">{q.name}</td>
              <td className="border p-2">{q.label?.en} / {q.label?.ar}</td>
              <td className="border p-2 text-right space-x-2">
                <button className="underline" onClick={()=>{ setEditing(q); setShowEditor(true) }}>Edit</button>
                <button className="underline text-red-600" onClick={async ()=>{ if (!confirm('Delete field?')) return; await fetch('/api/questions/'+q.id,{ method:'DELETE', headers:{ Authorization:'Bearer dev-admin-token' } }); load() }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showEditor && <QuestionEditor attributes={attrs} value={editing as any} onClose={()=>setShowEditor(false)} onSaved={load} />}
    </div>
  )
}


