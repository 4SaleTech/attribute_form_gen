import React from 'react';

// Brand Colors
const COLORS = {
  primary: '#2E4BFF',
  primaryHover: '#2640E6',
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

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 1rem',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '16px',
  color: COLORS.heading,
  backgroundColor: COLORS.white,
  fontSize: '16px',
  transition: 'all 0.2s ease',
  outline: 'none',
  fontFamily: FONT_FAMILY,
};

const baseInputFocusStyle: React.CSSProperties = {
  borderColor: COLORS.primary,
  boxShadow: `0 0 0 2px rgba(46, 75, 255, 0.2)`,
};

const errorInputStyle: React.CSSProperties = {
  ...baseInputStyle,
  borderColor: COLORS.borderError,
  backgroundColor: COLORS.bgError,
};

const errorInputFocusStyle: React.CSSProperties = {
  borderColor: COLORS.borderError,
  boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.2)`,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '16px',
  fontWeight: 600,
  color: COLORS.heading,
  marginBottom: '0.5rem',
};

const helperStyle: React.CSSProperties = {
  fontSize: '15px',
  color: COLORS.helper,
  marginBottom: '0.625rem',
  lineHeight: 1.6,
};

const requiredStyle: React.CSSProperties = {
  color: COLORS.borderError,
  marginLeft: '0.25rem',
  fontWeight: 400,
};

// Country data with phone validation patterns
const COUNTRIES = [
  { code: 'KW', name: 'Kuwait', dialCode: '+965', pattern: /^[569]\d{7}$/, example: '50000000' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', pattern: /^[1-9]\d{8}$/, example: '501234567' },
  { code: 'AE', name: 'UAE', dialCode: '+971', pattern: /^[50]\d{8}$/, example: '501234567' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', pattern: /^[3-9]\d{7}$/, example: '33123456' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', pattern: /^[3-9]\d{7}$/, example: '33123456' },
  { code: 'OM', name: 'Oman', dialCode: '+968', pattern: /^[7-9]\d{7}$/, example: '92123456' },
  { code: 'US', name: 'United States', dialCode: '+1', pattern: /^\d{10}$/, example: '2025551234' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', pattern: /^[1-9]\d{9,10}$/, example: '7700123456' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', pattern: /^1[0-2]\d{8}$/, example: '1012345678' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', pattern: /^[789]\d{8}$/, example: '791234567' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', pattern: /^[3-9]\d{7}$/, example: '3123456' },
  { code: 'IN', name: 'India', dialCode: '+91', pattern: /^[6-9]\d{9}$/, example: '9876543210' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', pattern: /^3\d{9}$/, example: '3001234567' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', pattern: /^1[3-9]\d{8}$/, example: '1712345678' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', pattern: /^9\d{9}$/, example: '9123456789' },
];

const validatePhoneNumber = (number: string, countryCode: string): boolean => {
  const country = COUNTRIES.find(c => c.code === countryCode);
  if (!country) return false;
  // Remove all non-digit characters for validation
  const digits = number.replace(/\D/g, '');
  return country.pattern.test(digits);
};

const DateInput: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const isRTL = locale === 'ar';
  const inputStyle: React.CSSProperties = {
    ...(hasError ? errorInputStyle : baseInputStyle),
    ...(isRTL ? { paddingRight: '2.75rem' } : { paddingLeft: '2.75rem' }),
    textAlign: isRTL ? 'right' : 'left',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
  };
  
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', ...(isRTL ? { right: '1rem' } : { left: '1rem' }), top: '50%', transform: 'translateY(-50%)', color: COLORS.helper, pointerEvents: 'none', zIndex: 10 }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <input
          type="date"
          name={name}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
        />
      </div>
    </div>
  );
};

const TimeInput: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const isRTL = locale === 'ar';
  const inputStyle: React.CSSProperties = {
    ...(hasError ? errorInputStyle : baseInputStyle),
    ...(isRTL ? { paddingRight: '2.75rem' } : { paddingLeft: '2.75rem' }),
    textAlign: isRTL ? 'right' : 'left',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
  };
  
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', ...(isRTL ? { right: '1rem' } : { left: '1rem' }), top: '50%', transform: 'translateY(-50%)', color: COLORS.helper, pointerEvents: 'none', zIndex: 10 }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <input
          type="time"
          name={name}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
        />
      </div>
    </div>
  );
};

const Text: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const inputStyle: React.CSSProperties = {
    ...(hasError ? errorInputStyle : baseInputStyle),
    textAlign: locale === 'ar' ? 'right' : 'left',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
  };
  
  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <input
        name={name}
        type="text"
        placeholder={props?.placeholder?.[locale] || ''}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        maxLength={props?.max_length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle}
      />
    </div>
  );
};

const Textarea: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const inputStyle: React.CSSProperties = {
    ...(hasError ? errorInputStyle : baseInputStyle),
    resize: 'none',
    lineHeight: 1.6,
    textAlign: locale === 'ar' ? 'right' : 'left',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
  };
  
  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <textarea
        name={name}
        placeholder={props?.placeholder?.[locale] || ''}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={props?.rows || 4}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle}
      />
    </div>
  );
};

const NumberInput: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const isRTL = locale === 'ar';
  const inputStyle: React.CSSProperties = {
    ...(hasError ? errorInputStyle : baseInputStyle),
    textAlign: isRTL ? 'right' : 'left',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
  };
  
  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          name={name}
          step={props?.step ?? 1}
          min={props?.min}
          max={props?.max}
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
        />
        {props?.unit?.[locale] && (
          <span style={{ position: 'absolute', ...(isRTL ? { left: '1rem' } : { right: '1rem' }), top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: COLORS.helper }}>
            {props?.unit?.[locale]}
          </span>
        )}
      </div>
    </div>
  );
};

const Email: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const inputStyle: React.CSSProperties = {
    ...(hasError ? errorInputStyle : baseInputStyle),
    textAlign: locale === 'ar' ? 'right' : 'left',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
  };
  
  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <input
        type="email"
        name={name}
        placeholder={props?.placeholder?.[locale] || ''}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle}
      />
    </div>
  );
};

const Phone: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const [countryCode, setCountryCode] = React.useState<string>(props?.default_country || 'KW');
  const [showCountryDropdown, setShowCountryDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  const phoneValue = value?.e164 || '';
  const displayValue = phoneValue.startsWith(selectedCountry.dialCode) 
    ? phoneValue.slice(selectedCountry.dialCode.length) 
    : phoneValue.replace(/^\+\d+/, '');
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);
  
  const handleCountryChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    const newCountry = COUNTRIES.find(c => c.code === newCountryCode) || COUNTRIES[0];
    // Update the value with new country code
    if (displayValue) {
      onChange({ e164: newCountry.dialCode + displayValue.replace(/\D/g, ''), country: newCountryCode });
    } else {
      onChange({ e164: '', country: newCountryCode });
    }
    setShowCountryDropdown(false);
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
    const e164 = selectedCountry.dialCode + inputValue;
    onChange({ e164, country: countryCode });
  };
  
  const isRTL = locale === 'ar';
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isRTL ? 'row-reverse' : 'row', // Reverse for RTL so country selector appears on right
    direction: 'ltr', // Force LTR on container to override parent RTL direction
    alignItems: 'stretch',
    border: `1px solid ${hasError ? COLORS.borderError : COLORS.border}`,
    borderRadius: '16px',
    backgroundColor: hasError ? COLORS.bgError : COLORS.white,
    transition: 'all 0.2s ease',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
  };
  
  const countrySelectorStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1rem',
    ...(isRTL ? { borderLeft: `1px solid ${COLORS.border}`, borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' } : { borderRight: `1px solid ${COLORS.border}`, borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }),
    backgroundColor: COLORS.bgHover,
    cursor: 'pointer',
    userSelect: 'none',
    minWidth: '120px',
    overflow: 'visible',
  };
  
  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 10000,
    marginTop: '4px',
  };
  
  const dropdownItemStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    fontSize: '14px',
    color: COLORS.heading,
    borderBottom: `1px solid ${COLORS.border}`,
  };
  
  const dropdownItemHoverStyle: React.CSSProperties = {
    ...dropdownItemStyle,
    backgroundColor: COLORS.bgHover,
  };
  
  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div style={containerStyle}>
        {isRTL ? (
          <>
            <div ref={dropdownRef} style={countrySelectorStyle} onClick={() => setShowCountryDropdown(!showCountryDropdown)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: COLORS.heading }}>
                {selectedCountry.dialCode}
              </span>
              <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: COLORS.helper }}>▼</span>
              {showCountryDropdown && (
                <div style={dropdownStyle} onMouseDown={(e) => e.preventDefault()}>
                  {COUNTRIES.map((country) => (
                    <div
                      key={country.code}
                      style={country.code === countryCode ? dropdownItemHoverStyle : dropdownItemStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.bgHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = country.code === countryCode ? COLORS.bgHover : COLORS.white;
                      }}
                      onClick={() => handleCountryChange(country.code)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{country.name}</span>
                        <span style={{ color: COLORS.helper }}>{country.dialCode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              name={name}
              type="tel"
              placeholder={props?.placeholder?.[locale] || selectedCountry.example}
              value={displayValue}
              onChange={handlePhoneChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ flex: 1, padding: '0.875rem 1rem', border: 'none', outline: 'none', color: COLORS.heading, backgroundColor: 'transparent', fontSize: '16px', fontFamily: FONT_FAMILY, textAlign: 'right', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}
            />
          </>
        ) : (
          <>
            <div ref={dropdownRef} style={countrySelectorStyle} onClick={() => setShowCountryDropdown(!showCountryDropdown)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: COLORS.heading }}>
                {selectedCountry.dialCode}
              </span>
              <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: COLORS.helper }}>▼</span>
              {showCountryDropdown && (
                <div style={dropdownStyle} onMouseDown={(e) => e.preventDefault()}>
                  {COUNTRIES.map((country) => (
                    <div
                      key={country.code}
                      style={country.code === countryCode ? dropdownItemHoverStyle : dropdownItemStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.bgHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = country.code === countryCode ? COLORS.bgHover : COLORS.white;
                      }}
                      onClick={() => handleCountryChange(country.code)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{country.name}</span>
                        <span style={{ color: COLORS.helper }}>{country.dialCode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              name={name}
              type="tel"
              placeholder={props?.placeholder?.[locale] || selectedCountry.example}
              value={displayValue}
              onChange={handlePhoneChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ flex: 1, padding: '0.875rem 1rem', border: 'none', outline: 'none', color: COLORS.heading, backgroundColor: 'transparent', fontSize: '16px', fontFamily: FONT_FAMILY, textAlign: 'left', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}
            />
          </>
        )}
      </div>
      {displayValue && !validatePhoneNumber(displayValue, countryCode) && (
        <div style={{ fontSize: '12px', color: COLORS.borderError, marginTop: '0.25rem', marginLeft: '0.25rem' }}>
          {locale === 'ar' ? 'رقم الهاتف غير صالح لهذه الدولة' : 'Invalid phone number for this country'}
        </div>
      )}
    </div>
  );
};

const Hero: React.FC<any> = ({ label, locale, props }) => (
  <div style={{ marginBottom: '1rem' }}>
    <h2 style={{ fontSize: '22px', fontWeight: 700, color: COLORS.heading, marginBottom: '0.5rem', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
      {label?.[locale]}
    </h2>
    {props?.description?.[locale] && (
      <p style={{ fontSize: '15px', color: COLORS.helper, marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {props.description[locale]}
      </p>
    )}
  </div>
);

const Select: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const isRTL = locale === 'ar';
  const options = props?.options || [];
  const searchable = props?.searchable || false;
  const allowCustom = props?.allow_custom || false;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearchTerm('');
      }
    };
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const filteredOptions = searchable && searchTerm
    ? options.filter((opt: any) => 
        opt.label?.[locale]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.value?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOption = options.find((opt: any) => opt.value === (typeof value === 'object' ? value?.value : value));
  const displayValue = selectedOption ? selectedOption.label?.[locale] : (allowCustom && typeof value === 'object' ? value?.value : '');

  const containerStyle: React.CSSProperties = {
    position: 'relative',
  };

  const inputStyle: React.CSSProperties = {
    ...(hasError ? errorInputStyle : baseInputStyle),
    textAlign: isRTL ? 'right' : 'left',
    cursor: 'pointer',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
    paddingRight: '2.75rem',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 10000,
    marginTop: '4px',
  };

  const optionStyle: React.CSSProperties = {
    padding: '0.875rem 1rem',
    cursor: 'pointer',
    fontSize: '16px',
    color: COLORS.heading,
    borderBottom: `1px solid ${COLORS.border}`,
    textAlign: isRTL ? 'right' : 'left',
  };

  const optionHoverStyle: React.CSSProperties = {
    ...optionStyle,
    backgroundColor: COLORS.bgHover,
  };

  const selectedOptionStyle: React.CSSProperties = {
    ...optionStyle,
    backgroundColor: COLORS.bgHover,
    fontWeight: 500,
  };

  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div style={containerStyle} ref={dropdownRef}>
        <div
          style={inputStyle}
          onClick={() => setShowDropdown(!showDropdown)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {displayValue || (props?.placeholder?.[locale] || (locale === 'ar' ? 'اختر...' : 'Select...'))}
          <span style={{ position: 'absolute', ...(isRTL ? { left: '1rem' } : { right: '1rem' }), top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: COLORS.helper, pointerEvents: 'none' }}>
            {showDropdown ? '▲' : '▼'}
          </span>
        </div>
        {showDropdown && (
          <div style={dropdownStyle} onMouseDown={(e) => e.preventDefault()}>
            {searchable && (
              <div style={{ padding: '0.75rem', borderBottom: `1px solid ${COLORS.border}` }}>
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: `1px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '14px' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {filteredOptions.map((opt: any) => {
              const isSelected = opt.value === (typeof value === 'object' ? value?.value : value);
              return (
                <div
                  key={opt.value}
                  style={isSelected ? selectedOptionStyle : optionStyle}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.white;
                  }}
                  onClick={() => {
                    onChange({ value: opt.value });
                    setShowDropdown(false);
                    setSearchTerm('');
                  }}
                >
                  {opt.label?.[locale] || opt.value}
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '0.875rem 1rem', color: COLORS.helper, textAlign: 'center', fontSize: '14px' }}>
                {locale === 'ar' ? 'لا توجد خيارات' : 'No options'}
              </div>
            )}
            {allowCustom && searchTerm && !filteredOptions.some((opt: any) => opt.value === searchTerm) && (
              <div
                style={optionStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.white}
                onClick={() => {
                  onChange({ value: searchTerm });
                  setShowDropdown(false);
                  setSearchTerm('');
                }}
              >
                {locale === 'ar' ? `إضافة "${searchTerm}"` : `Add "${searchTerm}"`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MultiSelect: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [focused, setFocused] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const isRTL = locale === 'ar';
  const options = props?.options || [];
  const searchable = props?.searchable || false;
  const allowCustom = props?.allow_custom || false;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearchTerm('');
      }
    };
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const selectedValues = Array.isArray(value) ? value.map((v: any) => typeof v === 'object' ? v?.value : v) : [];
  const selectedOptions = options.filter((opt: any) => selectedValues.includes(opt.value));

  const filteredOptions = searchable && searchTerm
    ? options.filter((opt: any) => 
        opt.label?.[locale]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.value?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
  };

  const inputStyle: React.CSSProperties = {
    ...(hasError ? errorInputStyle : baseInputStyle),
    textAlign: isRTL ? 'right' : 'left',
    cursor: 'pointer',
    minHeight: '3rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 2.75rem 0.5rem 1rem',
    ...(focused ? (hasError ? errorInputFocusStyle : baseInputFocusStyle) : {}),
  };

  const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.75rem',
    backgroundColor: COLORS.bgHover,
    borderRadius: '8px',
    fontSize: '14px',
    color: COLORS.heading,
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 10000,
    marginTop: '4px',
  };

  const optionStyle: React.CSSProperties = {
    padding: '0.875rem 1rem',
    cursor: 'pointer',
    fontSize: '16px',
    color: COLORS.heading,
    borderBottom: `1px solid ${COLORS.border}`,
    textAlign: isRTL ? 'right' : 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const toggleOption = (optValue: string) => {
    const currentValues = Array.isArray(value) ? value.map((v: any) => typeof v === 'object' ? v?.value : v) : [];
    if (currentValues.includes(optValue)) {
      const newValues = currentValues.filter((v: string) => v !== optValue);
      onChange(newValues.map((v: string) => ({ value: v })));
    } else {
      onChange([...currentValues, optValue].map((v: string) => ({ value: v })));
    }
  };

  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div style={containerStyle} ref={dropdownRef}>
        <div
          style={inputStyle}
          onClick={() => setShowDropdown(!showDropdown)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt: any) => (
              <span key={opt.value} style={tagStyle}>
                {opt.label?.[locale] || opt.value}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(opt.value);
                  }}
                  style={{ background: 'none', border: 'none', color: COLORS.helper, cursor: 'pointer', fontSize: '16px', padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span style={{ color: COLORS.placeholder }}>
              {props?.placeholder?.[locale] || (locale === 'ar' ? 'اختر...' : 'Select...')}
            </span>
          )}
          <span style={{ position: 'absolute', ...(isRTL ? { left: '1rem' } : { right: '1rem' }), top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: COLORS.helper, pointerEvents: 'none' }}>
            {showDropdown ? '▲' : '▼'}
          </span>
        </div>
        {showDropdown && (
          <div style={dropdownStyle} onMouseDown={(e) => e.preventDefault()}>
            {searchable && (
              <div style={{ padding: '0.75rem', borderBottom: `1px solid ${COLORS.border}` }}>
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: `1px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '14px' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {filteredOptions.map((opt: any) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  style={isSelected ? { ...optionStyle, backgroundColor: COLORS.bgHover, fontWeight: 500 } : optionStyle}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.white;
                  }}
                  onClick={() => toggleOption(opt.value)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: COLORS.primary }}
                  />
                  {opt.label?.[locale] || opt.value}
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '0.875rem 1rem', color: COLORS.helper, textAlign: 'center', fontSize: '14px' }}>
                {locale === 'ar' ? 'لا توجد خيارات' : 'No options'}
              </div>
            )}
            {allowCustom && searchTerm && !filteredOptions.some((opt: any) => opt.value === searchTerm) && !selectedValues.includes(searchTerm) && (
              <div
                style={optionStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.white}
                onClick={() => {
                  toggleOption(searchTerm);
                  setSearchTerm('');
                }}
              >
                {locale === 'ar' ? `إضافة "${searchTerm}"` : `Add "${searchTerm}"`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Checkbox: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const isRTL = locale === 'ar';
  const isChecked = value === true || value === 'true';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '0.875rem',
    border: `1px solid ${hasError ? COLORS.borderError : COLORS.border}`,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: hasError ? COLORS.bgError : COLORS.white,
    marginBottom: '0.625rem',
    flexDirection: isRTL ? 'row-reverse' : 'row',
  };

  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <label
        style={containerStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = hasError ? COLORS.bgErrorHover : COLORS.bgHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = hasError ? COLORS.bgError : COLORS.white;
        }}
      >
        <input
          type="checkbox"
          name={name}
          checked={isChecked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: '16px', height: '16px', ...(isRTL ? { marginLeft: '1rem' } : { marginRight: '1rem' }), cursor: 'pointer', accentColor: COLORS.primary, marginTop: '2px' }}
        />
        <span style={{ color: COLORS.heading, fontSize: '16px', flex: 1 }}>
          {props?.label?.[locale] || (locale === 'ar' ? 'موافق' : 'I agree')}
        </span>
      </label>
    </div>
  );
};

const LocationPicker: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const isRTL = locale === 'ar';
  
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(locale === 'ar' ? 'الموقع الجغرافي غير مدعوم في هذا المتصفح' : 'Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError('');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const location = {
          lat: lat,
          lng: lng,
          accuracy: position.coords.accuracy,
          url: `https://www.google.com/maps?q=${lat},${lng}`,
        };
        onChange(location);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        let errorMsg = '';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = locale === 'ar' ? 'تم رفض طلب الموقع الجغرافي' : 'Location request denied';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = locale === 'ar' ? 'معلومات الموقع غير متاحة' : 'Location information unavailable';
            break;
          case err.TIMEOUT:
            errorMsg = locale === 'ar' ? 'انتهت مهلة طلب الموقع' : 'Location request timed out';
            break;
          default:
            errorMsg = locale === 'ar' ? 'حدث خطأ في الحصول على الموقع' : 'An error occurred while retrieving location';
        }
        setError(errorMsg);
      },
      {
        enableHighAccuracy: props?.high_accuracy || false,
        timeout: props?.timeout || 10000,
        maximumAge: props?.maximum_age || 0,
      }
    );
  };

  const getMapsUrl = (lat: number, lng: number, label?: string): string => {
    // Detect if iOS (will prefer Apple Maps) or Android/Desktop (will prefer Google Maps)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const locationLabel = label || encodeURIComponent(`${lat},${lng}`);
    
    if (isIOS) {
      // Apple Maps URL
      return `https://maps.apple.com/?ll=${lat},${lng}&q=${locationLabel}`;
    } else {
      // Google Maps URL
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
  };

  const containerStyle: React.CSSProperties = {
    border: `1px solid ${hasError ? COLORS.borderError : COLORS.border}`,
    borderRadius: '16px',
    padding: '1rem',
    backgroundColor: hasError ? COLORS.bgError : COLORS.white,
    transition: 'all 0.2s ease',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem',
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    transition: 'all 0.2s ease',
    fontFamily: FONT_FAMILY,
    marginBottom: value ? '1rem' : '0',
  };

  const linkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: COLORS.primary,
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: COLORS.bgHover,
    transition: 'all 0.2s ease',
  };

  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div style={containerStyle}>
        {!value ? (
          <>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={loading}
              style={buttonStyle}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = COLORS.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primary;
              }}
            >
              {loading 
                ? (locale === 'ar' ? 'جاري الحصول على الموقع...' : 'Getting location...')
                : (locale === 'ar' ? '📍 الحصول على موقعي' : '📍 Get My Location')
              }
            </button>
            {error && (
              <div style={{ fontSize: '14px', color: COLORS.borderError, marginTop: '0.5rem' }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a
                href={getMapsUrl(value.lat, value.lng, label?.[locale])}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.border;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.bgHover;
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {locale === 'ar' ? 'افتح في الخرائط' : 'Open in Maps'}
              </a>
              <button
                type="button"
                onClick={() => onChange(null)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '14px',
                  color: COLORS.helper,
                  backgroundColor: 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.bgHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {locale === 'ar' ? 'تغيير' : 'Change'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Switch: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const isRTL = locale === 'ar';
  const isChecked = value === true || value === 'true';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0.875rem',
    border: `1px solid ${hasError ? COLORS.borderError : COLORS.border}`,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: hasError ? COLORS.bgError : COLORS.white,
    marginBottom: '0.625rem',
    justifyContent: 'space-between',
    flexDirection: isRTL ? 'row-reverse' : 'row',
  };

  const switchStyle: React.CSSProperties = {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: isChecked ? COLORS.primary : COLORS.border,
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  };

  const switchThumbStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: COLORS.white,
    position: 'absolute',
    top: '2px',
    ...(isChecked ? (isRTL ? { right: '2px' } : { left: '22px' }) : (isRTL ? { right: '22px' } : { left: '2px' })),
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  };

  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <label
        style={containerStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = hasError ? COLORS.bgErrorHover : COLORS.bgHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = hasError ? COLORS.bgError : COLORS.white;
        }}
        onClick={(e) => {
          e.preventDefault();
          onChange(!isChecked);
        }}
      >
        <span style={{ color: COLORS.heading, fontSize: '16px', flex: 1 }}>
          {props?.label?.[locale] || (locale === 'ar' ? 'تفعيل' : 'Enable')}
        </span>
        <div style={switchStyle}>
          <div style={switchThumbStyle} />
        </div>
      </label>
    </div>
  );
};

const Radio: React.FC<any> = ({ name, label, props, locale, value, onChange, required, hasError }) => {
  const isRTL = locale === 'ar';
  const optionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0.875rem',
    border: `1px solid ${hasError ? COLORS.borderError : COLORS.border}`,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: hasError ? COLORS.bgError : COLORS.white,
    marginBottom: '0.625rem',
  };
  
  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div>
        {(props?.options || []).map((opt: any) => (
          <label
            key={opt.value}
            style={optionStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = hasError ? COLORS.bgErrorHover : COLORS.bgHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = hasError ? COLORS.bgError : COLORS.white;
            }}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={typeof value === 'object' ? value?.value === opt.value : value === opt.value}
              onChange={() => onChange({ value: opt.value })}
              style={{ width: '16px', height: '16px', ...(isRTL ? { marginLeft: '1rem' } : { marginRight: '1rem' }), cursor: 'pointer', accentColor: COLORS.primary }}
            />
            <span style={{ color: COLORS.heading, fontSize: '16px' }}>{opt.label?.[locale]}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const FileUpload: React.FC<any> = ({ name, label, props, locale, onChange, required, hasError }) => {
  const [files, setFiles] = React.useState<any[]>([])
  const maxFiles = props?.maxFiles || 1
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || [])
    const newFiles: any[] = []
    
    for (const file of fileList.slice(0, maxFiles - files.length)) {
      try {
        const signRes = await fetch('/api/uploads/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: 'forms/uploads', publicIdPrefix: 'form' }) })
        const sign = await signRes.json()
        const fd = new FormData()
        fd.append('file', file)
        fd.append('api_key', sign.apiKey)
        fd.append('timestamp', String(sign.timestamp))
        fd.append('signature', sign.signature)
        fd.append('folder', sign.folder)
        fd.append('public_id', sign.publicId)
        const upl = await fetch(sign.uploadUrl, { method: 'POST', body: fd })
        const ur = await upl.json()
        newFiles.push({ id: ur.public_id, url: ur.secure_url, bytes: ur.bytes, resource_type: ur.resource_type, name: file.name })
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    
    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)
    onChange(maxFiles === 1 ? updatedFiles[0] : updatedFiles)
  }
  
  const uploadStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0.875rem 1rem',
    border: `2px dashed ${hasError ? COLORS.borderError : COLORS.border}`,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: hasError ? COLORS.bgError : COLORS.white,
    marginBottom: '0.625rem',
  };
  
  return (
    <div>
      <label style={labelStyle}>
        {label?.[locale]}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {props?.help?.[locale] && <p style={helperStyle}>{props?.help?.[locale]}</p>}
      <div>
        <label
          style={uploadStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = hasError ? COLORS.bgErrorHover : COLORS.bgHover;
            e.currentTarget.style.borderColor = hasError ? COLORS.borderError : '#D1D5DB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = hasError ? COLORS.bgError : COLORS.white;
            e.currentTarget.style.borderColor = hasError ? COLORS.borderError : COLORS.border;
          }}
        >
          <span style={{ fontSize: '14px', color: hasError ? COLORS.borderError : COLORS.helper }}>
            {locale === 'ar' ? 'اختر ملف' : 'Choose file'}
          </span>
          <button
            type="button"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.heading,
              backgroundColor: COLORS.bgHover,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'colors 0.2s ease',
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const input = document.createElement('input')
              input.type = 'file'
              input.multiple = maxFiles > 1
              input.onchange = (ev: any) => handleFileChange(ev)
              input.click()
            }}
          >
            {locale === 'ar' ? 'تصفح' : 'Choose Files'}
          </button>
          <input type="file" style={{ display: 'none' }} onChange={handleFileChange} multiple={maxFiles > 1} />
        </label>
        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', color: COLORS.heading, backgroundColor: COLORS.bgHover, padding: '0.5rem 0.75rem', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name || 'Uploaded'}</span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = files.filter((_, idx) => idx !== i)
                    setFiles(updated)
                    onChange(maxFiles === 1 ? updated[0] : updated)
                  }}
                  style={{ color: COLORS.helper, border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DefaultComponents: Record<string, (props: any) => React.ReactNode> = {
  info: (p) => <Hero {...p} />,
  text: (p) => <Text {...p} />,
  textarea: (p) => <Textarea {...p} />,
  number: (p) => <NumberInput {...p} />,
  email: (p) => <Email {...p} />,
  phone: (p) => <Phone {...p} />,
  radio: (p) => <Radio {...p} />,
  select: (p) => <Select {...p} />,
  multiselect: (p) => <MultiSelect {...p} />,
  checkbox: (p) => <Checkbox {...p} />,
  switch: (p) => <Switch {...p} />,
  file_upload: (p) => <FileUpload {...p} />,
  date: (p) => <DateInput {...p} />,
  time: (p) => <TimeInput {...p} />,
  location: (p) => <LocationPicker {...p} />,
};
