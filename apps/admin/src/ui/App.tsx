import React from 'react'
import { Questions } from './Questions'
import { Forms } from './Forms'
import { FormBuilder } from './FormBuilder'
import { Webhooks } from './Webhooks'
import { Submissions } from './Submissions'

export const App: React.FC = () => {
  const [tab, setTab] = React.useState<'builder'|'questions'|'forms'|'webhooks'|'submissions'>('builder')
  const [darkMode, setDarkMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }, [darkMode])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 border rounded dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        <div className="flex gap-2">
          <button className={`px-2 py-1 border rounded dark:border-slate-600 ${tab==='builder'?'bg-slate-200 dark:bg-slate-700':''}`} onClick={()=>setTab('builder')}>Form Builder</button>
          <button className={`px-2 py-1 border rounded dark:border-slate-600 ${tab==='questions'?'bg-slate-200 dark:bg-slate-700':''}`} onClick={()=>setTab('questions')}>Questions</button>
          <button className={`px-2 py-1 border rounded dark:border-slate-600 ${tab==='forms'?'bg-slate-200 dark:bg-slate-700':''}`} onClick={()=>setTab('forms')}>Forms</button>
          <button className={`px-2 py-1 border rounded dark:border-slate-600 ${tab==='webhooks'?'bg-slate-200 dark:bg-slate-700':''}`} onClick={()=>setTab('webhooks')}>Webhooks</button>
          <button className={`px-2 py-1 border rounded dark:border-slate-600 ${tab==='submissions'?'bg-slate-200 dark:bg-slate-700':''}`} onClick={()=>setTab('submissions')}>Submissions</button>
        </div>
        {tab==='builder' && <FormBuilder />}
        {tab==='questions' && <Questions />}
        {tab==='forms' && <Forms />}
        {tab==='webhooks' && <Webhooks />}
        {tab==='submissions' && <Submissions />}
      </div>
    </div>
  )
}


