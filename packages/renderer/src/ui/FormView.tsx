import React from 'react';
import type { ComponentsRegistry, FormConfig, Field, PurchaseAuthConfig } from '../renderer/types';
import { runSubmitPipeline } from '../workflow/submit';
import {
  initAmplitude,
  setAmplitudeUserId,
  trackFormViewed,
  trackFormAbandoned,
  trackSubmissionStarted,
  trackSubmissionSuccess,
  trackSubmissionError,
  trackThankYouViewed,
  trackFieldFocused,
  trackFieldBlurred,
  trackValidationError,
} from '../analytics/amplitude';
import { fetchUserData } from '../analytics/userApi';
import { getStoredToken, validateToken, login, setStoredToken, fetchMyListings, fetchItemVariant, type AuthConfig, type MyListing, type ItemVariant } from '../auth/authService';
import { LoginModal } from './LoginModal';

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

/**
 * Read a cookie value by name
 * @param name - Cookie name to read
 * @returns Cookie value or null if not found
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function validateClient(form: FormConfig, answers: Record<string, any>, locale: 'en'|'ar', dynamicOptionsFields?: string[]): FieldError[] {
  const errs: FieldError[] = []
  const t = (en: string, ar: string) => ({ en, ar })
  const isReq = (f: Field) => !!(f as any)?.props?.required
  const get = (name: string) => answers[name]
  const isDynamicField = (name: string) => dynamicOptionsFields?.includes(name) || false
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
        // Skip "not in options" validation for fields with dynamic options (like user listings)
        if (isDynamicField(f.name)) break
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
      case 'radio':
        if (v == null) break
        if (!(f as any).props?.allow_other) {
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
        if (!(f as any).props?.allow_custom && !(f as any).props?.allow_other) {
          const options: any[] = (f as any).props?.options || []
          for (const it of (Array.isArray(v)?v:[])) {
            if (!options.some(o => o.value === it?.value) && it?.value !== 'other') {
              errs.push({ field: f.name, code: 'NOT_ALLOWED', message: t('Not in options', 'غير موجود ضمن الخيارات') })
              break
            }
          }
        }
        // Validate "other" text if "other" is selected
        for (const it of (Array.isArray(v)?v:[])) {
          if (it?.value === 'other' && (!it?.other || it.other.trim() === '')) {
            errs.push({ field: f.name, code: 'REQUIRED', message: t('Please provide details for "Other"', 'يرجى إدخال التفاصيل لـ "أخرى"') })
            break
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
        // Check if manual entry (has address but no coordinates)
        const hasAddress = typeof v.address === 'string' && v.address.trim() !== ''
        const hasLat = typeof v.lat === 'number'
        const hasLng = typeof v.lng === 'number'
        
        // Manual entry: only need address
        if (v.detection_method === 'manual') {
          if (!hasAddress) {
            errs.push({ field: f.name, code: 'INVALID', message: t('Address is required', 'العنوان مطلوب') })
          }
          break
        }
        
        // GPS entry: need coordinates, address is optional
        if (hasLat && hasLng) {
        const lat = v.lat
        const lng = v.lng
          if (lat < -90 || lat > 90) errs.push({ field: f.name, code: 'INVALID', message: t('Invalid latitude', 'خط عرض غير صالح') })
          if (lng < -180 || lng > 180) errs.push({ field: f.name, code: 'INVALID', message: t('Invalid longitude', 'خط طول غير صالح') })
        } else if (!hasAddress) {
          // No coordinates and no address - invalid
          errs.push({ field: f.name, code: 'INVALID', message: t('Location is required', 'الموقع مطلوب') })
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

// Gallery Card Styles for Ad Selection
const galleryContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  width: '100%',
};

const galleryCardStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: '8px',
  border: `1.5px solid ${COLORS.border}`,
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: COLORS.white,
};

const galleryCardSelectedStyle: React.CSSProperties = {
  ...galleryCardStyle,
  border: `1.5px solid ${COLORS.primary}`,
  boxShadow: '0 0 0 2px rgba(46, 75, 255, 0.2)',
};

const galleryCardHoverStyle: React.CSSProperties = {
  ...galleryCardStyle,
  borderColor: COLORS.primary,
};

const galleryImageStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '1',
  objectFit: 'cover',
  backgroundColor: '#F3F4F6',
};

const galleryNoImageStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '1',
  backgroundColor: '#F3F4F6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: COLORS.placeholder,
  fontSize: '11px',
};

const galleryTitleStyle: React.CSSProperties = {
  padding: '6px 6px 2px',
  fontSize: '11px',
  fontWeight: 600,
  color: COLORS.heading,
  textAlign: 'start',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const galleryDescStyle: React.CSSProperties = {
  padding: '0 6px 6px',
  fontSize: '10px',
  fontWeight: 400,
  color: COLORS.helper,
  textAlign: 'start',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const galleryCheckmarkStyle: React.CSSProperties = {
  position: 'absolute',
  top: '4px',
  right: '4px',
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  backgroundColor: COLORS.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: COLORS.white,
  fontSize: '11px',
  fontWeight: 'bold',
};

const galleryLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: COLORS.heading,
  marginBottom: '8px',
};

// Gallery Card Component
const ListingGalleryCard: React.FC<{
  listing: MyListing;
  isSelected: boolean;
  onSelect: () => void;
  locale: 'en' | 'ar';
}> = ({ listing, isSelected, onSelect, locale }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Build description from price and category
  const descParts: string[] = [];
  if (listing.price && listing.price > 0) {
    descParts.push(`${listing.price} KD`);
  }
  if (listing.category_name) {
    descParts.push(listing.category_name);
  }
  const description = descParts.join(' • ') || (locale === 'ar' ? 'إعلان' : 'Ad');
  
  return (
    <div
      style={isSelected ? galleryCardSelectedStyle : (isHovered ? galleryCardHoverStyle : galleryCardStyle)}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isSelected && (
        <div style={galleryCheckmarkStyle}>✓</div>
      )}
      {listing.thumbnail ? (
        <img
          src={listing.thumbnail}
          alt={listing.title}
          style={galleryImageStyle}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display: flex');
          }}
        />
      ) : null}
      <div style={{
        ...galleryNoImageStyle,
        display: listing.thumbnail ? 'none' : 'flex',
      }}>
        {locale === 'ar' ? 'لا صورة' : 'No Image'}
      </div>
      <div style={galleryTitleStyle} title={listing.title}>
        {listing.title}
      </div>
      <div style={galleryDescStyle} title={description}>
        {description}
      </div>
    </div>
  );
};

export const FormView: React.FC<{ form: FormConfig; components: ComponentsRegistry; locale?: string; flags: Record<string, boolean> }> = ({ form, components, locale, flags }) => {
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<FieldError[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [redirectingToPayment, setRedirectingToPayment] = React.useState(false)
  const [buttonHover, setButtonHover] = React.useState(false)
  const [termsAccepted, setTermsAccepted] = React.useState(false)
  const effectiveLocale = (locale as any) || (getLocaleFromURL(form.default_locale) as any)
  
  // Authentication state for purchase_authenticated forms
  const [authChecking, setAuthChecking] = React.useState(true);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [authToken, setAuthToken] = React.useState<string | null>(null);
  const [authConfig, setAuthConfig] = React.useState<AuthConfig | null>(null);
  const [purchaseAuthConfig, setPurchaseAuthConfig] = React.useState<PurchaseAuthConfig | null>(null);
  const [userListings, setUserListings] = React.useState<MyListing[]>([]);
  const [userData, setUserData] = React.useState<{ id?: number; phone?: string; name?: string }>({});
  
  // Item pricing state
  const [selectedItemPrice, setSelectedItemPrice] = React.useState<number | null>(null);
  const [loadingItemPrice, setLoadingItemPrice] = React.useState(false);
  
  // Analytics state
  const [sessionId, setSessionId] = React.useState<string | undefined>(undefined);
  const [userId, setUserId] = React.useState<string | number | undefined>(undefined);
  const [formStartTime] = React.useState<number>(Date.now());
  const [fieldFocusTimes, setFieldFocusTimes] = React.useState<Record<string, number>>({});
  const [lastFieldInteracted, setLastFieldInteracted] = React.useState<{ name: string; type: string } | undefined>(undefined);
  const [submissionId, setSubmissionId] = React.useState<number | undefined>(undefined);
  const [validationAttempts, setValidationAttempts] = React.useState<Record<string, number>>({});

  // Check authentication on form load for purchase_authenticated forms
  React.useEffect(() => {
    const checkAuthOnLoad = async () => {
      // Find purchase_authenticated action
      const purchaseAuthAction = form.submit?.actions.find(
        a => a.type === 'purchase_authenticated' && a.enabled
      );
      
      if (!purchaseAuthAction?.purchase_auth_config?.require_authentication) {
        // No auth required, show form immediately
        setAuthChecking(false);
        return;
      }
      
      const config = purchaseAuthAction.purchase_auth_config;
      setPurchaseAuthConfig(config);
      
      const authCfg: AuthConfig = {
        baseUrl: config.auth_api_base_url,
        listingsApiBaseUrl: config.listings_api_base_url,
        deviceId: config.device_id || `web_${Date.now()}`,
        appSignature: config.app_signature || '',
        versionNumber: config.version_number || '26.0.0',
      };
      setAuthConfig(authCfg);
      
      // Check for existing token
      const storedToken = getStoredToken();
      if (storedToken) {
        console.log('[FormView] Found stored token, validating...');
        const validation = await validateToken(storedToken, authCfg);
        if (validation.valid) {
          console.log('[FormView] Token is valid, fetching listings and showing form');
          setAuthToken(storedToken);
          
          // Fetch user listings for valid stored token
          const listingsResult = await fetchMyListings(storedToken, authCfg, effectiveLocale);
          if (listingsResult.success) {
            if (listingsResult.listings.length > 0) {
              setUserListings(listingsResult.listings);
            }
            // Also set user data from listings response
            if (listingsResult.user) {
              console.log('[FormView] Setting userData from stored token listings:', JSON.stringify(listingsResult.user));
              setUserData({
                id: listingsResult.user.id,
                phone: listingsResult.user.phone,
                name: listingsResult.user.name,
              });
              setUserId(listingsResult.user.id);
              setAmplitudeUserId(listingsResult.user.id);
            }
          }
          
          setAuthChecking(false);
          return;
        }
        console.log('[FormView] Token is invalid, need login');
      }
      
      // Token not found or invalid, show login modal
      console.log('[FormView] Showing login modal');
      setAuthChecking(false);
      setShowLoginModal(true);
    };
    
    checkAuthOnLoad();
  }, [form]);
  
  // Handle login from modal
  const handleLogin = async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!authConfig) {
      return { success: false, error: 'Auth config not available' };
    }
    
    const result = await login({ phone, password }, authConfig);
    if (result.success && result.accessToken) {
      setStoredToken(result.accessToken);
      setAuthToken(result.accessToken);
      setShowLoginModal(false);
      
      // Set user data from login response if available
      if (result.user) {
        setUserData({
          id: result.user.id,
          phone: result.user.phone,
          name: result.user.name,
        });
        setUserId(result.user.id);
        setAmplitudeUserId(result.user.id);
      } else {
        // Fallback: fetch user data if not in login response
        const fetchedUserData = await fetchUserData(result.accessToken);
        if (fetchedUserData?.user_id) {
          setUserData({
            id: fetchedUserData.user_id,
            phone: fetchedUserData.phone,
            name: fetchedUserData.first_name,
          });
          setUserId(fetchedUserData.user_id);
          setAmplitudeUserId(fetchedUserData.user_id);
        }
      }
      
      // Fetch user listings after successful login
      const listingsResult = await fetchMyListings(result.accessToken, authConfig, effectiveLocale);
      if (listingsResult.success) {
        if (listingsResult.listings.length > 0) {
          setUserListings(listingsResult.listings);
        }
        // Get user data from listings response (more reliable than login response)
        if (listingsResult.user) {
          console.log('[FormView] Setting userData from listings response:', JSON.stringify(listingsResult.user));
          setUserData({
            id: listingsResult.user.id,
            phone: listingsResult.user.phone,
            name: listingsResult.user.name,
          });
          setUserId(listingsResult.user.id);
          setAmplitudeUserId(listingsResult.user.id);
        } else {
          console.log('[FormView] No user data in listings response');
        }
      }
      
      return { success: true };
    }
    
    return { success: false, error: result.error || 'Login failed' };
  };

  // Extract query parameters and initialize analytics
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let extractedSessionId = urlParams.get('sessionId') || undefined;
    
    // Priority order: instance token > cookie token > URL token
    // Instance token comes from form config (when instanceId query param is provided)
    const instanceUserToken = form.instance_user_token;
    const cookieUserToken = getCookie('_xyzW');
    const urlUserToken = urlParams.get('user_token') || undefined;
    const userToken = instanceUserToken || cookieUserToken || urlUserToken; // Instance takes highest priority
    
    const shouldTestAmplitude = urlParams.get('testAmplitude') === 'true';

    // Generate a default session ID if none is provided
    // Use timestamp in milliseconds for consistency with Amplitude's session ID format
    if (!extractedSessionId) {
      extractedSessionId = String(Date.now());
    }

    setSessionId(extractedSessionId);
    
    // Store sessionId, form config, and locale globally for testing/debugging
    (window as any).__sessionId = extractedSessionId;
    (window as any).__formConfig = form;
    (window as any).__locale = effectiveLocale;
    
    // Auto-run Amplitude tests if ?testAmplitude=true is in URL
    if (shouldTestAmplitude) {
      // Wait for Amplitude to initialize, then run tests
      setTimeout(async () => {
        if (typeof (window as any).testAmplitudeEvents === 'function') {
          try {
            await (window as any).testAmplitudeEvents();
          } catch (error) {
            // Silent fail for auto-tests
          }
        } else {
          setTimeout(async () => {
            if (typeof (window as any).testAmplitudeEvents === 'function') {
              await (window as any).testAmplitudeEvents();
            }
          }, 2000);
        }
      }, 3000);
    }

    // Initialize Amplitude with session ID and track form_viewed after initialization
    // Wrap in additional try-catch to handle any synchronous errors
    try {
      initAmplitude(extractedSessionId)
        .then(() => {
          // Track form viewed after Amplitude is initialized
          // Add a small delay to ensure Amplitude is fully ready
          setTimeout(() => {
            trackFormViewed(form, effectiveLocale, extractedSessionId);
          }, 100);
        })
        .catch((error) => {
          console.warn('[FormView] Amplitude initialization failed, continuing without analytics:', error);
        });
    } catch (error) {
      // Catch any synchronous errors (shouldn't happen with async, but just in case)
      console.warn('[FormView] Amplitude setup error, continuing without analytics:', error);
    }

    // Fetch user data if user_token exists - only to get user ID
    if (userToken) {
      fetchUserData(userToken)
        .then((fetchedUserData) => {
          if (fetchedUserData?.user_id) {
            const userIdValue = fetchedUserData.user_id;
            setUserId(userIdValue);
            setAmplitudeUserId(userIdValue);
            // Store user data for submit payload
            setUserData({
              id: fetchedUserData.user_id,
              phone: fetchedUserData.phone,
              name: fetchedUserData.first_name,
            });
          }
        })
        .catch((error) => {
          console.error('[FormView] Error fetching user data:', error);
        });
    }
  }, []); // Run once on mount

  // Track abandonment on page unload
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (!submitted && !submitting) {
        const timeOnForm = Math.round((Date.now() - formStartTime) / 1000);
        trackFormAbandoned(
          form,
          effectiveLocale,
          answers,
          sessionId,
          timeOnForm,
          lastFieldInteracted?.name,
          lastFieldInteracted?.type,
          errors.length > 0,
          errors.length
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !submitted && !submitting) {
        const timeOnForm = Math.round((Date.now() - formStartTime) / 1000);
        trackFormAbandoned(
          form,
          effectiveLocale,
          answers,
          sessionId,
          timeOnForm,
          lastFieldInteracted?.name,
          lastFieldInteracted?.type,
          errors.length > 0,
          errors.length
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [submitted, submitting, answers, errors, lastFieldInteracted]);

  // Fetch item variant price when placement dropdown changes
  React.useEffect(() => {
    const fetchItemPrice = async () => {
      if (!purchaseAuthConfig || !authToken) return;
      
      const itemIdField = purchaseAuthConfig.item_id_field;
      if (!itemIdField) return;
      
      const selectedValue = answers[itemIdField];
      if (!selectedValue) {
        setSelectedItemPrice(null);
        return;
      }
      
      // Get the value (could be string or object with value property)
      const itemValue = typeof selectedValue === 'object' ? selectedValue.value : selectedValue;
      if (!itemValue) {
        setSelectedItemPrice(null);
        return;
      }
      
      // Map option values to variant UUIDs
      const variantMapping: Record<string, string> = {
        // old_id format
        'instagram_1_day': '4dfc118f-cf79-11f0-8b87-068146e4f871',
        'instagram_5_days': '55964ff1-cf79-11f0-8b87-068146e4f871',
        'instagram_10_days': '5dba54ea-cf79-11f0-8b87-068146e4f871',
        // form option values (story, 5_days_ad, 10_days_ad)
        'story': '4dfc118f-cf79-11f0-8b87-068146e4f871',
        '5_days_ad': '55964ff1-cf79-11f0-8b87-068146e4f871',
        '10_days_ad': '5dba54ea-cf79-11f0-8b87-068146e4f871',
      };
      
      const variantId = variantMapping[itemValue];
      if (!variantId) {
        console.error('[FormView] Unknown item value, cannot map to variant:', itemValue);
        setSelectedItemPrice(null);
        setLoadingItemPrice(false);
        return;
      }
      
      setLoadingItemPrice(true);
      try {
        const baseUrl = purchaseAuthConfig.auth_api_base_url || 'https://staging-services.q84sale.com/api/v1';
        const result = await fetchItemVariant(authToken, baseUrl, variantId);
        if (result.success && result.variant) {
          setSelectedItemPrice(result.variant.price);
        } else {
          setSelectedItemPrice(null);
        }
      } catch (err) {
        console.error('[FormView] Error fetching item variant:', err);
        setSelectedItemPrice(null);
      } finally {
        setLoadingItemPrice(false);
      }
    };
    
    fetchItemPrice();
  }, [purchaseAuthConfig, authToken, answers[purchaseAuthConfig?.item_id_field || '']]);

  const onChange = (name: string, value: any) => {
    setAnswers((a) => {
      const newAnswers = { ...a, [name]: value };
      
      // Don't track field changes - only track on focus
      const field = form.fields.find((f) => f.name === name);
      if (field) {
        setLastFieldInteracted({ name: field.name, type: field.type });
      }
      
      return newAnswers;
    });
  };

  // Enhanced onChange with focus/blur tracking
  const createFieldHandlers = (field: Field) => {
    return {
      onChange: (value: any) => onChange(field.name, value),
      onFocus: () => {
        const timeOnForm = Math.round((Date.now() - formStartTime) / 1000);
        setFieldFocusTimes((prev) => ({ ...prev, [field.name]: Date.now() }));
        // Get current value for this field
        const currentValue = answers[field.name];
        trackFieldFocused(form, field, effectiveLocale, sessionId, timeOnForm, currentValue);
        setLastFieldInteracted({ name: field.name, type: field.type });
      },
      onBlur: (value: any) => {
        const focusTime = fieldFocusTimes[field.name];
        const timeInField = focusTime ? Math.round((Date.now() - focusTime) / 1000) : 0;
        const fieldErrors = errors.filter((e) => e.field === field.name);
        trackFieldBlurred(
          form,
          field,
          effectiveLocale,
          value,
          sessionId,
          timeInField,
          fieldErrors.length > 0
        );
      },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Pass dynamic options fields to skip "not in options" validation for user listings
    const dynamicFields = purchaseAuthConfig?.adv_id_field ? [purchaseAuthConfig.adv_id_field] : [];
    const clientErrors = validateClient(form, answers, effectiveLocale, dynamicFields);
    
    // Track validation errors
    clientErrors.forEach((error) => {
      const field = form.fields.find((f) => f.name === error.field);
      if (field) {
        const attemptNumber = (validationAttempts[error.field] || 0) + 1;
        setValidationAttempts((prev) => ({ ...prev, [error.field]: attemptNumber }));
        const timeOnForm = Math.round((Date.now() - formStartTime) / 1000);
        trackValidationError(
          form,
          field,
          effectiveLocale,
          error.code,
          error.message[effectiveLocale] || error.message.en || '',
          sessionId,
          attemptNumber,
          timeOnForm
        );
      }
    });
    
    setErrors(clientErrors);
    if (clientErrors.length) return;
    
    // Track submission started
    const submissionTime = Math.round((Date.now() - formStartTime) / 1000);
    trackSubmissionStarted(form, effectiveLocale, answers, sessionId, submissionTime);
    
    setSubmitting(true);
    
    // Show "Redirecting to payment..." for purchase flows
    if (purchaseAuthConfig) {
      setRedirectingToPayment(true);
    }
    
    try {
      // Prepare meta with instance_id and user_id if available
      const meta: Record<string, any> = { 
        locale: effectiveLocale, 
        device: 'web', 
        attributes: form.attributes, 
        sessionId: sessionId || '' 
      };
      
      // Add instance_id if form has instance
      if (form.instance_id) {
        meta.instance_id = form.instance_id;
      }
      
      // Add user_id if we have it (from user identification)
      if (userId) {
        meta.user_id = userId;
      }
      
      const result = await runSubmitPipeline(form, {
        formId: form.formId,
        version: form.version,
        submittedAt: Date.now(),
        answers,
        meta,
        userListings,
        userData,
      });
      
      // Extract submission ID from result if available
      let extractedSubmissionId: number | undefined = undefined;
      if (result && typeof result === 'object' && result.submissionId !== undefined) {
        extractedSubmissionId = result.submissionId;
        setSubmissionId(extractedSubmissionId);
      }
      
      setSubmitted(true);
      
      // Track submission success (use 0 if no submissionId available)
      trackSubmissionSuccess(
        form,
        effectiveLocale,
        answers,
        extractedSubmissionId || 0,
        sessionId,
        submissionTime,
        ['server_persist'], // TODO: Track actual completed actions from pipeline
        []
      );
      
      if (form.thankYou?.show && extractedSubmissionId) {
        // Track thank you viewed
        trackThankYouViewed(form, extractedSubmissionId, effectiveLocale, sessionId, submissionTime);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      
      // Track submission error
      const submissionTime = Math.round((Date.now() - formStartTime) / 1000);
      const errorType = err.status === 400 ? 'validation_error' : err.status === 500 ? 'server_error' : 'network_error';
      const errorMessage = err.message || (effectiveLocale === 'ar' ? 'حدث خطأ أثناء إرسال النموذج' : 'An error occurred while submitting the form');
      
      trackSubmissionError(
        form,
        effectiveLocale,
        answers,
        errorType,
        errorMessage,
        sessionId,
        submissionTime,
        1,
        'server_persist'
      );
      
      // If server returned validation errors, display them
      if (err.errors && Array.isArray(err.errors)) {
        const serverErrors = err.errors.map((e: any) => ({
          field: e.field,
          code: e.code,
          message: e.message?.[effectiveLocale] || e.message || 'Validation error'
        }));
        setErrors([...errors, ...serverErrors]);
      } else {
        // Show generic error message
        alert(effectiveLocale === 'ar' ? 'حدث خطأ أثناء إرسال النموذج' : 'An error occurred while submitting the form');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Show loading state while checking authentication
  if (authChecking) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '3px solid #E5E7EB',
            borderTopColor: COLORS.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '15px', color: COLORS.helper }}>
            {effectiveLocale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show login modal for forms requiring authentication
  if (showLoginModal && purchaseAuthConfig) {
    return (
      <div style={containerStyle}>
        <LoginModal
          isOpen={true}
          onClose={() => {}} // Don't allow close without login
          onLogin={handleLogin}
          locale={effectiveLocale}
        />
      </div>
    );
  }

  // Show "Redirecting to payment..." for purchase flows instead of thank you page
  if (redirectingToPayment) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E5E7EB',
            borderTopColor: COLORS.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h1 style={{ ...titleStyle, marginBottom: '0.75rem' }}>
            {effectiveLocale === 'ar' ? 'جاري التحويل للدفع...' : 'Redirecting to payment...'}
          </h1>
          <p style={{ fontSize: '15px', color: COLORS.helper, lineHeight: 1.6 }}>
            {effectiveLocale === 'ar' ? 'يرجى الانتظار بينما نقوم بتحويلك إلى صفحة الدفع' : 'Please wait while we redirect you to the payment page'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted && form.thankYou?.show && !purchaseAuthConfig) {
    // Thank you tracking is already done in handleSubmit
    // Only show thank you for non-purchase flows
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem', textAlign: 'center' }}>
          <h1 style={{ ...titleStyle, marginBottom: '1rem' }}>{form.thankYou.title?.[effectiveLocale]}</h1>
          <p style={{ fontSize: '15px', color: COLORS.helper, lineHeight: 1.6 }}>{form.thankYou.message?.[effectiveLocale]}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Hero Header - for purchase forms */}
      {purchaseAuthConfig ? (
        <div style={{ 
          background: 'linear-gradient(135deg, #2E4BFF 0%, #1E3AD8 100%)',
          padding: '2.5rem 1.5rem 2rem',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h1 style={{ 
              fontSize: '26px', 
              fontWeight: 800, 
              color: '#FFFFFF',
              letterSpacing: '-0.025em',
              lineHeight: 1.3,
              margin: '0 0 1rem 0'
            }}>
              {form.title?.[effectiveLocale]}
            </h1>
            <p style={{ 
              fontSize: '15px', 
              color: 'rgba(255, 255, 255, 0.9)', 
              lineHeight: 1.7,
              margin: 0,
            }}>
              {effectiveLocale === 'ar' 
                ? 'الحين تقدر توصل إعلان سيارتك لجمهور أضخم على إنستغرام من خلال حساب 4Sale الرسمي'
                : 'Now you can reach a larger audience on Instagram through the official 4Sale account'}
            </p>
          </div>
        </div>
      ) : (
        <div style={headerStyle}>
          <div style={headerInnerStyle}>
            <h1 style={titleStyle}>{form.title?.[effectiveLocale]}</h1>
          </div>
        </div>
      )}


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
              const TimeComp = components[nextField.type];
              const dateHandlers = createFieldHandlers(f);
              const timeHandlers = createFieldHandlers(nextField);
              const dateProps: any = {
                ...f,
                locale: effectiveLocale,
                value: answers[f.name],
                onChange: dateHandlers.onChange,
                onFocus: dateHandlers.onFocus,
                onBlur: () => dateHandlers.onBlur(answers[f.name]),
                required: !!(f as any)?.props?.required,
                hasError: fieldErrors.length > 0,
              };
              const timeProps: any = {
                ...nextField,
                locale: effectiveLocale,
                value: answers[nextField.name],
                onChange: timeHandlers.onChange,
                onFocus: timeHandlers.onFocus,
                onBlur: () => timeHandlers.onBlur(answers[nextField.name]),
                required: !!(nextField as any)?.props?.required,
                hasError: errors.filter(er => er.field === nextField.name).length > 0,
              };
              return (
                <div key={f.attribute_key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Comp(dateProps)}
                    {TimeComp && TimeComp(timeProps)}
                  </div>
                  {fieldErrors.map(er => (
                    <div key={er.code} style={{ fontSize: '14px', color: COLORS.borderError, marginLeft: '0.25rem', marginTop: '0.25rem' }}>{er.message[effectiveLocale]}</div>
                  ))}
                  {errors.filter(er => er.field === nextField.name).map(er => (
                    <div key={er.code} style={{ fontSize: '14px', color: COLORS.borderError, marginLeft: '0.25rem', marginTop: '0.25rem' }}>{er.message[effectiveLocale]}</div>
                  ))}
                </div>
              );
            }
            
            if (isTimeField && prevField?.type === 'date') {
              return null;
            }
            
            const handlers = createFieldHandlers(f);
            // Pass form, sessionId, and field for analytics tracking (FileUpload, LocationPicker)
            const componentProps: any = {
              ...f,
              locale: effectiveLocale,
              value: answers[f.name],
              onChange: handlers.onChange,
              onFocus: handlers.onFocus,
              onBlur: () => handlers.onBlur(answers[f.name]),
              required: !!(f as any)?.props?.required,
              hasError: fieldErrors.length > 0,
            };
            if (f.type === 'file_upload' || f.type === 'location') {
              componentProps.form = form;
              componentProps.sessionId = sessionId;
              componentProps.field = f;
            }
            
            // Render gallery cards for the ad_link field when we have user listings
            if (purchaseAuthConfig && f.name === purchaseAuthConfig.adv_id_field && userListings.length > 0) {
              const fieldLabel = f.label?.[effectiveLocale] || f.label?.en || f.name;
              const selectedValue = answers[f.name]?.value || answers[f.name];
              const isRequired = !!(f as any)?.props?.required;
              
              return (
                <div key={f.attribute_key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={galleryLabelStyle}>
                    {fieldLabel}
                    {isRequired && <span style={{ color: COLORS.borderError, marginLeft: '4px' }}>*</span>}
                  </div>
                  <div style={galleryContainerStyle}>
                    {userListings.map(listing => (
                      <ListingGalleryCard
                        key={listing.adv_id}
                        listing={listing}
                        isSelected={selectedValue === listing.adv_id}
                        onSelect={() => {
                          setAnswers(prev => ({
                            ...prev,
                            [f.name]: { 
                              value: listing.adv_id, 
                              label: { en: listing.title, ar: listing.title },
                              category_id: listing.category_id,
                            }
                          }));
                        }}
                        locale={effectiveLocale}
                      />
                    ))}
                  </div>
                  {fieldErrors.map(er => (
                    <div key={er.code} style={{ fontSize: '14px', color: COLORS.borderError, marginLeft: '0.25rem', marginTop: '0.25rem' }}>{er.message[effectiveLocale]}</div>
                  ))}
                </div>
              );
            }
            // Special rendering for item_id_field (placement dropdown) to show price
            const isItemIdField = purchaseAuthConfig && f.name === purchaseAuthConfig.item_id_field;
            
            return (
              <div key={f.attribute_key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Comp(componentProps)}
                {isItemIdField && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: selectedItemPrice !== null ? '#EFF6FF' : '#F9FAFB',
                    borderRadius: '12px',
                    marginTop: '0.25rem'
                  }}>
                    {loadingItemPrice ? (
                      <span style={{ fontSize: '14px', color: COLORS.helper }}>
                        {effectiveLocale === 'ar' ? 'جاري تحميل السعر...' : 'Loading price...'}
                      </span>
                    ) : selectedItemPrice !== null ? (
                      <>
                        <span style={{ fontSize: '15px', color: COLORS.heading, fontWeight: 500 }}>
                          {effectiveLocale === 'ar' ? 'السعر:' : 'Price:'}
                        </span>
                        <span style={{ 
                          fontSize: '24px', 
                          fontWeight: 800, 
                          color: COLORS.primary,
                          letterSpacing: '-0.5px'
                        }}>
                          {selectedItemPrice}
                        </span>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: 600, 
                          color: COLORS.primary 
                        }}>
                          {effectiveLocale === 'ar' ? 'د.ك' : 'KD'}
                        </span>
                      </>
                    ) : answers[f.name] ? (
                      <span style={{ fontSize: '14px', color: COLORS.helper }}>
                        {effectiveLocale === 'ar' ? 'تعذر تحميل السعر' : 'Unable to load price'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '14px', color: COLORS.helper }}>
                        {effectiveLocale === 'ar' ? 'اختر باقة لعرض السعر' : 'Select a package to see price'}
                      </span>
                    )}
                  </div>
                )}
                {fieldErrors.map(er => (
                  <div key={er.code} style={{ fontSize: '14px', color: COLORS.borderError, marginLeft: '0.25rem', marginTop: '0.25rem' }}>{er.message[effectiveLocale]}</div>
                ))}
              </div>
            );
          })}
        </div>


        {/* Terms and Conditions - for purchase forms */}
        {purchaseAuthConfig && (
          <div style={{ 
            padding: '1rem 1.5rem',
            backgroundColor: '#FFFBEB',
            borderRadius: '12px',
            margin: '0 1.5rem 1rem',
            maxWidth: '640px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: 700, 
                color: COLORS.heading,
                margin: '0 0 0.75rem 0'
              }}>
                {effectiveLocale === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions'}
              </h3>
              <ul style={{ 
                fontSize: '13px', 
                color: COLORS.helper, 
                lineHeight: 1.7,
                margin: 0,
                paddingRight: effectiveLocale === 'ar' ? '1.25rem' : 0,
                paddingLeft: effectiveLocale === 'ar' ? 0 : '1.25rem',
                listStyleType: 'disc'
              }}>
                {effectiveLocale === 'ar' ? (
                  <>
                    <li>يجب أن يكون المحتوى المرسل متوافقًا مع سياسة النشر الخاصة بتطبيق 4Sale.</li>
                    <li>تحتفظ 4Sale بالحق في رفض أي إعلان لا يتوافق مع الشروط والسياسات.</li>
                    <li>في حالة رفض الإعلان، يتم استرجاع المبلغ إلى محفظة المستخدم داخل التطبيق خلال 3 أيام عمل.</li>
                    <li>قيمة الخدمة تشمل تكلفة نشر المنشور بالإضافة إلى تكلفة الترويج.</li>
                    <li>لا تتحمل 4Sale أي مسؤولية بخصوص بيع المركبة أو نتائج الإعلان.</li>
                    <li>يتم إزالة المنشور أو القصة تلقائيًا بعد انتهاء المدة المحددة في الباقة المختارة.</li>
                    <li>الحد الأعلى للصور المسموح برفعها هو 5 صور فقط.</li>
                    <li>4Sale هي المنوطة بتصميم الإعلان واختيار الصور التي سيتم عرضها.</li>
                    <li>يتم نشر الإعلان خلال 24 ساعة من استكمال الطلب وإتمام عملية الدفع.</li>
                  </>
                ) : (
                  <>
                    <li>Content must comply with 4Sale's publishing policy.</li>
                    <li>4Sale reserves the right to reject any ad that doesn't comply with terms and policies.</li>
                    <li>If an ad is rejected, the amount will be refunded to the user's wallet within 3 business days.</li>
                    <li>Service fee includes posting and promotion costs.</li>
                    <li>4Sale is not responsible for vehicle sales or ad results.</li>
                    <li>Posts/stories are automatically removed after the selected package duration ends.</li>
                    <li>Maximum of 5 photos allowed per upload.</li>
                    <li>4Sale handles ad design and photo selection.</li>
                    <li>Ads are published within 24 hours of completing the order and payment.</li>
                  </>
                )}
              </ul>
            </div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.5rem 0'
            }}>
              <input 
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  marginTop: '2px',
                  accentColor: COLORS.primary,
                  cursor: 'pointer'
                }}
              />
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 600,
                color: COLORS.heading,
                lineHeight: 1.5
              }}>
                {effectiveLocale === 'ar' 
                  ? 'أوافق على الشروط والأحكام المذكورة أعلاه'
                  : 'I agree to the terms and conditions above'}
              </span>
            </label>
          </div>
        )}

        {/* Submit Button */}
        <div 
          style={typeof window !== 'undefined' && window.innerWidth >= 768 ? buttonContainerDesktopStyle : buttonContainerStyle}
        >
          <button
            type="submit"
            disabled={submitting || (purchaseAuthConfig && !termsAccepted)}
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
            style={(submitting || (purchaseAuthConfig && !termsAccepted)) ? buttonDisabledStyle : (buttonHover ? buttonHoverStyle : buttonStyle)}
          >
            {submitting 
              ? (effectiveLocale === 'ar' ? 'جاري الإرسال...' : 'Submitting...') 
              : (purchaseAuthConfig 
                  ? (effectiveLocale === 'ar' ? 'ادفع الآن' : 'Pay Now')
                  : (effectiveLocale === 'ar' ? 'إرسال' : 'Submit'))}
          </button>
        </div>
      </form>
    </div>
  );
};
