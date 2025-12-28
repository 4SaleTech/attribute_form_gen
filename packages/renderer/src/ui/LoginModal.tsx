import React, { useState } from 'react';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  locale: 'en' | 'ar';
};

const COLORS = {
  primary: '#2E4BFF',
  primaryHover: '#2640E6',
  heading: '#0D1635',
  helper: '#6B7280',
  border: '#E5E7EB',
  borderError: '#EF4444',
  bgError: '#FEF2F2',
  white: '#FFFFFF',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

const FONT_FAMILY = 'Sakr, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const translations = {
  en: {
    title: 'Login Required',
    subtitle: 'Please log in to continue with your purchase',
    phone: 'Phone Number',
    phonePlaceholder: 'Enter your phone number',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    login: 'Login',
    cancel: 'Cancel',
    loggingIn: 'Logging in...',
  },
  ar: {
    title: 'تسجيل الدخول مطلوب',
    subtitle: 'يرجى تسجيل الدخول للمتابعة في عملية الشراء',
    phone: 'رقم الهاتف',
    phonePlaceholder: 'أدخل رقم هاتفك',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    login: 'تسجيل الدخول',
    cancel: 'إلغاء',
    loggingIn: 'جاري تسجيل الدخول...',
  },
};

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, locale }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = translations[locale] || translations.en;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await onLogin(phone, password);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPhone('');
      setPassword('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.backdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: FONT_FAMILY,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: COLORS.white,
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: COLORS.heading,
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          {t.title}
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: COLORS.helper,
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          {t.subtitle}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.heading,
                marginBottom: '6px',
              }}
            >
              {t.phone}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                direction: 'ltr',
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.heading,
                marginBottom: '6px',
              }}
            >
              {t.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: COLORS.bgError,
                border: `1px solid ${COLORS.borderError}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: COLORS.borderError,
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '16px',
                fontWeight: 600,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '32px',
                backgroundColor: COLORS.white,
                color: COLORS.heading,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || !phone || !password}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '32px',
                backgroundColor: COLORS.primary,
                color: COLORS.white,
                cursor: loading || !phone || !password ? 'not-allowed' : 'pointer',
                opacity: loading || !phone || !password ? 0.5 : 1,
              }}
            >
              {loading ? t.loggingIn : t.login}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
