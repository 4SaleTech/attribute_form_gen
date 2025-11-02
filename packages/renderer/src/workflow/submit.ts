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

async function serverPersist(payload: Payload) {
  const res = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || 'persist failed');
    (error as any).status = res.status;
    (error as any).errors = errorData.errors || [];
    throw error;
  }
  return true;
}

async function runWithTimeout<T>(p: Promise<T>, ms?: number): Promise<T> {
  if (!ms || ms <= 0) return p;
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function redirectAction(url?: string) {
  return async () => {
    if (!url) return true
    try { window.location.href = url; } catch {}
    return true
  }
}

export async function runSubmitPipeline(form: FormConfig, payload: Payload) {
  const submit = form.submit;
  if (!submit) return;
  const actionMap: Record<string, (p: Payload) => Promise<any>> = {
    native_bridge: nativeBridge,
    server_persist: serverPersist,
    webhooks: async () => true,
    redirect: async () => true,
  }
  for (const step of submit.ordering) {
    const action = submit.actions.find((a) => a.type === step);
    if (!action || !action.enabled) continue;
    try {
      if (step === 'redirect') {
        const redirectCfg = submit.actions.find(a=>a.type==='redirect') as any
        await runWithTimeout(redirectAction(redirectCfg?.url)(), submit.timeout_ms)
      } else {
        await runWithTimeout(actionMap[step](payload), submit.timeout_ms)
      }
    } catch (e) {
      if (submit.on_error === 'show_error') { try { alert('Submit step failed'); } catch {} }
      if (submit.on_error === 'stop') throw e;
    }
  }
}


