// Amplitude is loaded dynamically to avoid plugin import issues
// All Amplitude imports are done at runtime, not at module load time
let amplitudeModule: any = null;
let amplitudeClient: any = null;
import type { FormConfig, Field } from '../renderer/types';

// Amplitude configuration
const AMPLITUDE_API_KEY = 'ea353a2eec64ceddbb5cde4f6d9ee886';

// Feature flag to disable Amplitude if plugin issues occur
// Set to false to completely disable Amplitude analytics
const AMPLITUDE_ENABLED = true;

// Initialize Amplitude instance
let amplitudeInitialized = false;
let amplitudeLoadFailed = false;

// Set up error handler to catch module execution errors
if (typeof window !== 'undefined') {
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    // Check if this is the frustrationPlugin error
    if (typeof message === 'string' && message.includes('frustrationPlugin')) {
      console.warn('[Amplitude] Plugin error detected, disabling Amplitude:', message);
      amplitudeLoadFailed = true;
      amplitudeModule = null;
      amplitudeClient = null;
      // Don't propagate the error - let the app continue
      return true;
    }
    // Call original error handler for other errors
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };
}

// Lazy load Amplitude module with error handling
// Wrapped in additional try-catch to handle module execution errors
async function loadAmplitudeModule() {
  if (amplitudeModule) return amplitudeModule;
  if (amplitudeLoadFailed) return null;
  
  try {
    // Use dynamic import with error handling for both import and execution
    const importPromise = import('@amplitude/analytics-browser');
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Amplitude import timeout')), 5000)
    );
    
    amplitudeModule = await Promise.race([importPromise, timeoutPromise]);
    return amplitudeModule;
  } catch (error: any) {
    // Catch any error - import failure, execution error, or timeout
    console.warn('[Amplitude] Failed to load module, analytics disabled:', error?.message || error);
    amplitudeLoadFailed = true;
    amplitudeModule = null;
    return null;
  }
}

export async function initAmplitude(sessionId?: string, userId?: string | number) {
  // Early return if Amplitude is disabled
  if (!AMPLITUDE_ENABLED) {
    return;
  }

  if (amplitudeInitialized && amplitudeClient && amplitudeModule) {
    // Update session/user ID if already initialized
    if (sessionId && amplitudeModule.setSessionId) {
      // Amplitude expects session IDs to be Unix timestamps in milliseconds
      let numericSessionId: number;
      const parsed = parseInt(sessionId, 10);
      
      if (!isNaN(parsed) && parsed >= 1000000000000) {
        numericSessionId = parsed;
      } else if (!isNaN(parsed) && parsed > 0 && parsed < 1000000000000) {
        numericSessionId = parsed * 1000;
      } else {
        numericSessionId = Date.now();
      }
      
      amplitudeModule.setSessionId(numericSessionId);
    }
    if (userId && amplitudeModule.setUserId) {
      amplitudeModule.setUserId(String(userId));
    }
    return;
  }

  if (amplitudeLoadFailed) {
    return; // Don't try again if it already failed
  }

  try {
    // Dynamically import Amplitude to avoid plugin loading issues
    const module = await loadAmplitudeModule();
    if (!module) {
      return; // Module failed to load
    }
    
    // Initialize Amplitude with minimal configuration to avoid plugin issues
    // Disable autocapture to prevent frustrationPlugin import error
    module.init(AMPLITUDE_API_KEY, {
      defaultTracking: {
        sessions: false, // Disable automatic session tracking - we'll track sessions manually
        pageViews: false,
        formInteractions: false,
        fileDownloads: false,
      },
      autocapture: false, // Disable autocapture completely to prevent frustrationPlugin import
      logLevel: 0, // Disable Amplitude's internal logging to reduce noise
      flushQueueSize: 1, // Flush after every event (for testing)
      flushIntervalMillis: 0, // Disable interval flushing, use immediate flush
    });
    
    // Store the module as both client and module - Amplitude uses singleton pattern
    amplitudeClient = module;
    amplitudeModule = module; // Ensure amplitudeModule is set for tracking functions

    // Always set a session ID - use provided one or generate a timestamp-based one
    if (module.setSessionId) {
      let numericSessionId: number;
      
      if (sessionId) {
        // Parse provided session ID
        const parsed = parseInt(sessionId, 10);
        
        // If it's a valid number and looks like milliseconds (>= 1000000000000, i.e., after year 2001)
        if (!isNaN(parsed) && parsed >= 1000000000000) {
          // Already in milliseconds format
          numericSessionId = parsed;
        } else if (!isNaN(parsed) && parsed > 0 && parsed < 1000000000000) {
          // Looks like seconds, convert to milliseconds
          numericSessionId = parsed * 1000;
        } else {
          // String session ID - use current timestamp in milliseconds
          numericSessionId = Date.now();
        }
      } else {
        // No session ID provided - generate one using current timestamp
        numericSessionId = Date.now();
      }
      
      module.setSessionId(numericSessionId);
    }

    if (userId && module.setUserId) {
      module.setUserId(String(userId));
    }

    amplitudeInitialized = true;
  } catch (error) {
    console.error('[Amplitude] Initialization error:', error);
    // Continue without Amplitude if initialization fails
    amplitudeClient = null;
    amplitudeModule = null;
    amplitudeLoadFailed = true;
  }
}

export function setAmplitudeUserId(userId: string | number) {
  try {
    if (amplitudeModule && amplitudeModule.setUserId) {
      amplitudeModule.setUserId(String(userId));
    }
  } catch (error) {
    console.error('[Amplitude] Error setting user ID:', error);
  }
}

export function setAmplitudeSessionId(sessionId: string) {
  try {
    if (amplitudeModule && amplitudeModule.setSessionId) {
      // Amplitude expects session IDs to be Unix timestamps in milliseconds
      // Use current timestamp in milliseconds, or parse if it's already a timestamp
      let numericSessionId: number;
      const parsed = parseInt(sessionId, 10);
      
      // If it's a valid number and looks like milliseconds (>= 1000000000000, i.e., after year 2001)
      if (!isNaN(parsed) && parsed >= 1000000000000) {
        // Already in milliseconds format
        numericSessionId = parsed;
      } else if (!isNaN(parsed) && parsed > 0 && parsed < 1000000000000) {
        // Looks like seconds, convert to milliseconds
        numericSessionId = parsed * 1000;
      } else {
        // String session ID - use current timestamp in milliseconds
        // This ensures Amplitude gets a valid session ID
        numericSessionId = Date.now();
      }
      
      amplitudeModule.setSessionId(numericSessionId);
    }
  } catch (error) {
    console.error('[Amplitude] Error setting session ID:', error);
  }
}

export async function setAmplitudeUserProperties(properties: Record<string, any>) {
  try {
    // Ensure module is loaded
    if (!amplitudeModule) {
      const module = await loadAmplitudeModule();
      if (!module) return;
      amplitudeModule = module;
    }
    
    if (!amplitudeModule || !amplitudeModule.identify) {
      console.warn('[Amplitude] identify method not available');
      return;
    }
    
    // Import Identify from analytics-core
    try {
      const { Identify } = await import('@amplitude/analytics-core');
      const identify = new Identify();
      
      // Track which properties we actually set
      const propertiesSet: Record<string, any> = {};
      let hasValidProperties = false;
      
      // Filter out user_id if present (should be set via setUserId, not as property)
      const propsWithoutUserId = { ...properties };
      delete propsWithoutUserId.user_id;
      
      // Sanitize and set properties one by one
      for (const [key, value] of Object.entries(propsWithoutUserId)) {
        // Skip null, undefined
        if (value === null || value === undefined) {
          continue;
        }
        
        // Handle strings - must be non-empty after trimming
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length > 0 && trimmed.length <= 1000) { // Amplitude has character limits
            identify.set(key, trimmed);
            propertiesSet[key] = trimmed;
            hasValidProperties = true;
          }
          continue;
        }
        
        // Handle numbers - must be finite and not NaN
        if (typeof value === 'number') {
          if (Number.isFinite(value) && !Number.isNaN(value)) {
            identify.set(key, value);
            propertiesSet[key] = value;
            hasValidProperties = true;
          }
          continue;
        }
        
        // Handle booleans
        if (typeof value === 'boolean') {
          identify.set(key, value);
          propertiesSet[key] = value;
          hasValidProperties = true;
          continue;
        }
        
        // Handle arrays - must contain only primitives and not be empty
        if (Array.isArray(value)) {
          const primitiveArray: (string | number | boolean)[] = [];
          for (const item of value) {
            if (item === null || item === undefined) continue;
            
            if (typeof item === 'string') {
              const trimmed = item.trim();
              if (trimmed.length > 0 && trimmed.length <= 1000) {
                primitiveArray.push(trimmed);
              }
            } else if (typeof item === 'number' && Number.isFinite(item) && !Number.isNaN(item)) {
              primitiveArray.push(item);
            } else if (typeof item === 'boolean') {
              primitiveArray.push(item);
            }
            // Skip objects and other types within arrays
          }
          
          if (primitiveArray.length > 0 && primitiveArray.length <= 100) { // Amplitude has array size limits
            identify.set(key, primitiveArray);
            propertiesSet[key] = primitiveArray;
            hasValidProperties = true;
          }
          continue;
        }
        
        // Skip objects and other types - don't convert to JSON strings for user properties
      }
      
      // Only call identify if we have valid properties to set
      if (hasValidProperties) {
        try {
          amplitudeModule.identify(identify);
        } catch (identifyError: any) {
          console.error('[Amplitude] Error calling identify:', identifyError?.message || identifyError, { 
            propertiesSet,
            errorDetails: identifyError 
          });
        }
      }
    } catch (importError) {
      console.error('[Amplitude] Error importing Identify:', importError);
    }
  } catch (error) {
    console.error('[Amplitude] Error setting user properties:', error);
  }
}

// Helper to get device type
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Helper to calculate form completion percentage
function calculateCompletionPercentage(
  answers: Record<string, any>,
  fields: Field[]
): number {
  if (fields.length === 0) return 0;
  const fieldsWithValues = fields.filter((f) => {
    const value = answers[f.name];
    return value !== undefined && value !== null && value !== '';
  }).length;
  return Math.round((fieldsWithValues / fields.length) * 100);
}

// Helper to get field position
function getFieldPosition(fieldName: string, fields: Field[]): number {
  return fields.findIndex((f) => f.name === fieldName) + 1;
}

// Helper to sanitize event properties for Amplitude
// Amplitude only accepts: string, number, boolean, or array of these types
// Empty strings, null, undefined are filtered out
function sanitizeEventProperties(props: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(props)) {
    // Skip null, undefined
    if (value === null || value === undefined) {
      continue;
    }
    
    // Handle arrays - ensure they only contain primitives
    if (Array.isArray(value)) {
      const sanitizedArray: (string | number | boolean)[] = [];
      for (const item of value) {
        if (item === null || item === undefined) continue;
        
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed.length > 0) {
            sanitizedArray.push(trimmed);
          }
        } else if (typeof item === 'number' && Number.isFinite(item) && !Number.isNaN(item)) {
          sanitizedArray.push(item);
        } else if (typeof item === 'boolean') {
          sanitizedArray.push(item);
        }
        // Skip objects and other types within arrays - don't convert to strings
      }
      
      // Only include non-empty arrays
      if (sanitizedArray.length > 0) {
        sanitized[key] = sanitizedArray;
      }
      continue;
    }
    
    // Handle strings - must be non-empty after trimming
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        sanitized[key] = trimmed;
      }
      continue;
    }
    
    // Handle numbers - must be finite and not NaN
    if (typeof value === 'number') {
      if (Number.isFinite(value) && !Number.isNaN(value)) {
        sanitized[key] = value;
      }
      continue;
    }
    
    // Handle booleans
    if (typeof value === 'boolean') {
      sanitized[key] = value;
      continue;
    }
    
    // Convert objects to JSON strings (but skip empty objects)
    if (typeof value === 'object') {
      try {
        const jsonStr = JSON.stringify(value);
        if (jsonStr !== '{}' && jsonStr !== '[]' && jsonStr.length > 0) {
          sanitized[key] = jsonStr;
        }
      } catch {
        // Skip if can't stringify
      }
      continue;
    }
    
    // Fallback: convert to string (but skip empty after trimming)
    const strValue = String(value).trim();
    if (strValue.length > 0) {
      sanitized[key] = strValue;
    }
  }
  
  return sanitized;
}

// Helper to safely track events with sanitized properties
function safeTrack(eventType: string, properties: Record<string, any>) {
  if (!amplitudeModule || !amplitudeModule.track) {
    return;
  }
  try {
    const sanitized = sanitizeEventProperties(properties);
    // Ensure eventType is a non-empty string
    if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
      console.error(`[Amplitude] Invalid event type: ${eventType}`);
      return;
    }
    // Log what we're sending for debugging
    const sanitizedKeys = Object.keys(sanitized);
    if (sanitizedKeys.length === 0) {
      console.warn(`[Amplitude] ${eventType} has no valid properties after sanitization`, properties);
      return;
    }
    
    amplitudeModule.track(eventType, sanitized);
    
    // Force flush to ensure event is sent immediately
    if (amplitudeModule.flush) {
      amplitudeModule.flush();
    }
  } catch (error) {
    console.error(`[Amplitude] Error tracking ${eventType}:`, error, { originalProperties: properties });
  }
}

// Event tracking functions
export function trackFormViewed(
  form: FormConfig,
  locale: string,
  sessionId?: string
) {
  try {
    // Don't include session_id in properties - it's set via setSessionId()
    safeTrack('form_viewed', {
      form_id: form.formId,
      form_version: form.version,
      locale,
      device_type: getDeviceType(),
      url: window.location.href,
      referrer: document.referrer || undefined, // Will be filtered if empty
      field_count: form.fields.length,
      form_title: form.title[locale] || form.title.en || undefined, // Will be filtered if empty
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_viewed:', error);
  }
}

export function trackFieldFocused(
  form: FormConfig,
  field: Field,
  locale: string,
  sessionId?: string,
  timeOnForm?: number,
  currentValue?: any
) {
  try {
    // Get question string (field label)
    const questionString = field.label[locale] || field.label.en || '';
    
    // Format value for logging
    let valueString = '';
    if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
      if (typeof currentValue === 'string') {
        valueString = currentValue;
      } else if (typeof currentValue === 'number' || typeof currentValue === 'boolean') {
        valueString = String(currentValue);
      } else if (Array.isArray(currentValue)) {
        valueString = currentValue.map(v => {
          if (typeof v === 'object' && v !== null) {
            return JSON.stringify(v);
          }
          return String(v);
        }).join(', ');
      } else if (typeof currentValue === 'object') {
        valueString = JSON.stringify(currentValue);
      }
    }
    
    safeTrack('form_field_focused', {
      form_id: form.formId,
      form_version: form.version,
      field_name: field.name,
      field_type: field.type,
      field_position: getFieldPosition(field.name, form.fields),
      locale,
      question: questionString, // Question string (field label)
      value: valueString || undefined, // User input value (if exists)
      has_value: valueString.length > 0,
      is_required: !!(field as any).props?.required,
      time_on_form: timeOnForm || 0,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_field_focused:', error);
  }
}

export function trackFieldBlurred(
  form: FormConfig,
  field: Field,
  locale: string,
  value: any,
  sessionId?: string,
  timeInField?: number,
  hasError?: boolean
) {
  try {
    const hasValue = value !== undefined && value !== null && value !== '';
    let valueLength = 0;
    if (typeof value === 'string') {
      valueLength = value.length;
    } else if (Array.isArray(value)) {
      valueLength = value.length;
    }

    safeTrack('form_field_blurred', {
      form_id: form.formId,
      form_version: form.version,
      field_name: field.name,
      field_type: field.type,
      field_position: getFieldPosition(field.name, form.fields),
      locale,
      has_value: hasValue,
      value_length: valueLength,
      time_in_field: timeInField || 0,
      has_error: hasError || false,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_field_blurred:', error);
  }
}

export function trackFieldChanged(
  form: FormConfig,
  field: Field,
  locale: string,
  answers: Record<string, any>,
  sessionId?: string,
  changeType: 'typed' | 'selected' | 'cleared' | 'uploaded' = 'typed'
) {
  try {
    const value = answers[field.name];
    let valueType = 'null';
    let valueLength = 0;

    if (value !== undefined && value !== null) {
      if (typeof value === 'string') {
        valueType = 'string';
        valueLength = value.length;
      } else if (typeof value === 'number') {
        valueType = 'number';
      } else if (typeof value === 'boolean') {
        valueType = 'boolean';
      } else if (Array.isArray(value)) {
        valueType = 'array';
        valueLength = value.length;
      } else if (typeof value === 'object') {
        valueType = 'object';
      }
    }

    const completionPercentage = calculateCompletionPercentage(answers, form.fields);

    safeTrack('form_field_changed', {
      form_id: form.formId,
      form_version: form.version,
      field_name: field.name,
      field_type: field.type,
      field_position: getFieldPosition(field.name, form.fields),
      locale,
      change_type: changeType,
      value_type: valueType,
      value_length: valueLength,
      is_valid: true, // Will be updated on validation
      completion_percentage: completionPercentage,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_field_changed:', error);
  }
}

export function trackValidationError(
  form: FormConfig,
  field: Field,
  locale: string,
  errorCode: string,
  errorMessage: string,
  sessionId?: string,
  attemptNumber: number = 1,
  timeOnForm?: number
) {
  try {
    safeTrack('form_validation_error', {
      form_id: form.formId,
      form_version: form.version,
      field_name: field.name,
      field_type: field.type,
      field_position: getFieldPosition(field.name, form.fields),
      locale,
      error_code: errorCode,
      error_message: errorMessage,
      attempt_number: attemptNumber,
      time_on_form: timeOnForm || 0,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_validation_error:', error);
  }
}

export function trackSubmissionStarted(
  form: FormConfig,
  locale: string,
  answers: Record<string, any>,
  sessionId?: string,
  submissionTime?: number
) {
  try {
    const fieldsCompleted = form.fields.filter((f) => {
      const value = answers[f.name];
      return value !== undefined && value !== null && value !== '';
    }).length;

    const requiredFields = form.fields.filter((f) => !!(f as any).props?.required);
    const requiredFieldsCompleted = requiredFields.filter((f) => {
      const value = answers[f.name];
      return value !== undefined && value !== null && value !== '';
    }).length;

    const optionalFields = form.fields.filter((f) => !(f as any).props?.required);
    const optionalFieldsCompleted = optionalFields.filter((f) => {
      const value = answers[f.name];
      return value !== undefined && value !== null && value !== '';
    }).length;

    const fieldTypesUsed = Array.from(
      new Set(
        form.fields
          .filter((f) => {
            const value = answers[f.name];
            return value !== undefined && value !== null && value !== '';
          })
          .map((f) => f.type)
      )
    );

    const hasFileUploads = form.fields.some((f) => {
      if (f.type !== 'file_upload') return false;
      const value = answers[f.name];
      return value !== undefined && value !== null;
    });

    const hasLocation = form.fields.some((f) => {
      if (f.type !== 'location') return false;
      const value = answers[f.name];
      return value !== undefined && value !== null;
    });

    safeTrack('form_submission_started', {
      form_id: form.formId,
      form_version: form.version,
      locale,
      submission_time: submissionTime || 0,
      fields_completed: fieldsCompleted,
      fields_total: form.fields.length,
      completion_percentage: calculateCompletionPercentage(answers, form.fields),
      required_fields_completed: requiredFieldsCompleted,
      optional_fields_completed: optionalFieldsCompleted,
      field_types_used: fieldTypesUsed,
      has_file_uploads: hasFileUploads,
      has_location: hasLocation,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_submission_started:', error);
  }
}

export function trackSubmissionSuccess(
  form: FormConfig,
  locale: string,
  answers: Record<string, any>,
  submissionId: number,
  sessionId?: string,
  submissionTime?: number,
  actionsCompleted?: string[],
  actionsFailed?: string[]
) {
  try {
    const fieldsCompleted = form.fields.filter((f) => {
      const value = answers[f.name];
      return value !== undefined && value !== null && value !== '';
    }).length;

    const hasFileUploads = form.fields.some((f) => {
      if (f.type !== 'file_upload') return false;
      const value = answers[f.name];
      return value !== undefined && value !== null;
    });

    let fileCount = 0;
    if (hasFileUploads) {
      form.fields.forEach((f) => {
        if (f.type === 'file_upload') {
          const value = answers[f.name];
          if (Array.isArray(value)) {
            fileCount += value.length;
          } else if (value) {
            fileCount += 1;
          }
        }
      });
    }

    const hasLocation = form.fields.some((f) => {
      if (f.type !== 'location') return false;
      const value = answers[f.name];
      return value !== undefined && value !== null;
    });

    safeTrack('form_submission_success', {
      form_id: form.formId,
      form_version: form.version,
      submission_id: submissionId,
      locale,
      submission_time: submissionTime || 0,
      fields_completed: fieldsCompleted,
      fields_total: form.fields.length,
      completion_percentage: calculateCompletionPercentage(answers, form.fields),
      actions_completed: actionsCompleted || [],
      actions_failed: actionsFailed || [],
      total_actions: (actionsCompleted?.length || 0) + (actionsFailed?.length || 0),
      has_file_uploads: hasFileUploads,
      file_count: fileCount,
      has_location: hasLocation,
      device_type: getDeviceType(),
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_submission_success:', error);
  }
}

export function trackSubmissionError(
  form: FormConfig,
  locale: string,
  answers: Record<string, any>,
  errorType: string,
  errorMessage: string,
  sessionId?: string,
  submissionTime?: number,
  retryAttempt: number = 1,
  failedAction?: string
) {
  try {
    safeTrack('form_submission_error', {
      form_id: form.formId,
      form_version: form.version,
      locale,
      error_type: errorType,
      error_message: errorMessage,
      submission_time: submissionTime || 0,
      retry_attempt: retryAttempt,
      fields_completed: form.fields.filter((f) => {
        const value = answers[f.name];
        return value !== undefined && value !== null && value !== '';
      }).length,
      completion_percentage: calculateCompletionPercentage(answers, form.fields),
      failed_action: failedAction || '',
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_submission_error:', error);
  }
}

export function trackThankYouViewed(
  form: FormConfig,
  submissionId: number,
  locale: string,
  sessionId?: string,
  submissionTime?: number
) {
  try {
    safeTrack('form_thank_you_viewed', {
      form_id: form.formId,
      form_version: form.version,
      submission_id: submissionId,
      locale,
      submission_time: submissionTime || 0,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_thank_you_viewed:', error);
  }
}

export function trackFormAbandoned(
  form: FormConfig,
  locale: string,
  answers: Record<string, any>,
  sessionId?: string,
  timeOnForm?: number,
  lastFieldInteracted?: string,
  lastFieldType?: string,
  hasErrors?: boolean,
  errorCount?: number
) {
  try {
    safeTrack('form_abandoned', {
      form_id: form.formId,
      form_version: form.version,
      locale,
      time_on_form: timeOnForm || 0,
      fields_completed: form.fields.filter((f) => {
        const value = answers[f.name];
        return value !== undefined && value !== null && value !== '';
      }).length,
      fields_total: form.fields.length,
      completion_percentage: calculateCompletionPercentage(answers, form.fields),
      last_field_interacted: lastFieldInteracted || '',
      last_field_type: lastFieldType || '',
      has_errors: hasErrors || false,
      error_count: errorCount || 0,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_abandoned:', error);
  }
}

export function trackFileUploadStarted(
  form: FormConfig,
  field: Field,
  locale: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  fileCount: number,
  sessionId?: string
) {
  try {
    safeTrack('form_file_upload_started', {
      form_id: form.formId,
      form_version: form.version,
      field_name: field.name,
      field_type: field.type,
      locale,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      file_count: fileCount,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_file_upload_started:', error);
  }
}

export function trackFileUploadSuccess(
  form: FormConfig,
  field: Field,
  locale: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  uploadTime: number,
  sessionId?: string
) {
  try {
    safeTrack('form_file_upload_success', {
      form_id: form.formId,
      form_version: form.version,
      field_name: field.name,
      field_type: field.type,
      locale,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      upload_time: uploadTime,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_file_upload_success:', error);
  }
}

export function trackFileUploadError(
  form: FormConfig,
  field: Field,
  locale: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  errorType: string,
  errorMessage: string,
  sessionId?: string
) {
  try {
    safeTrack('form_file_upload_error', {
      form_id: form.formId,
      form_version: form.version,
      field_name: field.name,
      field_type: field.type,
      locale,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      error_type: errorType,
      error_message: errorMessage,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_file_upload_error:', error);
  }
}

export function trackLocationCaptured(
  form: FormConfig,
  field: Field,
  locale: string,
  accuracy: number,
  captureTime: number,
  hasHighAccuracy: boolean,
  sessionId?: string
) {
  try {
    safeTrack('form_location_captured', {
      form_id: form.formId,
      form_version: form.version,
      field_name: field.name,
      locale,
      accuracy,
      capture_time: captureTime,
      has_high_accuracy: hasHighAccuracy,
      // session_id is set via setSessionId(), not in event properties
    });
  } catch (error) {
    console.error('[Amplitude] Error tracking form_location_captured:', error);
  }
}

// Test utility function to test all Amplitude events
// Can be called from browser console: window.testAmplitudeEvents()
export async function testAllAmplitudeEvents() {
  // Get form config from window (set by FormView)
  const formConfig = (window as any).__formConfig as FormConfig | undefined;
  if (!formConfig) {
    console.error('❌ Form config not found. Please ensure the form is loaded.');
    return;
  }

  const locale = (window as any).__locale || 'en';
  const sessionId = (window as any).__sessionId || 'test-session-' + Date.now();
  
  // Ensure Amplitude is initialized
  if (!amplitudeModule) {
    await initAmplitude(sessionId);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for init
  }

  if (!amplitudeModule) {
    console.error('❌ Amplitude failed to initialize');
    return;
  }

  const testResults: Array<{ event: string; status: 'success' | 'error'; error?: any }> = [];

  // Helper to test an event
  const testEvent = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      testResults.push({ event: name, status: 'success' });
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between events
    } catch (error) {
      console.error(`❌ ${name} - ERROR:`, error);
      testResults.push({ event: name, status: 'error', error });
    }
  };

  // Get first field for testing
  const firstField = formConfig.fields[0];
  if (!firstField) {
    console.error('❌ No fields found in form');
    return;
  }

  // Mock answers
  const mockAnswers: Record<string, any> = {};
  formConfig.fields.forEach((field, index) => {
    switch (field.type) {
      case 'text':
      case 'textarea':
        mockAnswers[field.name] = `Test value ${index}`;
        break;
      case 'number':
        mockAnswers[field.name] = 42;
        break;
      case 'email':
        mockAnswers[field.name] = 'test@example.com';
        break;
      case 'checkbox':
      case 'switch':
        mockAnswers[field.name] = true;
        break;
      case 'select':
      case 'radio':
        const options = (field as any).props?.options || [];
        if (options.length > 0) {
          mockAnswers[field.name] = { value: options[0].value };
        }
        break;
      case 'multiselect':
        const multiOptions = (field as any).props?.options || [];
        if (multiOptions.length > 0) {
          mockAnswers[field.name] = [{ value: multiOptions[0].value }];
        }
        break;
    }
  });

  // Test all events
  await testEvent('form_viewed', () => {
    trackFormViewed(formConfig, locale, sessionId);
  });

  await testEvent('form_field_focused', () => {
    trackFieldFocused(formConfig, firstField, locale, sessionId, 1000, mockAnswers[firstField.name]);
  });

  // form_field_changed removed - not tracking field changes

  await testEvent('form_field_blurred', () => {
    trackFieldBlurred(formConfig, firstField, locale, mockAnswers[firstField.name], sessionId, 2000, false);
  });

  await testEvent('form_validation_error', () => {
    trackValidationError(formConfig, firstField, locale, 'REQUIRED', 'This field is required', sessionId, 1, 3000);
  });

  await testEvent('form_submission_started', () => {
    trackSubmissionStarted(formConfig, locale, mockAnswers, sessionId, 5000);
  });

  await testEvent('form_submission_success', () => {
    trackSubmissionSuccess(formConfig, locale, mockAnswers, 12345, sessionId, 6000, ['action1', 'action2'], []);
  });

  await testEvent('form_submission_error', () => {
    trackSubmissionError(formConfig, locale, mockAnswers, 'NETWORK_ERROR', 'Failed to submit', sessionId, 7000, 1, 'action1');
  });

  await testEvent('form_thank_you_viewed', () => {
    trackThankYouViewed(formConfig, 12345, locale, sessionId, 8000);
  });

  await testEvent('form_abandoned', () => {
    trackFormAbandoned(formConfig, locale, mockAnswers, sessionId, 9000, firstField.name, firstField.type, false, 0);
  });

  // Test file upload events if there's a file_upload field
  const fileUploadField = formConfig.fields.find(f => f.type === 'file_upload');
  if (fileUploadField) {
    await testEvent('form_file_upload_started', () => {
      trackFileUploadStarted(formConfig, fileUploadField, locale, 'test.pdf', 1024, 'application/pdf', 1, sessionId);
    });

    await testEvent('form_file_upload_success', () => {
      trackFileUploadSuccess(formConfig, fileUploadField, locale, 'test.pdf', 1024, 'application/pdf', 2000, sessionId);
    });

    await testEvent('form_file_upload_error', () => {
      trackFileUploadError(formConfig, fileUploadField, locale, 'test.pdf', 1024, 'application/pdf', 'SIZE_ERROR', 'File too large', sessionId);
    });
  }

  // Test location event if there's a location field
  const locationField = formConfig.fields.find(f => f.type === 'location');
  if (locationField) {
    await testEvent('form_location_captured', () => {
      trackLocationCaptured(formConfig, locationField, locale, 10.5, 3000, true, sessionId);
    });
  }

  return testResults;
}

// Helper function to trigger a single test event
export async function testSingleEvent(eventName: string = 'form_viewed') {
  const formConfig = (window as any).__formConfig as FormConfig | undefined;
  if (!formConfig) {
    console.error('❌ Form config not found. Please ensure the form is loaded.');
    return;
  }

  const locale = (window as any).__locale || 'en';
  const sessionId = (window as any).__sessionId || 'test-session-' + Date.now();
  
  // Ensure Amplitude is initialized
  if (!amplitudeModule) {
    await initAmplitude(sessionId);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!amplitudeModule) {
    console.error('❌ Amplitude failed to initialize');
    return;
  }

  const firstField = formConfig.fields[0];
  const mockAnswers: Record<string, any> = {};
  formConfig.fields.forEach((field, index) => {
    switch (field.type) {
      case 'text':
      case 'textarea':
        mockAnswers[field.name] = `Test value ${index}`;
        break;
      case 'number':
        mockAnswers[field.name] = 42;
        break;
      case 'email':
        mockAnswers[field.name] = 'test@example.com';
        break;
      case 'checkbox':
      case 'switch':
        mockAnswers[field.name] = true;
        break;
    }
  });

  try {
    switch (eventName) {
      case 'form_viewed':
        trackFormViewed(formConfig, locale, sessionId);
        break;
      case 'form_field_focused':
        if (firstField) trackFieldFocused(formConfig, firstField, locale, sessionId, 1000, mockAnswers[firstField.name]);
        break;
      // form_field_changed removed - not tracking field changes
      case 'form_field_blurred':
        if (firstField) trackFieldBlurred(formConfig, firstField, locale, mockAnswers[firstField.name], sessionId, 2000, false);
        break;
      case 'form_validation_error':
        if (firstField) trackValidationError(formConfig, firstField, locale, 'REQUIRED', 'This field is required', sessionId, 1, 3000);
        break;
      case 'form_submission_started':
        trackSubmissionStarted(formConfig, locale, mockAnswers, sessionId, 5000);
        break;
      case 'form_submission_success':
        trackSubmissionSuccess(formConfig, locale, mockAnswers, 12345, sessionId, 6000, ['action1'], []);
        break;
      case 'form_submission_error':
        trackSubmissionError(formConfig, locale, mockAnswers, 'NETWORK_ERROR', 'Failed to submit', sessionId, 7000, 1, 'action1');
        break;
      case 'form_thank_you_viewed':
        trackThankYouViewed(formConfig, 12345, locale, sessionId, 8000);
        break;
      case 'form_abandoned':
        trackFormAbandoned(formConfig, locale, mockAnswers, sessionId, 9000, firstField?.name, firstField?.type, false, 0);
        break;
      default:
        console.error(`❌ Unknown event: ${eventName}`);
        return;
    }
  } catch (error) {
    console.error(`❌ Error triggering ${eventName}:`, error);
  }
}

// Expose test functions globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).testAmplitudeEvents = testAllAmplitudeEvents;
  (window as any).testAmplitudeEvent = testSingleEvent;
}

