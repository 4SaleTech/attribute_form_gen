import type { FormConfig } from '../renderer/types';

type Payload = {
  formId: string;
  version: number;
  submittedAt: number;
  answers: any;
  meta: any;
  bridgeAck?: boolean;
};

async function nativeBridge(payload: Payload) {
  try {
    // RN WebView
    // @ts-ignore
    if (window.ReactNativeWebView?.postMessage) {
      // @ts-ignore
      const message = JSON.stringify({ type: 'form_submit', payload });
      window.ReactNativeWebView.postMessage(message);
      console.log('[Native Bridge] Sent to React Native:', message);
      return true;
    }
    // iOS WKWebView
    // @ts-ignore
    if (window.webkit?.messageHandlers?.bridge) {
      // @ts-ignore
      const message = { type: 'form_submit', payload };
      window.webkit.messageHandlers.bridge.postMessage(message);
      console.log('[Native Bridge] Sent to iOS:', message);
      return true;
    }
    // Android interface
    // @ts-ignore
    if (window.AndroidBridge?.postMessage) {
      // @ts-ignore
      const message = JSON.stringify({ type: 'form_submit', payload });
      window.AndroidBridge.postMessage(message);
      console.log('[Native Bridge] Sent to Android:', message);
      return true;
    }
  } catch (e) {
    console.error('[Native Bridge] Error:', e);
    throw e;
  }
  // No bridge available - this is normal in web browsers
  console.log('[Native Bridge] No native bridge detected - this is normal in web browsers');
  return true; // no-op when not available
}

async function serverPersist(payload: Payload): Promise<{ success: boolean; submissionId?: number }> {
  const res = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || 'persist failed');
    (error as any).status = res.status;
    (error as any).errors = errorData.errors || [];
    throw error;
  }
  const data = await res.json().catch(() => ({}));
  return { 
    success: true, 
    submissionId: data.id || data.submissionId || undefined 
  };
}

// Cache the Next.js URL to avoid fetching on every submission
let cachedNextJSUrl: string | null = null;
let configFetchPromise: Promise<string | null> | null = null;

async function getNextJSUrl(): Promise<string | null> {
  // Return cached value if available
  if (cachedNextJSUrl !== null) {
    return cachedNextJSUrl;
  }
  
  // If already fetching, return that promise
  if (configFetchPromise) {
    return configFetchPromise;
  }
  
  // Fetch config from API
  configFetchPromise = fetch('/api/config')
    .then(res => res.json())
    .then((data: any) => {
      if (data.nextjsPost?.enabled && data.nextjsPost?.url) {
        cachedNextJSUrl = data.nextjsPost.url;
        return cachedNextJSUrl;
      }
      return null;
    })
    .catch((e) => {
      console.error('[Next.js POST] Failed to fetch config:', e);
      return null;
    })
    .finally(() => {
      configFetchPromise = null;
    });
  
  return configFetchPromise;
}

// Format answer value to string representation
function formatAnswer(value: any, locale: string): string {
  if (value == null) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number') {
    // Check if it's a whole number
    if (value === Math.floor(value)) {
      return String(value);
    }
    return String(value);
  }
  
  if (typeof value === 'boolean') {
    if (value) {
      return locale === 'ar' ? 'نعم' : 'Yes';
    }
    return locale === 'ar' ? 'لا' : 'No';
  }
  
  if (Array.isArray(value)) {
    // Multiselect or file array: format as comma-separated
    const values: string[] = [];
    for (const item of value) {
      if (item && typeof item === 'object') {
        // Check for "other" option
        if (item.value === 'other' && item.other) {
          values.push(item.other);
          continue;
        }
        if (item.value) {
          values.push(String(item.value));
          continue;
        }
        // File upload: use URL or name
        if (item.url) {
          values.push(item.url);
          continue;
        }
        if (item.name) {
          values.push(item.name);
          continue;
        }
        // Default: JSON string
        values.push(JSON.stringify(item));
      } else {
        values.push(String(item));
      }
    }
    return values.join(', ');
  }
  
  if (typeof value === 'object') {
    // Phone number: extract e164
    if (value.e164) {
      return value.e164;
    }
    // Select/Radio with "other": use the "other" text
    if (value.value === 'other' && value.other) {
      return value.other;
    }
    if (value.value) {
      return String(value.value);
    }
    // Location: format coordinates
    if (typeof value.lat === 'number' && typeof value.lng === 'number') {
      return `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`;
    }
    // File upload: return URL
    if (value.url) {
      return value.url;
    }
    // Default: JSON string
    return JSON.stringify(value);
  }
  
  return String(value);
}

// Transform answers to array format with question labels
function transformAnswersToArray(
  answers: Record<string, any>,
  fields: FormConfig['fields'],
  locale: string
): Array<{ question: string; answer: string }> {
  const result: Array<{ question: string; answer: string }> = [];
  
  // Create map of field name -> label
  const fieldLabels: Record<string, string> = {};
  for (const field of fields) {
    if (field.label) {
      if (field.label[locale]) {
        fieldLabels[field.name] = field.label[locale];
      } else if (field.label.en) {
        fieldLabels[field.name] = field.label.en; // fallback to English
      }
    }
  }
  
  for (const [fieldName, value] of Object.entries(answers)) {
    // Get label (question text user sees)
    const questionLabel = fieldLabels[fieldName] || fieldName; // fallback to field name
    
    // Format answer based on type
    const answerStr = formatAnswer(value, locale);
    
    result.push({
      question: questionLabel,
      answer: answerStr,
    });
  }
  
  return result;
}

async function nextjsPost(payload: Payload, form: FormConfig, submissionId?: number) {
  const url = await getNextJSUrl();
  
  if (!url) {
    console.log('[Next.js POST] Not configured or disabled');
    return true; // No-op when not configured
  }
  
  // Get locale from meta
  const locale = (payload.meta?.locale as string) || 'en';
  
  // Transform answers to array format with question labels
  const transformedAnswers = transformAnswersToArray(
    payload.answers,
    form.fields,
    locale
  );
  
  try {
    const body: any = {
      submissionId: submissionId,
      formId: payload.formId,
      version: payload.version,
      submittedAt: payload.submittedAt,
      locale: locale,
      device: payload.meta?.device || '',
      answers: transformedAnswers,
    };
    
    // Only include sessionId if it exists
    if (payload.meta?.sessionId) {
      body.sessionId = payload.meta.sessionId;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Next.js POST failed');
      throw new Error(`Next.js POST failed: ${response.status} - ${errorText}`);
    }
    
    console.log('[Next.js POST] Success:', await response.json().catch(() => ({})));
    return await response.json().catch(() => ({}));
  } catch (e) {
    console.error('[Next.js POST] Error:', e);
    throw e;
  }
}

async function runWithTimeout<T>(p: Promise<T>, ms?: number): Promise<T> {
  if (!ms || ms <= 0) return p;
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// Template context type
type TemplateContext = {
  formId: string;
  version: number;
  submittedAt: number;
  submissionId?: number;
  answers: Record<string, any>;
  meta: any;
  [key: string]: any; // For individual answer fields
};

// Evaluate template string with context variables
// Supports Go-style template syntax: {{.variableName}}
function evaluateTemplate(template: string, context: TemplateContext): string {
  // If no template placeholders, return as-is
  if (!template.includes('{{')) {
    return template;
  }

  // Regex to match {{.variableName}} patterns (supports nested paths like {{.meta.locale}})
  const templateRegex = /\{\{\.([\w.]+)\}\}/g;
  
  return template.replace(templateRegex, (match, varName) => {
    // Get value from context (supports nested paths like meta.locale)
    let value: any = context[varName];
    
    // Handle nested paths (e.g., meta.locale)
    if (value === undefined && varName.includes('.')) {
      const parts = varName.split('.');
      value = context;
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }
    }
    
    // Convert value to string
    let strValue = '';
    if (value === null || value === undefined) {
      strValue = '';
    } else if (typeof value === 'string') {
      strValue = value;
    } else if (typeof value === 'number') {
      strValue = String(value);
    } else if (typeof value === 'boolean') {
      strValue = value ? 'true' : 'false';
    } else if (Array.isArray(value)) {
      // For arrays, join with comma
      strValue = value.map(v => String(v)).join(',');
    } else if (typeof value === 'object') {
      // For objects, try to extract meaningful value
      // Phone: use e164
      if (value.e164) {
        strValue = value.e164;
      }
      // Select/Radio with "other": use "other" text
      else if (value.value === 'other' && value.other) {
        strValue = value.other;
      }
      // Select/Radio: use value
      else if (value.value) {
        strValue = String(value.value);
      }
      // Location: format coordinates
      else if (typeof value.lat === 'number' && typeof value.lng === 'number') {
        strValue = `${value.lat.toFixed(6)},${value.lng.toFixed(6)}`;
      }
      // File upload: use URL
      else if (value.url) {
        strValue = value.url;
      }
      // Default: JSON string
      else {
        strValue = JSON.stringify(value);
      }
    } else {
      strValue = String(value);
    }
    
    return strValue;
  });
}

// URL encode template values in query parameters
function encodeTemplateInURL(url: string, context: TemplateContext): string {
  // Check if URL has template placeholders
  if (!url.includes('{{')) {
    return url;
  }

  try {
    // Try to parse as absolute URL first
    let isAbsolute = false;
    let urlObj: URL | null = null;
    try {
      urlObj = new URL(url);
      isAbsolute = true;
    } catch {
      // Not an absolute URL, will handle as relative
      isAbsolute = false;
    }

    if (isAbsolute && urlObj) {
      // Handle absolute URLs using URL object to preserve existing query params
      const evaluatedPathname = evaluateTemplate(urlObj.pathname, context);
      const evaluatedSearch = urlObj.search; // Keep original search string
      
      // Parse existing query parameters
      const existingParams = new URLSearchParams(evaluatedSearch);
      
      // Evaluate templates in query parameter values
      const newParams = new URLSearchParams();
      existingParams.forEach((value, key) => {
        // Evaluate template in the value
        const evaluatedValue = value.includes('{{') 
          ? evaluateTemplate(value, context) 
          : value;
        newParams.append(key, evaluatedValue);
      });
      
      // Build the final URL
      const resultUrl = new URL(evaluatedPathname, urlObj.origin);
      newParams.forEach((value, key) => {
        resultUrl.searchParams.append(key, value);
      });
      
      return resultUrl.toString();
    } else {
      // Handle relative URLs (starting with /) or other formats
      // Split URL into base and query string
      const [base, queryString] = url.split('?');
      
      if (!queryString) {
        // No query string, just evaluate template in path
        return evaluateTemplate(base, context);
      }
      
      // Evaluate template in base URL
      const evaluatedBase = evaluateTemplate(base, context);
      
      // Parse query string - URLSearchParams handles encoding automatically
      const queryParams = new URLSearchParams(queryString);
      const newParams = new URLSearchParams();
      
      // Process all existing query parameters
      queryParams.forEach((value, key) => {
        // Evaluate template in the value if it contains placeholders
        const evaluatedValue = value.includes('{{') 
          ? evaluateTemplate(value, context) 
          : value;
        // URLSearchParams will handle proper encoding automatically
        newParams.append(key, evaluatedValue);
      });
      
      // Build query string - URLSearchParams.toString() properly formats it
      const queryStr = newParams.toString();
      return queryStr ? `${evaluatedBase}?${queryStr}` : evaluatedBase;
    }
  } catch (e) {
    console.error('[Redirect Template] Error encoding URL:', e);
    // Fallback: just evaluate template without special encoding
    return evaluateTemplate(url, context);
  }
}

function redirectAction(
  urlTemplate?: string,
  payload?: Payload,
  submissionId?: number,
  form?: FormConfig
) {
  return async () => {
    if (!urlTemplate) return true;
    
    try {
      let finalUrl = urlTemplate;
      
      // Check if URL contains template placeholders
      if (urlTemplate.includes('{{') && payload) {
        // Build context object
        const context: TemplateContext = {
          formId: payload.formId,
          version: payload.version,
          submittedAt: payload.submittedAt,
          submissionId: submissionId,
          formSubmissionId: submissionId, // Alias for formSubmissionId template variable
          answers: payload.answers,
          meta: payload.meta || {},
          // Add individual answer fields as top-level variables
          ...payload.answers,
        };
        
        // Evaluate template and encode URL
        finalUrl = encodeTemplateInURL(urlTemplate, context);
        
        // Debug logging to help diagnose issues
        console.log('[Redirect] Template URL:', urlTemplate);
        console.log('[Redirect] Evaluated URL:', finalUrl);
        console.log('[Redirect] URL search params:', finalUrl.includes('?') ? new URLSearchParams(finalUrl.split('?')[1]).toString() : 'none');
        
        // Validate URL before redirecting
        try {
          new URL(finalUrl);
        } catch (e) {
          // If relative URL, try to validate by checking if it starts with / or http
          if (!finalUrl.startsWith('/') && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            console.error('[Redirect Template] Invalid URL after template evaluation:', finalUrl);
            throw new Error('Invalid redirect URL');
          }
        }
      }
      
      window.location.href = finalUrl;
      return true;
    } catch (e) {
      console.error('[Redirect Template] Error:', e);
      // If template evaluation fails, try to use original URL
      try {
        window.location.href = urlTemplate;
        return true;
      } catch (fallbackError) {
        console.error('[Redirect Template] Fallback also failed:', fallbackError);
        return true; // Don't throw - let other actions continue
      }
    }
  };
}

export async function runSubmitPipeline(form: FormConfig, payload: Payload): Promise<{ submissionId?: number }> {
  const submit = form.submit;
  if (!submit) return {};
  
  let submissionId: number | undefined = undefined;
  
  const actionMap: Record<string, (p: Payload) => Promise<any>> = {
    native_bridge: (p) => nativeBridge(p),
    server_persist: async (p) => {
      const result = await serverPersist(p);
      if (result.submissionId) {
        submissionId = result.submissionId;
      }
      return result;
    },
    webhooks: async () => true,
    redirect: async () => true,
    nextjs_post: (p) => nextjsPost(p, form, submissionId),
  }
  for (const step of submit.ordering) {
    const action = submit.actions.find((a) => a.type === step);
    if (!action || !action.enabled) continue;
    try {
      if (step === 'redirect') {
        const redirectCfg = submit.actions.find(a=>a.type==='redirect') as any
        await runWithTimeout(
          redirectAction(redirectCfg?.url, payload, submissionId, form)(),
          submit.timeout_ms
        )
      } else {
        await runWithTimeout(actionMap[step](payload), submit.timeout_ms)
      }
    } catch (e) {
      if (submit.on_error === 'show_error') { try { alert('Submit step failed'); } catch {} }
      if (submit.on_error === 'stop') throw e;
    }
  }
  
  return { submissionId };
}


