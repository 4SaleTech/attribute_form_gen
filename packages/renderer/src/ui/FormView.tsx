import React from 'react';
import type { ComponentsRegistry, FormConfig, Field } from '../renderer/types';
import { runSubmitPipeline } from '../workflow/submit';

// Brand Colors
const COLORS = {
  primary: '#2E4BFF',
  primaryHover: '#2640E6',
  primaryDisabled: 'rgba(46, 75, 255, 0.5)',
  heading: '#0D1635',
  helper: '#6B7280',
  border: '#E5E7EB',
  borderError: '#EF4444',
  bgError: '#FEF2F2',
  bgErrorHover: '#FEE2E2',
  bgHover: '#F9FAFB',
  white: '#FFFFFF',
  placeholder: '#9CA3AF',
};

// Typography - Font Family
const FONT_FAMILY = 'Sakr, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type FieldError = { field: string; code: string; message: Record<string,string>; details?: any }

function getLocaleFromURL(defaultLocale: string) {
  const u = new URL(window.location.href)
  const q = u.searchParams.get('lang')
  return q === 'ar' || q === 'en' ? q : defaultLocale || 'en'
}

function validateClient(form: FormConfig, answers: Record<string, any>, locale: 'en'|'ar'): FieldError[] {
  const errs: FieldError[] = []
  const t = (en: string, ar: string) => ({ en, ar })
  const isReq = (f: Field) => !!(f as any)?.props?.required
  const get = (name: string) => answers[name]
  for (const f of form.fields) {
    const v = get(f.name)
    if (isReq(f) && (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0))) {
      errs.push({ field: f.name, code: 'REQUIRED', message: t('Required', 'مطلوب') })
      continue
    }
    switch (f.type) {
      case 'text':
      case 'textarea':
        if (v == null) break
        if (typeof v !== 'string') { errs.push({ field: f.name, code: 'INVALID', message: t('Invalid text', 'نص غير صالح') }); break }
        if ((f as any).props?.max_length && v.length > (f as any).props.max_length) {
          errs.push({ field: f.name, code: 'TOO_LONG', message: t('Too long', 'طويل جداً') })
        }
        if ((f as any).props?.pattern) {
          try { const re = new RegExp((f as any).props.pattern); if (!re.test(v)) errs.push({ field: f.name, code: 'PATTERN', message: t('Does not match pattern', 'لا يطابق النمط') }) } catch {}
        }
        break
      case 'number':
        if (v == null) break
        const num = Number(v)
        if (Number.isNaN(num)) { errs.push({ field: f.name, code: 'INVALID', message: t('Invalid number', 'رقم غير صالح') }); break }
        if ((f as any).props?.min != null && num < (f as any).props.min) errs.push({ field: f.name, code: 'MIN', message: t('Too small', 'صغير جداً') })
        if ((f as any).props?.max != null && num > (f as any).props.max) errs.push({ field: f.name, code: 'MAX', message: t('Too large', 'كبير جداً') })
        break
      case 'select':
        if (v == null) break
        if (!(f as any).props?.allow_custom && !(f as any).props?.allow_other) {
          const options: any[] = (f as any).props?.options || []
          const found = options.some(o => o.value === v?.value)
          if (!found && v?.value !== 'other') {
            errs.push({ field: f.name, code: 'NOT_ALLOWED', message: t('Not in options', 'غير موجود ضمن الخيارات') })
          }
        }
        // If "other" is selected, validate that other text is provided
        if (v?.value === 'other' && (!v?.other || v.other.trim() === '')) {
          errs.push({ field: f.name, code: 'REQUIRED', message: t('Please provide details for "Other"', 'يرجى إدخال التفاصيل لـ "أخرى"') })
        }
        break
      case 'multiselect':
        if (v == null) break
        if (!(f as any).props?.allow_custom) {
          const options: any[] = (f as any).props?.options || []
          for (const it of (Array.isArray(v)?v:[])) {
            if (!options.some(o => o.value === it?.value)) {
              errs.push({ field: f.name, code: 'NOT_ALLOWED', message: t('Not in options', 'غير موجود ضمن الخيارات') })
              break
            }
          }
        }
        break
      case 'email':
        if (v == null) break
        const em = String(v).toLowerCase().trim()
        if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(em)) errs.push({ field: f.name, code: 'INVALID_EMAIL', message: t('Invalid email', 'بريد إلكتروني غير صالح') })
        break
      case 'phone':
        if (v == null) break
        const phoneObj = typeof v === 'object' ? v : { e164: v, country: 'KW' }
        if ((f as any).props?.e164_required) {
          if (!/^\+[1-9]\d{7,14}$/.test(phoneObj?.e164 || '')) {
            errs.push({ field: f.name, code: 'E164', message: t('Invalid E.164', 'تنسيق E.164 غير صالح') })
          }
        }
        // Basic validation: ensure e164 exists
        if (!phoneObj?.e164) {
          errs.push({ field: f.name, code: 'REQUIRED', message: t('Phone number required', 'رقم الهاتف مطلوب') })
        }
        break
      case 'file_upload':
        if (v == null) break
        const arr = Array.isArray(v) ? v : []
        const maxFiles = (f as any).props?.max_files || 1
        if (arr.length > maxFiles) errs.push({ field: f.name, code: 'TOO_MANY', message: t('Too many files', 'عدد ملفات كبير') })
        break
      case 'location':
        if (v == null) break
        if (typeof v !== 'object' || v === null || Array.isArray(v)) {
          errs.push({ field: f.name, code: 'INVALID', message: t('Invalid location', 'موقع غير صالح') })
          break
        }
        const lat = v.lat
        const lng = v.lng
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          errs.push({ field: f.name, code: 'INVALID', message: t('Invalid coordinates', 'إحداثيات غير صالحة') })
        } else {
          if (lat < -90 || lat > 90) errs.push({ field: f.name, code: 'INVALID', message: t('Invalid latitude', 'خط عرض غير صالح') })
          if (lng < -180 || lng > 180) errs.push({ field: f.name, code: 'INVALID', message: t('Invalid longitude', 'خط طول غير صالح') })
        }
        break
    }
  }
  return errs
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: COLORS.white,
  fontFamily: FONT_FAMILY,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
};

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  backgroundColor: COLORS.white,
  borderBottom: `1px solid ${COLORS.border}`,
  zIndex: 10,
  padding: '1rem 1.5rem',
};

const headerInnerStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: COLORS.heading,
  letterSpacing: '-0.025em',
  lineHeight: 1.2,
  margin: 0,
};

const formStyle: React.CSSProperties = {
  paddingBottom: '7rem',
};

const formContainerStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const buttonContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: COLORS.white,
  borderTop: `1px solid ${COLORS.border}`,
  padding: '1rem',
};

const buttonContainerDesktopStyle: React.CSSProperties = {
  ...buttonContainerStyle,
  position: 'static',
  borderTop: 'none',
  maxWidth: '640px',
  margin: '0 auto',
  padding: '2rem 1.5rem 0',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: COLORS.primary,
  color: COLORS.white,
  fontWeight: 600,
  padding: '1rem 1.5rem',
  borderRadius: '32px',
  fontSize: '16px',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
};

const buttonHoverStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: COLORS.primaryHover,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: COLORS.primaryDisabled,
  cursor: 'not-allowed',
  boxShadow: 'none',
};

export const FormView: React.FC<{ form: FormConfig; components: ComponentsRegistry; locale?: string; flags: Record<string, boolean> }> = ({ form, components, locale, flags }) => {
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<FieldError[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [buttonHover, setButtonHover] = React.useState(false)
  const effectiveLocale = (locale as any) || (getLocaleFromURL(form.default_locale) as any)
  const onChange = (name: string, value: any) => setAnswers((a) => ({ ...a, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = validateClient(form, answers, effectiveLocale)
    setErrors(clientErrors)
    if (clientErrors.length) return
    setSubmitting(true)
    try {
      await runSubmitPipeline(form, {
        formId: form.formId,
        version: form.version,
        submittedAt: Date.now(),
        answers,
        meta: { locale: effectiveLocale, device: 'web', attributes: form.attributes, sessionId: (window as any).__sessionId || '' },
      });
      setSubmitted(true)
      if (form.thankYou?.show) {
        // Show thank you message
      }
    } catch (err: any) {
      console.error('Submit error:', err)
      // If server returned validation errors, display them
      if (err.errors && Array.isArray(err.errors)) {
        const serverErrors = err.errors.map((e: any) => ({
          field: e.field,
          code: e.code,
          message: e.message?.[effectiveLocale] || e.message || 'Validation error'
        }))
        setErrors([...errors, ...serverErrors])
      } else {
        // Show generic error message
        alert(effectiveLocale === 'ar' ? 'حدث خطأ أثناء إرسال النموذج' : 'An error occurred while submitting the form')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted && form.thankYou?.show) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem', textAlign: 'center' }}>
          <h1 style={{ ...titleStyle, marginBottom: '1rem' }}>{form.thankYou.title?.[effectiveLocale]}</h1>
          <p style={{ fontSize: '15px', color: COLORS.helper, lineHeight: 1.6 }}>{form.thankYou.message?.[effectiveLocale]}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerInnerStyle}>
          <h1 style={titleStyle}>{form.title?.[effectiveLocale]}</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={formContainerStyle}>
          {form.fields.map((f, index) => {
            const Comp = components[f.type];
            if (!Comp) return null;
            const fieldErrors = errors.filter(er => er.field === f.name)
            const prevField = index > 0 ? form.fields[index - 1] : null
            const nextField = index < form.fields.length - 1 ? form.fields[index + 1] : null
            
            const isDateField = f.type === 'date'
            const isTimeField = f.type === 'time'
            const shouldGroupDateTime = isDateField && nextField?.type === 'time'
            
            if (shouldGroupDateTime) {
              const TimeComp = components[nextField.type]
              return (
                <div key={f.attribute_key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Comp({ ...f, locale: effectiveLocale, value: answers[f.name], onChange: (v: any) => onChange(f.name, v), required: !!(f as any)?.props?.required, hasError: fieldErrors.length > 0 })}
                    {TimeComp && TimeComp({ ...nextField, locale: effectiveLocale, value: answers[nextField.name], onChange: (v: any) => onChange(nextField.name, v), required: !!(nextField as any)?.props?.required, hasError: errors.filter(er => er.field === nextField.name).length > 0 })}
                  </div>
                  {fieldErrors.map(er => (
                    <div key={er.code} style={{ fontSize: '14px', color: COLORS.borderError, marginLeft: '0.25rem', marginTop: '0.25rem' }}>{er.message[effectiveLocale]}</div>
                  ))}
                  {errors.filter(er => er.field === nextField.name).map(er => (
                    <div key={er.code} style={{ fontSize: '14px', color: COLORS.borderError, marginLeft: '0.25rem', marginTop: '0.25rem' }}>{er.message[effectiveLocale]}</div>
                  ))}
                </div>
              )
            }
            
            if (isTimeField && prevField?.type === 'date') {
              return null
            }
            
            return (
              <div key={f.attribute_key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Comp({ ...f, locale: effectiveLocale, value: answers[f.name], onChange: (v: any) => onChange(f.name, v), required: !!(f as any)?.props?.required, hasError: fieldErrors.length > 0 })}
                {fieldErrors.map(er => (
                  <div key={er.code} style={{ fontSize: '14px', color: COLORS.borderError, marginLeft: '0.25rem', marginTop: '0.25rem' }}>{er.message[effectiveLocale]}</div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div 
          style={typeof window !== 'undefined' && window.innerWidth >= 768 ? buttonContainerDesktopStyle : buttonContainerStyle}
        >
          <button
            type="submit"
            disabled={submitting}
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
            style={submitting ? buttonDisabledStyle : (buttonHover ? buttonHoverStyle : buttonStyle)}
          >
            {submitting ? (effectiveLocale === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (effectiveLocale === 'ar' ? 'إرسال' : 'Submit')}
          </button>
        </div>
      </form>
    </div>
  );
};
