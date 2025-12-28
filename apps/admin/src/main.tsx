import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import './index.css'
import { App } from './ui/App'
import { createRenderer } from '@pkg/renderer'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container not found')
}

let root: Root | null = null

function getOrCreateRoot(): Root {
  if (!root) {
    root = createRoot(container)
  }
  return root
}

try {
  // Check if URL matches form pattern: /admin/{formId}/{version}?lang={en|ar}
  const pathParts = window.location.pathname.split('/').filter(Boolean)
  
  // Account for /admin/ base path - if first part is "admin", skip it
  const startIndex = pathParts[0] === 'admin' ? 1 : 0
  const formId = pathParts[startIndex]
  const version = pathParts[startIndex + 1]
  const lang = new URLSearchParams(window.location.search).get('lang') || 'en'
  const instanceId = new URLSearchParams(window.location.search).get('instanceId') || null

  // If URL matches form pattern and has formId and version (not just /admin/), render form
  if (formId && formId !== 'admin' && version && !isNaN(Number(version))) {
    // This is a form URL - render the form
    
    // Show loading state
    getOrCreateRoot().render(
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
    
    // Fetch and render form
    let apiUrl = `/api/forms/${encodeURIComponent(formId)}/${version}?lang=${lang}`
    if (instanceId) {
      apiUrl += `&instanceId=${encodeURIComponent(instanceId)}`
    }
    fetch(apiUrl)
      .then(async r => {
        if (!r.ok) {
          const errorText = await r.text()
          throw new Error(`HTTP ${r.status}: ${errorText}`)
        }
        return r.json()
      })
      .then(form => {
        // Unmount previous root before rendering form
        if (root) {
          root.unmount()
          root = null
        }
        // Render form - this will create its own root
        const renderer = createRenderer({})
        renderer.renderForm(container, form, { locale: lang as 'en'|'ar' })
      })
      .catch(err => {
        console.error('Failed to load form:', err)
        getOrCreateRoot().render(
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
    getOrCreateRoot().render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  }
} catch (error) {
  console.error('Fatal error initializing admin app:', error)
  if (container) {
    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem;">
        <div style="max-width: 28rem; width: 100%; text-align: center;">
          <h1 style="font-size: 1.25rem; font-weight: 700; color: #dc2626; margin-bottom: 0.5rem;">Fatal Error</h1>
          <p style="color: #4b5563; margin-bottom: 0.5rem;">${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p style="font-size: 0.75rem; color: #9ca3af; margin-top: 1rem;">Check the browser console for details</p>
        </div>
      </div>
    `
  }
}



