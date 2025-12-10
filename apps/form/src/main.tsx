import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import { createRenderer } from '@pkg/renderer'
import './index.css'

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

function renderError(message: string, details?: string) {
  getOrCreateRoot().render(
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Failed to Load Form</h1>
        <p className="text-gray-600 mb-2">{message}</p>
        {details && <p className="text-sm text-gray-500 mt-2">{details}</p>}
        <p className="text-xs text-gray-400 mt-4">URL: {window.location.href}</p>
        <p className="text-xs text-gray-400 mt-2">Make sure the API server is running on port 8080</p>
      </div>
    </div>
  )
}

try {
  // Get formId, version, lang, and instanceId from URL
  // URL format: /{formId}/{version}?lang={en|ar}&instanceId={instanceId}
  const pathParts = window.location.pathname.split('/').filter(Boolean)
  const formId = pathParts[0] || new URLSearchParams(window.location.search).get('formId') || ''
  const version = pathParts[1] || new URLSearchParams(window.location.search).get('version') || ''
  const urlParams = new URLSearchParams(window.location.search)
  const lang = urlParams.get('lang') || 'en'
  const instanceId = urlParams.get('instanceId') || null // Get instanceId from URL if present

  if (!formId || !version) {
    renderError(
      'Missing formId or version in URL',
      `Expected format: /{formId}/{version}?lang={en|ar}&instanceId={instanceId}`
    )
  } else {
    // Show loading state
    getOrCreateRoot().render(
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
    
    // Build API URL with instanceId if present
    let apiUrl = `/api/forms/${encodeURIComponent(formId)}/${version}?lang=${lang}`
    if (instanceId) {
      apiUrl += `&instanceId=${encodeURIComponent(instanceId)}`
    }
    
    // Fetch and render form
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
        renderError(
          err.message || 'Unknown error occurred',
          `Form ID: ${formId}, Version: ${version}`
        )
      })
  }
} catch (error) {
  console.error('Fatal error initializing form app:', error)
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

