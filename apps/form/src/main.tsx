import React from 'react'
import { createRoot } from 'react-dom/client'
import { createRenderer } from '@pkg/renderer'
import './index.css'

const container = document.getElementById('root')!

// Get formId, version, and lang from URL
// URL format: /{formId}/{version}?lang={en|ar}
const pathParts = window.location.pathname.split('/').filter(Boolean)
const formId = pathParts[0] || new URLSearchParams(window.location.search).get('formId') || ''
const version = pathParts[1] || new URLSearchParams(window.location.search).get('version') || ''
const lang = new URLSearchParams(window.location.search).get('lang') || 'en'

console.log('Form renderer - pathParts:', pathParts, 'formId:', formId, 'version:', version, 'lang:', lang)

if (!formId || !version) {
  const root = createRoot(container)
  root.render(
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Missing Form Information</h1>
        <p className="text-gray-600">Missing formId or version in URL</p>
        <p className="text-sm text-gray-500 mt-4">Expected format: /{'{formId}'}/{'{version}'}?lang={'{en|ar}'}</p>
        <p className="text-xs text-gray-400 mt-2">Current URL: {window.location.href}</p>
      </div>
    </div>
  )
} else {
  // Show loading state
  const root = createRoot(container)
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
      // Use the renderer to render the form directly into the container
      // The renderer will create its own root, so we need to clear the container first
      container.innerHTML = ''
      const renderer = createRenderer({})
      renderer.renderForm(container, form, { locale: lang as 'en'|'ar' })
    })
    .catch(err => {
      console.error('Failed to load form:', err)
      const errorRoot = createRoot(container)
      errorRoot.render(
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
}

