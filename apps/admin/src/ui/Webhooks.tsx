import React from 'react'

type Item = { id: number; type: 'http'; endpoint_url: string; http_method: string; content_type?: string; headers: Record<string,string>; body_template?: string; selected_fields?: string[]; mode: 'raw'; enabled: boolean }

type FormSnapshot = { formId: string; version: number; title: { en:string; ar:string }; createdAt: string }

type FormField = { name: string; type: string; label_json?: { en?: string; ar?: string } }

function Editor({ value, onCancel, onSaved, formId, version }: { value?: Item; onCancel: ()=>void; onSaved: ()=>void; formId: string; version: number }) {
  const [w, setW] = React.useState<Item>(value || { id: 0, type:'http', endpoint_url:'', http_method:'POST', content_type:'application/json', headers:{}, body_template:'', selected_fields:[], mode:'raw', enabled:true })
  const [headersText, setHeadersText] = React.useState<string>(value? JSON.stringify(value.headers, null, 2): '{\n  "X-Auth": ""\n}')
  const [formFields, setFormFields] = React.useState<FormField[]>([])
  const [err, setErr] = React.useState('')
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<TestResult|null>(null)
  const bodyTemplateRef = React.useRef<HTMLTextAreaElement>(null)
  const [cursorPosition, setCursorPosition] = React.useState<number>(0)

  // Update state when value prop changes (for editing)
  React.useEffect(() => {
    if (value) {
      setW(value)
      setHeadersText(JSON.stringify(value.headers || {}, null, 2))
      // Debug: log what we're receiving
      console.log('Editor: received value', { body_template: value.body_template, selected_fields: value.selected_fields })
    }
  }, [value])

  // Load form fields when formId/version changes
  React.useEffect(() => {
    if (!formId || !version) return
    fetch(`/api/forms/${encodeURIComponent(formId)}/${version}`, { headers:{ Authorization:'Bearer dev-admin-token' } })
      .then(r => r.json())
      .then(data => {
        if (data.fields && Array.isArray(data.fields)) {
          setFormFields(data.fields)
        }
      })
      .catch(err => console.error('Failed to load form fields:', err))
  }, [formId, version])

  const save = async () => {
    setErr('')
    if (!w.endpoint_url) { setErr('Endpoint URL is required'); return }
    try { const obj = headersText.trim()? JSON.parse(headersText): {}; setW(prev=>({ ...prev, headers: obj })) } catch { setErr('Headers must be valid JSON'); return }
    
    // Extract field names used in the template (for selected_fields)
    const templateText = w.body_template || ''
    const usedFields: string[] = []
    const fieldRegex = /\{\{\.(\w+)\}\}/g
    let match
    while ((match = fieldRegex.exec(templateText)) !== null) {
      const fieldName = match[1]
      if (formFields.some(f => f.name === fieldName) && !usedFields.includes(fieldName)) {
        usedFields.push(fieldName)
      }
    }
    
    const body = { type: w.type, endpoint_url: w.endpoint_url, http_method: w.http_method||'POST', content_type: w.content_type || 'application/json', headers: (headersText.trim()? JSON.parse(headersText): {}), body_template: w.body_template || '', selected_fields: usedFields, mode: w.mode, enabled: w.enabled }
    const url = `/api/forms/${encodeURIComponent(formId)}/${version}/webhooks` + (value? `/${value.id}`: '')
    const res = await fetch(url, { method: value? 'PUT':'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer dev-admin-token' }, body: JSON.stringify(body) })
    if (!res.ok) { 
      const errorText = await res.text()
      setErr(`Save failed: ${errorText}`)
      return 
    }
    onSaved()
  }

  const testFromEditor = async () => {
    if (!w.endpoint_url) { setErr('Endpoint URL is required to test'); return }
    if (!value?.id) { setErr('Please save the webhook first before testing'); return }
    setTesting(true)
    setErr('')
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(formId)}/${version}/webhooks/${value.id}/test`, {
        method: 'POST',
        headers: { Authorization: 'Bearer dev-admin-token' }
      })
      const result = await res.json()
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        statusCode: 0,
        statusText: 'Error',
        responseBody: '',
        responseHeaders: {},
        durationMs: 0,
        error: String(err),
        requestUrl: w.endpoint_url,
        requestMethod: w.http_method || 'POST',
        requestBody: ''
      })
    } finally {
      setTesting(false)
    }
  }

  const insertFieldAtCursor = (fieldName: string) => {
    const textarea = bodyTemplateRef.current
    if (!textarea) return
    
    // Insert .value by default for all fields
    const placeholder = `{{.${fieldName}.value}}`
    
    const text = w.body_template || ''
    const before = text.substring(0, cursorPosition)
    const after = text.substring(cursorPosition)
    const newText = before + placeholder + after
    
    setW(prev => ({ ...prev, body_template: newText }))
    
    // Restore cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = cursorPosition + placeholder.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }

  const handleBodyTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setW(prev => ({ ...prev, body_template: e.target.value }))
    setCursorPosition(e.target.selectionStart)
  }

  const handleBodyTemplateKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)
  }

  const handleBodyTemplateClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)
  }

  // Generate preview payload
  const generatePreview = React.useMemo(() => {
    const selectedFields = w.selected_fields || []
    
    // Build mock answers based on ALL form fields (for answers context)
    const allMockAnswers: Record<string, any> = {}
    formFields.forEach(field => {
      switch (field.type) {
        case 'text':
        case 'textarea':
        case 'email':
          allMockAnswers[field.name] = `example_${field.name}@example.com`
          break
        case 'number':
          allMockAnswers[field.name] = 123
          break
        case 'phone':
          allMockAnswers[field.name] = { e164: '+96550000000', country: 'KW' }
          break
        case 'radio':
          allMockAnswers[field.name] = { value: 'example_option' }
          break
        case 'date':
        case 'time':
          allMockAnswers[field.name] = new Date().toISOString()
          break
        case 'file_upload':
          allMockAnswers[field.name] = [{ id: 'test_file_id', url: 'https://example.com/test.jpg' }]
          break
        case 'checkbox':
        case 'switch':
          allMockAnswers[field.name] = true
          break
        default:
          allMockAnswers[field.name] = `example_${field.name}`
      }
    })

    // Build mock context (similar to what backend provides)
    const mockContext: Record<string, any> = {
      formId: formId || 'example-form',
      version: version || 1,
      submissionId: 12345,
      submittedAt: Date.now(),
      meta: {
        locale: 'en',
        device: 'web',
        attributes: []
      },
      selected: {} as Record<string, any>,
      answers: allMockAnswers
    }
    
    // Add selected fields as top-level variables AND add .value property for easy access
    selectedFields.forEach(fieldName => {
      if (allMockAnswers[fieldName] !== undefined) {
        const fieldValue = allMockAnswers[fieldName]
        const field = formFields.find(f => f.name === fieldName)
        
        // Add .value property for fields that don't have it naturally
        if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
          if ('value' in fieldValue) {
            // Already has .value (e.g., radio fields)
            mockContext[fieldName] = fieldValue
          } else {
            // Add .value based on field type
            if (field) {
              switch (field.type) {
                case 'phone':
                  mockContext[fieldName] = { ...fieldValue, value: fieldValue.e164 || '+96550000000' }
                  break
                case 'file_upload':
                  // file_upload is an array, so we wrap it in an object with .value
                  mockContext[fieldName] = { 
                    value: Array.isArray(fieldValue) && fieldValue.length > 0 
                      ? fieldValue.map((f: any) => f.url || f.id || '').join(', ') 
                      : '' 
                  }
                  break
                default:
                  mockContext[fieldName] = { ...fieldValue, value: JSON.stringify(fieldValue) }
              }
            } else {
              mockContext[fieldName] = { ...fieldValue, value: JSON.stringify(fieldValue) }
            }
          }
        } else if (Array.isArray(fieldValue)) {
          // Handle arrays (like file_upload)
          const field = formFields.find(f => f.name === fieldName)
          if (field?.type === 'file_upload') {
            // For file_upload, .value is a comma-separated list of URLs
            mockContext[fieldName] = { 
              value: fieldValue.length > 0 
                ? fieldValue.map((f: any) => f.url || f.id || '').join(', ') 
                : '' 
            }
          } else {
            // Other arrays: wrap in object with .value
            mockContext[fieldName] = { value: JSON.stringify(fieldValue) }
          }
        } else {
          // For primitives (string, number, boolean), wrap in object with .value
          mockContext[fieldName] = { value: fieldValue }
        }
        
        mockContext.selected[fieldName] = mockContext[fieldName]
      }
    })
    
    // Also add .value for all fields in answers (even if not selected)
    Object.keys(allMockAnswers).forEach(fieldName => {
      if (!(fieldName in mockContext)) {
        const fieldValue = allMockAnswers[fieldName]
        const field = formFields.find(f => f.name === fieldName)
        
        // Add .value even if field metadata isn't loaded yet (fallback to type detection)
        if (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)) {
          if ('value' in fieldValue) {
            // Already has .value (e.g., radio fields)
            mockContext[fieldName] = fieldValue
          } else {
            // Add .value based on field type (if available) or structure
            if (field) {
              switch (field.type) {
                case 'phone':
                  mockContext[fieldName] = { ...fieldValue, value: fieldValue.e164 || '+96550000000' }
                  break
                case 'file_upload':
                  // file_upload is an array, so we wrap it in an object with .value
                  mockContext[fieldName] = { 
                    value: Array.isArray(fieldValue) && fieldValue.length > 0 
                      ? fieldValue.map((f: any) => f.url || f.id || '').join(', ') 
                      : '' 
                  }
                  break
                default:
                  mockContext[fieldName] = { ...fieldValue, value: JSON.stringify(fieldValue) }
              }
            } else {
              // Field metadata not loaded yet - try to infer type from structure
              if ('e164' in fieldValue) {
                // Looks like a phone field
                mockContext[fieldName] = { ...fieldValue, value: fieldValue.e164 || '+96550000000' }
              } else {
                // Default: stringify the object
                mockContext[fieldName] = { ...fieldValue, value: JSON.stringify(fieldValue) }
              }
            }
          }
        } else if (Array.isArray(fieldValue)) {
          // Handle arrays (like file_upload)
          const field = formFields.find(f => f.name === fieldName)
          if (field?.type === 'file_upload') {
            // For file_upload, .value is a comma-separated list of URLs
            mockContext[fieldName] = { 
              value: fieldValue.length > 0 
                ? fieldValue.map((f: any) => f.url || f.id || '').join(', ') 
                : '' 
            }
          } else {
            // Other arrays: wrap in object with .value
            mockContext[fieldName] = { value: JSON.stringify(fieldValue) }
          }
        } else {
          // Primitive field - wrap in object with .value
          mockContext[fieldName] = { value: fieldValue }
        }
      }
    })

    // Helper to get nested value from context
    const getNestedValue = (path: string, ctx: Record<string, any>): any => {
      const parts = path.split('.')
      
      // Try to resolve from context first
      let value: any = ctx
      let found = true
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part]
        } else {
          found = false
          break
        }
      }
      
      if (found && value !== undefined) {
        return value
      }
      
      // If not found and path has multiple parts, try answers.fieldName.subpath
      if (parts.length > 1 && ctx.answers && parts[0] in ctx.answers) {
        const fieldValue = ctx.answers[parts[0]]
        if (fieldValue && typeof fieldValue === 'object') {
          // Try to resolve the rest of the path from the field value
          let nestedValue: any = fieldValue
          let nestedFound = true
          for (let i = 1; i < parts.length; i++) {
            if (nestedValue && typeof nestedValue === 'object' && parts[i] in nestedValue) {
              nestedValue = nestedValue[parts[i]]
            } else {
              nestedFound = false
              break
            }
          }
          if (nestedFound && nestedValue !== undefined) {
            return nestedValue
          }
        }
      }
      
      // Also check if fieldName is in mockContext (even if not selected, we added .value for all fields)
      if (parts.length > 1 && parts[0] in ctx) {
        const fieldObj = ctx[parts[0]]
        if (fieldObj && typeof fieldObj === 'object') {
          let nestedValue: any = fieldObj
          let nestedFound = true
          for (let i = 1; i < parts.length; i++) {
            if (nestedValue && typeof nestedValue === 'object' && parts[i] in nestedValue) {
              nestedValue = nestedValue[parts[i]]
            } else {
              nestedFound = false
              break
            }
          }
          if (nestedFound && nestedValue !== undefined) {
            return nestedValue
          }
        }
      }
      
      // Fallback: if single part and not in context, try answers
      if (parts.length === 1 && ctx.answers && parts[0] in ctx.answers) {
        return ctx.answers[parts[0]]
      }
      
      return undefined
    }

    // Try to render template with mock data (simple replacement)
    const renderTemplate = (template: string): string => {
      let rendered = template
      
      // Replace {{.variable}} patterns (including nested like {{.answers.email}})
      // We need to replace inside JSON strings, so we need to handle JSON escaping
      const regex = /\{\{\.([\w.]+)\}\}/g
      rendered = rendered.replace(regex, (match, varPath) => {
        const value = getNestedValue(varPath, mockContext)
        if (value === undefined) {
          // If not found, try answers.fieldName as fallback
          if (!varPath.includes('.')) {
            const fallbackValue = mockContext.answers?.[varPath]
            if (fallbackValue !== undefined) {
              // For JSON context, we need to properly escape
              if (typeof fallbackValue === 'string') {
                // Escape quotes and backslashes for JSON
                return JSON.stringify(fallbackValue).slice(1, -1) // Remove outer quotes
              }
              if (typeof fallbackValue === 'number' || typeof fallbackValue === 'boolean') {
                return String(fallbackValue)
              }
              // For objects, stringify and escape quotes
              return JSON.stringify(JSON.stringify(fallbackValue)).slice(1, -1)
            }
          }
          return match // Keep placeholder if not found
        }
        
        // We're inside a JSON string, so we need to escape properly
        if (typeof value === 'string') {
          // Escape the string for JSON context (remove outer quotes from JSON.stringify)
          return JSON.stringify(value).slice(1, -1)
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value)
        }
        // For objects/arrays, we need to decide: stringify once (for JSON embedding) or escape as string?
        // If we're inside a JSON string value, we should escape it properly
        // The result should be: if template is {"text": "Phone: {{.phone_number}}"}
        // We want: {"text": "Phone: {\"e164\":\"+96550000000\",\"country\":\"KW\"}"}
        // But that's not ideal - better would be to use {{json .phone_number}} for objects
        // For now, stringify once (which will be escaped when placed in JSON string)
        const jsonStr = JSON.stringify(value)
        // Escape quotes and backslashes for JSON string context
        return jsonStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      })
      
      // Replace {{json .variable}} patterns
      const jsonRegex = /\{\{json\s+\.([\w.]+)\}\}/g
      rendered = rendered.replace(jsonRegex, (match, varPath) => {
        const value = getNestedValue(varPath, mockContext)
        return JSON.stringify(value ?? null)
      })
      
      return rendered
    }

    // If template is provided, try to render it with mock data
    if (w.body_template && w.body_template.trim()) {
      try {
        const rendered = renderTemplate(w.body_template)
        // Try to format as JSON if it's valid JSON
        try {
          const parsed = JSON.parse(rendered)
          return {
            method: w.http_method || 'POST',
            url: w.endpoint_url || '',
            headers: (() => {
              try {
                return headersText.trim() ? JSON.parse(headersText) : {}
              } catch {
                return {}
              }
            })(),
            contentType: w.content_type || 'application/json',
            body: JSON.stringify(parsed, null, 2),
            rawTemplate: w.body_template,
            isTemplate: true
          }
        } catch {
          // Not valid JSON, show as-is
          return {
            method: w.http_method || 'POST',
            url: w.endpoint_url || '',
            headers: (() => {
              try {
                return headersText.trim() ? JSON.parse(headersText) : {}
              } catch {
                return {}
              }
            })(),
            contentType: w.content_type || 'application/json',
            body: rendered,
            rawTemplate: w.body_template,
            isTemplate: true
          }
        }
      } catch {
        // Fallback: show raw template
        return {
          method: w.http_method || 'POST',
          url: w.endpoint_url || '',
          headers: (() => {
            try {
              return headersText.trim() ? JSON.parse(headersText) : {}
            } catch {
              return {}
            }
          })(),
          contentType: w.content_type || 'application/json',
          body: w.body_template,
          rawTemplate: w.body_template,
          isTemplate: true
        }
      }
    } else {
      // No template: show empty body by default
      return {
        method: w.http_method || 'POST',
        url: w.endpoint_url || '',
        headers: (() => {
          try {
            return headersText.trim() ? JSON.parse(headersText) : {}
          } catch {
            return {}
          }
        })(),
        contentType: w.content_type || 'application/json',
        body: '{}',
        isTemplate: false
      }
    }
  }, [w.selected_fields, w.body_template, w.http_method, w.endpoint_url, w.content_type, headersText, formId, version, formFields])

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-800 p-4 rounded shadow w-[720px] max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">{value? 'Edit':'Add'} Webhook</h3><button className="dark:text-slate-300" onClick={onCancel}>Close</button></div>
        {err && <div className="text-red-600 dark:text-red-400 text-sm mb-2">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Type<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.type} onChange={e=>setW(prev=>({ ...prev, type: e.target.value as any }))}><option value="http">http</option></select></label>
          <label className="block">Enabled<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={String(w.enabled)} onChange={e=>setW(prev=>({ ...prev, enabled: e.target.value==='true' }))}><option value="true">true</option><option value="false">false</option></select></label>
          <label className="block col-span-2">Endpoint URL<input className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.endpoint_url} onChange={e=>setW(prev=>({ ...prev, endpoint_url:e.target.value }))} /></label>
          <label className="block">HTTP Method<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.http_method} onChange={e=>setW(prev=>({ ...prev, http_method:e.target.value }))}><option>POST</option><option>PUT</option><option>PATCH</option></select></label>
          <label className="block">Mode<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.mode} onChange={e=>setW(prev=>({ ...prev, mode:e.target.value as any }))}><option value="raw">raw</option></select></label>
          <label className="block">Content Type<select className="border p-1 w-full dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={w.content_type || 'application/json'} onChange={e=>setW(prev=>({ ...prev, content_type:e.target.value }))}><option value="application/json">application/json</option><option value="text/plain">text/plain</option></select></label>
          <label className="block col-span-2">Available Fields (click to insert into body template)
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Click a field pill to insert its placeholder at your cursor position in the body template below.
            </div>
            <div className="flex flex-wrap gap-2 p-2 border rounded dark:border-slate-600 dark:bg-slate-800 min-h-[60px]">
              {formFields.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading fields...</div>
              ) : (
                formFields.map(field => (
                  <button
                    key={field.name}
                    type="button"
                    onClick={() => insertFieldAtCursor(field.name)}
                    className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer border border-blue-300 dark:border-blue-700"
                    title={`Click to insert {{.${field.name}.value}} at cursor position`}
                  >
                    {field.name}
                    {field.label_json?.en && (
                      <span className="ml-1 text-xs opacity-75">({field.label_json.en})</span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Fields insert as {'{'}{'{'}.fieldName{'}'}{'}'}. To use {'{'}{'{'}.answers.fieldName{'}'}{'}'}, type it manually.
            </div>
          </label>
          <label className="block col-span-2">Headers (JSON)
            <textarea className="border p-1 w-full h-32 font-mono text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={headersText} onChange={e=>setHeadersText(e.target.value)} />
          </label>
          <label className="block col-span-2">Body Template (required - design your own body using placeholders)
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Design your webhook body here. Use placeholders: formId, version, submissionId, submittedAt, selected fields ({'{'}{'{'}.fieldName{'}'}{'}'}), selected ({'{'}{'{'}.selected{'}'}{'}'}), answers ({'{'}{'{'}.answers{'}'}{'}'}), meta. For JSON injection use: {'{'}{'{'}json .fieldName{'}'}{'}'}. If left empty, webhook will send empty body: {'{}'}
            </div>
            <textarea 
              ref={bodyTemplateRef}
              className="border p-1 w-full h-40 font-mono text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
              placeholder={`{"text": "New submission from {{.formId}}", "email": "{{.email}}", "phone": "{{.phone_number}}"}`} 
              value={w.body_template || ''} 
              onChange={handleBodyTemplateChange}
              onKeyUp={handleBodyTemplateKeyUp}
              onClick={handleBodyTemplateClick}
            />
          </label>
        </div>
        <div className="mt-4 border-t pt-4 dark:border-slate-600">
          <h4 className="font-semibold mb-3">Preview</h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-semibold">Method:</span> <span className="font-mono">{generatePreview.method}</span>
            </div>
            <div>
              <span className="font-semibold">URL:</span> <span className="font-mono break-all">{generatePreview.url || '(empty)'}</span>
            </div>
            <div>
              <span className="font-semibold">Content-Type:</span> <span className="font-mono">{generatePreview.contentType}</span>
            </div>
            <div>
              <span className="font-semibold">Headers:</span>
              <pre className="bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 overflow-x-auto font-mono text-xs">{JSON.stringify(generatePreview.headers, null, 2)}</pre>
            </div>
            <div>
              <span className="font-semibold">Request Body:</span>
              {generatePreview.isTemplate ? (
                <div className="mt-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Preview (rendered with example data):
                  </div>
                  <pre className="bg-slate-50 dark:bg-slate-900 p-2 rounded overflow-x-auto font-mono text-xs whitespace-pre-wrap">{generatePreview.body}</pre>
                  {generatePreview.rawTemplate && generatePreview.rawTemplate !== generatePreview.body && (
                    <div className="mt-2">
                      <details className="text-xs">
                        <summary className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                          Show raw template
                        </summary>
                        <pre className="bg-slate-100 dark:bg-slate-950 p-2 rounded mt-1 overflow-x-auto font-mono text-xs whitespace-pre-wrap">{generatePreview.rawTemplate}</pre>
                      </details>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Note: This is a preview with example values. Actual values will be used when the webhook is triggered.
                    <br />
                    <strong>Tip:</strong> Objects/arrays inside JSON strings get escaped. Use {'{'}{'{'}json .fieldName{'}'}{'}'} to embed them as JSON objects instead.
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Empty body (no template configured):</div>
                  <pre className="bg-slate-50 dark:bg-slate-900 p-2 rounded overflow-x-auto font-mono text-xs">{generatePreview.body}</pre>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Design your body template above to customize the webhook payload.</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="bg-blue-600 text-white px-3 py-1 rounded dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600" onClick={save}>Save</button>
          {value?.id && (
            <button className="bg-green-600 text-white px-3 py-1 rounded dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50" onClick={testFromEditor} disabled={testing}>
              {testing ? 'Testing...' : 'Test'}
            </button>
          )}
          <button className="px-3 py-1 border rounded dark:border-slate-600 dark:hover:bg-slate-700" onClick={onCancel}>Cancel</button>
        </div>
        {testResult && (
          <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded shadow w-[800px] max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Webhook Test Result</h3>
                <button className="dark:text-slate-300" onClick={()=>{ setTestResult(null); setTesting(false) }}>Close</button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Status</div>
                  <div className={`inline-block px-3 py-1 rounded ${testResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                    {testResult.statusCode} {testResult.statusText}
                  </div>
                  {testResult.error && <div className="text-red-600 dark:text-red-400 text-sm mt-2">{testResult.error}</div>}
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Request</div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs font-mono">
                    <div className="mb-1"><span className="font-semibold">Method:</span> {testResult.requestMethod}</div>
                    <div className="mb-1"><span className="font-semibold">URL:</span> {testResult.requestUrl}</div>
                    <div className="mt-2"><span className="font-semibold">Body:</span></div>
                    <pre className="mt-1 overflow-x-auto">{testResult.requestBody}</pre>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Response</div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs font-mono">
                    <div className="mb-2"><span className="font-semibold">Headers:</span></div>
                    <pre className="mb-2 overflow-x-auto">{JSON.stringify(testResult.responseHeaders, null, 2)}</pre>
                    <div className="mb-2"><span className="font-semibold">Body:</span></div>
                    <pre className="overflow-x-auto">{testResult.responseBody || '(empty)'}</pre>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Performance</div>
                  <div className="text-sm">Duration: {testResult.durationMs}ms</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type TestResult = {
  success: boolean
  statusCode: number
  statusText: string
  responseBody: string
  responseHeaders: Record<string, string>
  durationMs: number
  error?: string
  requestUrl: string
  requestMethod: string
  requestBody: string
}

export const Webhooks: React.FC = () => {
  const [forms, setForms] = React.useState<FormSnapshot[]>([])
  const [formId, setFormId] = React.useState<string>('')
  const [version, setVersion] = React.useState<number>(0)
  const [items, setItems] = React.useState<Item[]>([])
  const [showEditor, setShowEditor] = React.useState(false)
  const [editing, setEditing] = React.useState<Item|undefined>(undefined)
  const [loading, setLoading] = React.useState(false)
  const [testing, setTesting] = React.useState<Item|undefined>(undefined)
  const [testResult, setTestResult] = React.useState<TestResult|null>(null)

  // Load forms list
  const loadForms = async () => {
    try {
      const r = await fetch('/api/forms', { headers:{ Authorization:'Bearer dev-admin-token' } })
      if (!r.ok) {
        console.error('Failed to load forms:', r.status, await r.text())
        return
      }
      const data = await r.json()
      setForms(data)
    } catch (err) {
      console.error('Error loading forms:', err)
    }
  }

  // Load webhooks for selected form/version
  const loadWebhooks = React.useCallback(async () => {
    if (!formId || !version) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const r = await fetch(`/api/forms/${encodeURIComponent(formId)}/${version}/webhooks`, { headers:{ Authorization:'Bearer dev-admin-token' } })
      if (r.ok) {
        setItems(await r.json())
      } else {
        setItems([])
      }
    } catch (err) {
      console.error('Error loading webhooks:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [formId, version])

  // Get unique form IDs
  const formIds = React.useMemo(() => {
    const unique = new Set<string>()
    forms.forEach(f => unique.add(f.formId))
    return Array.from(unique).sort()
  }, [forms])

  // Get versions for selected form ID
  const versions = React.useMemo(() => {
    if (!formId) return []
    return forms
      .filter(f => f.formId === formId)
      .sort((a, b) => b.version - a.version) // Sort descending (newest first)
      .map(f => f.version)
  }, [forms, formId])

  // Load forms on mount
  React.useEffect(() => { loadForms() }, [])

  // Auto-select first form when forms are loaded
  React.useEffect(() => {
    if (forms.length > 0 && !formId) {
      setFormId(forms[0].formId)
      setVersion(forms[0].version)
    }
  }, [forms, formId])

  // Reset version when formId changes
  React.useEffect(() => {
    if (formId && versions.length > 0 && !versions.includes(version)) {
      setVersion(versions[0])
    }
  }, [formId, versions, version])

  // Auto-load webhooks when formId or version changes
  React.useEffect(() => { loadWebhooks() }, [loadWebhooks])

  const testWebhook = async (webhook: Item) => {
    if (!formId || !version) return
    setTesting(webhook)
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(formId)}/${version}/webhooks/${webhook.id}/test`, {
        method: 'POST',
        headers: { Authorization: 'Bearer dev-admin-token' }
      })
      const result = await res.json()
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        statusCode: 0,
        statusText: 'Error',
        responseBody: '',
        responseHeaders: {},
        durationMs: 0,
        error: String(err),
        requestUrl: webhook.endpoint_url,
        requestMethod: webhook.http_method,
        requestBody: ''
      })
    } finally {
      setTesting(undefined)
    }
  }

  const canAddWebhook = formId && version > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="block">
          Form ID
          <select 
            className="border p-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 min-w-[200px]" 
            value={formId} 
            onChange={e => setFormId(e.target.value)}
          >
            <option value="">-- Select Form --</option>
            {formIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Version
          <select 
            className="border p-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 w-32" 
            value={version || ''} 
            onChange={e => setVersion(Number(e.target.value) || 0)}
            disabled={!formId}
          >
            <option value="">-- Select --</option>
            {versions.map(v => (
              <option key={v} value={v}>v{v}</option>
            ))}
          </select>
        </label>
        <button 
          className="bg-blue-600 text-white px-3 py-1 rounded dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={()=>{ setEditing(undefined); setShowEditor(true) }}
          disabled={!canAddWebhook}
        >
          Add webhook
        </button>
      </div>
      {loading && <div className="text-sm text-gray-600 dark:text-gray-400">Loading webhooks...</div>}
      <table className="w-full border text-sm dark:border-slate-600">
        <thead><tr className="bg-slate-50 dark:bg-slate-800"><th className="border p-2 text-left dark:border-slate-600">Type</th><th className="border p-2 text-left dark:border-slate-600">Endpoint</th><th className="border p-2 text-left dark:border-slate-600">Method</th><th className="border p-2 text-left dark:border-slate-600">Mode</th><th className="border p-2 text-left dark:border-slate-600">Enabled</th><th className="border p-2 dark:border-slate-600"></th></tr></thead>
        <tbody>
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="border p-4 text-center text-gray-500 dark:text-gray-400">
                {formId && version ? 'No webhooks configured for this form snapshot' : 'Select a form and version to view webhooks'}
              </td>
            </tr>
          )}
          {items.map(i => (
            <tr key={i.id}>
              <td className="border p-2 dark:border-slate-600">{i.type}</td>
              <td className="border p-2 truncate max-w-[320px] dark:border-slate-600" title={i.endpoint_url}>{i.endpoint_url}</td>
              <td className="border p-2 dark:border-slate-600">{i.http_method}</td>
              <td className="border p-2 dark:border-slate-600">{i.mode}</td>
              <td className="border p-2 dark:border-slate-600">{String(i.enabled)}</td>
              <td className="border p-2 text-right space-x-2 dark:border-slate-600">
                <button className="underline dark:text-blue-400" onClick={()=>{ setEditing(i); setShowEditor(true) }}>Edit</button>
                <button className="underline text-green-600 dark:text-green-400" onClick={()=>{ testWebhook(i) }} disabled={!!testing}>Test</button>
                <button className="underline text-red-600 dark:text-red-400" onClick={async ()=>{ if (!confirm('Delete webhook?')) return; await fetch(`/api/forms/${encodeURIComponent(formId)}/${version}/webhooks/${i.id}`, { method:'DELETE', headers:{ Authorization:'Bearer dev-admin-token' } }); loadWebhooks() }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showEditor && <Editor value={editing} onCancel={()=>setShowEditor(false)} onSaved={()=>{ setShowEditor(false); loadWebhooks() }} formId={formId} version={version} />}
      {testResult && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded shadow w-[800px] max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Webhook Test Result</h3>
              <button className="dark:text-slate-300" onClick={()=>{ setTestResult(null); setTesting(undefined) }}>Close</button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Status</div>
                <div className={`inline-block px-3 py-1 rounded ${testResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                  {testResult.statusCode} {testResult.statusText}
                </div>
                {testResult.error && <div className="text-red-600 dark:text-red-400 text-sm mt-2">{testResult.error}</div>}
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Request</div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs font-mono">
                  <div className="mb-1"><span className="font-semibold">Method:</span> {testResult.requestMethod}</div>
                  <div className="mb-1"><span className="font-semibold">URL:</span> {testResult.requestUrl}</div>
                  <div className="mt-2"><span className="font-semibold">Body:</span></div>
                  <pre className="mt-1 overflow-x-auto">{testResult.requestBody}</pre>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Response</div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs font-mono">
                  <div className="mb-2"><span className="font-semibold">Headers:</span></div>
                  <pre className="mb-2 overflow-x-auto">{JSON.stringify(testResult.responseHeaders, null, 2)}</pre>
                  <div className="mb-2"><span className="font-semibold">Body:</span></div>
                  <pre className="overflow-x-auto">{testResult.responseBody || '(empty)'}</pre>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Performance</div>
                <div className="text-sm">Duration: {testResult.durationMs}ms</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


