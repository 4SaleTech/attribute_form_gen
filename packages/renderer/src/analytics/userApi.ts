// User API service to fetch user information from user_token

const USER_API_URL = 'https://services.q84sale.com/api/v1/users/auth/user';

// Generate or retrieve device ID from localStorage
function getDeviceId(): string {
  const STORAGE_KEY = 'form_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate a UUID-like device ID
    deviceId = `web_user_${crypto.randomUUID?.() || generateUUID()}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
}

// Fallback UUID generator if crypto.randomUUID is not available
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface UserData {
  user_id: number;
  parent_user_id: number | null;
  email: string;
  first_name: string;
  phone: string;
  language: string;
  region_id: number;
  user_type: {
    user_type_name: string;
    user_type_id: number;
    allow_post_listing: boolean;
  };
  is_email_verified: number;
  member_since: string;
  [key: string]: any;
}

export interface UserApiResponse {
  data: {
    user: UserData;
  };
  message: string | null;
}

/**
 * Fetch user information using user_token
 * @param userToken - The user token from URL query parameter
 * @returns User data or null if fetch fails
 */
export async function fetchUserData(userToken: string): Promise<UserData | null> {
  try {
    const deviceId = getDeviceId();
    
    const response = await fetch(USER_API_URL, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        'application-source': 'q84sale',
        'authorization': `Bearer ${userToken}`,
        'content-type': 'application/json',
        'device-id': deviceId,
        'origin': 'https://www.q84sale.com',
        'referer': 'https://www.q84sale.com/',
        'x-custom-authorization': 'com.forsale.forsale.web 1748956341 1b109a5f85723be5b1a442899fca9595ffe93a10',
      },
    });

    if (!response.ok) {
      // Handle different error statuses
      if (response.status === 401 || response.status === 403) {
        console.warn('[User API] Unauthorized - invalid or expired token');
      } else {
        console.error(`[User API] Error: ${response.status} ${response.statusText}`);
      }
      return null;
    }

    const data: UserApiResponse = await response.json();
    
    if (data?.data?.user) {
      return data.data.user;
    }

    return null;
  } catch (error) {
    // Handle network errors, timeouts, etc.
    console.error('[User API] Fetch error:', error);
    return null;
  }
}



