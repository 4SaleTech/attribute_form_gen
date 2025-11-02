import React from 'react'

type Item = { formId: string; version: number; title: { en:string; ar:string }; createdAt: string }

export const Forms: React.FC = () => {
  const [items, setItems] = React.useState<Item[]>([])
  const load = async () => {
    try {
      const r = await fetch('/api/forms', { headers:{ Authorization:'Bearer dev-admin-token' } })
      if (!r.ok) {
        console.error('Failed to load forms:', r.status, await r.text())
        return
      }
      const data = await r.json()
      setItems(data)
    } catch (err) {
      console.error('Error loading forms:', err)
    }
  }
  React.useEffect(()=>{ load() }, [])

  const del = async (formId: string, version: number) => {
    if (!confirm(`Delete ${formId} v${version}?`)) return
    await fetch(`/api/forms/${encodeURIComponent(formId)}/${version}`, { method:'DELETE', headers:{ Authorization:'Bearer dev-admin-token' } })
    load()
  }

  const getFormUrl = (formId: string, version: number, lang: 'en'|'ar') => {
    // Forms are now rendered by the admin app itself when URL matches /{formId}/{version}?lang={lang}
    // Use relative URL since we're in the same app
    return `/${encodeURIComponent(formId)}/${version}?lang=${lang}`
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Form snapshots</h2>
      <table className="w-full border text-sm dark:border-slate-600">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800">
            <th className="border p-2 text-left dark:border-slate-600">Form ID</th>
            <th className="border p-2 text-left dark:border-slate-600">Version</th>
            <th className="border p-2 text-left dark:border-slate-600">Title (EN / AR)</th>
            <th className="border p-2 text-left dark:border-slate-600">URL (EN)</th>
            <th className="border p-2 text-left dark:border-slate-600">URL (AR)</th>
            <th className="border p-2 text-left dark:border-slate-600">Created</th>
            <th className="border p-2 dark:border-slate-600"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={`${i.formId}-${i.version}`}>
              <td className="border p-2 dark:border-slate-600">{i.formId}</td>
              <td className="border p-2 dark:border-slate-600">{i.version}</td>
              <td className="border p-2 dark:border-slate-600">{i.title?.en} / {i.title?.ar}</td>
              <td className="border p-2 dark:border-slate-600">
                <a 
                  href={getFormUrl(i.formId, i.version, 'en')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  {getFormUrl(i.formId, i.version, 'en')}
                </a>
              </td>
              <td className="border p-2 dark:border-slate-600">
                <a 
                  href={getFormUrl(i.formId, i.version, 'ar')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  {getFormUrl(i.formId, i.version, 'ar')}
                </a>
              </td>
              <td className="border p-2 dark:border-slate-600">{new Date(i.createdAt).toLocaleString()}</td>
              <td className="border p-2 text-right dark:border-slate-600">
                <button className="underline text-red-600 dark:text-red-400" onClick={()=>del(i.formId, i.version)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}



