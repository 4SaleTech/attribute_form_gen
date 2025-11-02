import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './ui/App'
import { createRenderer } from '@pkg/renderer'

const container = document.getElementById('root')!
const root = createRoot(container)

// Check if URL matches form pattern: /{formId}/{version}?lang={en|ar}
const pathParts = window.location.pathname.split('/').filter(Boolean)
const formId = pathParts[0]
const version = pathParts[1]
const lang = new URLSearchParams(window.location.search).get('lang') || 'en'

// If URL matches form pattern and has formId and version, render form instead of admin
if (formId && version && !isNaN(Number(version))) {
  // This is a form URL - render the form
  console.log('Rendering form:', formId, version, lang)
  
  // Show loading state
  root.render(
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading form...</p>
      </div>
    </div>
  )
  
  // Fetch and render form
  fetch(`/api/forms/${encodeURIComponent(formId)}/${version}?lang=${lang}`)
    .then(async r => {
      if (!r.ok) {
        const errorText = await r.text()
        throw new Error(`HTTP ${r.status}: ${errorText}`)
      }
      return r.json()
    })
    .then(form => {
      console.log('Form loaded:', form)
      // Clear container and render form
      container.innerHTML = ''
      const renderer = createRenderer({})
      renderer.renderForm(container, form, { locale: lang as 'en'|'ar' })
    })
    .catch(err => {
      console.error('Failed to load form:', err)
      root.render(
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <h1 className="text-xl font-bold text-red-600 mb-2">Failed to Load Form</h1>
            <p className="text-gray-600 mb-2">{err.message}</p>
            <p className="text-sm text-gray-500">Form ID: {formId}</p>
            <p className="text-sm text-gray-500">Version: {version}</p>
            <p className="text-xs text-gray-400 mt-4">URL: {window.location.href}</p>
            <p className="text-xs text-gray-400 mt-2">Make sure the API server is running on port 8080</p>
          </div>
        </div>
      )
    })
} else {
  // This is an admin URL - render admin panel
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}



