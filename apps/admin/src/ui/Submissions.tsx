import React from 'react'

type Submission = {
  id: number
  formId: string
  version: number
  submittedAt: number
  locale: string
  device: string
  answers: Record<string, any>
  attributes: Record<string, any>
  idempotencyKey?: string | null
  webhookStatus: string
  createdAt: string
}

type Form = {
  formId: string
  version: number
  title: { en: string; ar: string }
}

export const Submissions: React.FC = () => {
  const [forms, setForms] = React.useState<Form[]>([])
  const [selectedFormId, setSelectedFormId] = React.useState<string>('')
  const [selectedVersion, setSelectedVersion] = React.useState<string>('')
  const [submissions, setSubmissions] = React.useState<Submission[]>([])
  const [loading, setLoading] = React.useState(false)
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  const loadForms = async () => {
    try {
      const r = await fetch('/api/forms', { headers: { Authorization: 'Bearer dev-admin-token' } })
      if (!r.ok) {
        console.error('Failed to load forms:', r.status, await r.text())
        return
      }
      const data = await r.json()
      setForms(data)
      if (data.length > 0 && !selectedFormId) {
        setSelectedFormId(data[0].formId)
        setSelectedVersion(String(data[0].version))
      }
    } catch (err) {
      console.error('Error loading forms:', err)
    }
  }

  const loadSubmissions = async () => {
    if (!selectedFormId) return
    
    setLoading(true)
    try {
      let url = '/api/submissions?formId=' + encodeURIComponent(selectedFormId)
      if (selectedVersion) {
        url += '&version=' + encodeURIComponent(selectedVersion)
      }
      
      const r = await fetch(url, { headers: { Authorization: 'Bearer dev-admin-token' } })
      if (!r.ok) {
        console.error('Failed to load submissions:', r.status, await r.text())
        return
      }
      const data = await r.json()
      setSubmissions(data)
    } catch (err) {
      console.error('Error loading submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadForms()
  }, [])

  React.useEffect(() => {
    if (selectedFormId) {
      loadSubmissions()
    }
  }, [selectedFormId, selectedVersion])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatJson = (obj: Record<string, any>) => {
    return JSON.stringify(obj, null, 2)
  }

  const selectedForm = forms.find(f => f.formId === selectedFormId && String(f.version) === selectedVersion)
  const versionsForForm = forms.filter(f => f.formId === selectedFormId).map(f => f.version).sort((a, b) => b - a)

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Form Submissions</h2>
      
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">Form</label>
          <select
            className="border px-3 py-1 rounded dark:border-slate-600 dark:bg-slate-800"
            value={selectedFormId}
            onChange={(e) => {
              setSelectedFormId(e.target.value)
              const versions = forms.filter(f => f.formId === e.target.value).map(f => f.version).sort((a, b) => b - a)
              if (versions.length > 0) {
                setSelectedVersion(String(versions[0]))
              } else {
                setSelectedVersion('')
              }
            }}
          >
            <option value="">All forms</option>
            {Array.from(new Set(forms.map(f => f.formId))).map(formId => (
              <option key={formId} value={formId}>{formId}</option>
            ))}
          </select>
        </div>

        {selectedFormId && (
          <div>
            <label className="block text-sm mb-1">Version</label>
            <select
              className="border px-3 py-1 rounded dark:border-slate-600 dark:bg-slate-800"
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
            >
              <option value="">All versions</option>
              {versionsForForm.map(v => (
                <option key={v} value={String(v)}>v{v}</option>
              ))}
            </select>
          </div>
        )}

        <button
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          onClick={loadSubmissions}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {selectedForm && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Viewing: {selectedForm.title.en} / {selectedForm.title.ar} (v{selectedForm.version})
        </div>
      )}

      <div className="border rounded dark:border-slate-600 overflow-x-auto">
        <table className="w-full text-sm dark:border-slate-600">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800">
              <th className="border p-2 text-left dark:border-slate-600">ID</th>
              <th className="border p-2 text-left dark:border-slate-600">Form ID</th>
              <th className="border p-2 text-left dark:border-slate-600">Version</th>
              <th className="border p-2 text-left dark:border-slate-600">Submitted At</th>
              <th className="border p-2 text-left dark:border-slate-600">Locale</th>
              <th className="border p-2 text-left dark:border-slate-600">Device</th>
              <th className="border p-2 text-left dark:border-slate-600">Webhook Status</th>
              <th className="border p-2 text-left dark:border-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={8} className="border p-4 text-center text-slate-500 dark:text-slate-400">
                  {loading ? 'Loading...' : 'No submissions found'}
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <React.Fragment key={s.id}>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="border p-2 dark:border-slate-600">{s.id}</td>
                    <td className="border p-2 dark:border-slate-600">{s.formId}</td>
                    <td className="border p-2 dark:border-slate-600">{s.version}</td>
                    <td className="border p-2 dark:border-slate-600">{formatDate(s.submittedAt)}</td>
                    <td className="border p-2 dark:border-slate-600">{s.locale}</td>
                    <td className="border p-2 dark:border-slate-600">{s.device}</td>
                    <td className="border p-2 dark:border-slate-600">
                      <span className={`px-2 py-1 rounded text-xs ${
                        s.webhookStatus === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        s.webhookStatus === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        s.webhookStatus === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {s.webhookStatus}
                      </span>
                    </td>
                    <td className="border p-2 dark:border-slate-600">
                      <button
                        className="text-blue-600 hover:underline dark:text-blue-400"
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      >
                        {expandedId === s.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr>
                      <td colSpan={8} className="border p-4 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold mb-2">Answers</h3>
                            <pre className="bg-white dark:bg-slate-800 p-3 rounded border overflow-x-auto text-xs dark:border-slate-600">
                              {formatJson(s.answers)}
                            </pre>
                          </div>
                          {Object.keys(s.attributes).length > 0 && (
                            <div>
                              <h3 className="font-semibold mb-2">Attributes</h3>
                              <pre className="bg-white dark:bg-slate-800 p-3 rounded border overflow-x-auto text-xs dark:border-slate-600">
                                {formatJson(s.attributes)}
                              </pre>
                            </div>
                          )}
                          {s.idempotencyKey && (
                            <div>
                              <h3 className="font-semibold mb-2">Idempotency Key</h3>
                              <code className="bg-white dark:bg-slate-800 p-2 rounded border text-xs dark:border-slate-600">{s.idempotencyKey}</code>
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold mb-2">Created At</h3>
                            <span className="text-sm">{s.createdAt}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

