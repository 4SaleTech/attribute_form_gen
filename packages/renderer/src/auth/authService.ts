export type AuthConfig = {
  baseUrl: string;
  listingsApiBaseUrl?: string;
  deviceId: string;
  appSignature: string;
  versionNumber: string;
};

export type LoginCredentials = {
  phone: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  accessToken?: string;
  error?: string;
  user?: {
    id: number;
    phone: string;
    name?: string;
  };
};

export type ValidateResponse = {
  valid: boolean;
  error?: string;
  user?: {
    id: number;
    phone: string;
  };
};

export type MyListing = {
  adv_id: string;
  title: string;
  description?: string;
  slug?: string;
  category_id?: string;
  category_name?: string;
  category_hierarchy?: string[];
  price?: number;
  status?: string;
  thumbnail?: string;
};

export type MyListingsResponse = {
  success: boolean;
  listings: MyListing[];
  error?: string;
  user?: {
    id: number;
    name: string;
    phone: string;
  };
};

const TOKEN_STORAGE_KEY = 'q84sale_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    console.warn('[AuthService] Failed to store token');
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    console.warn('[AuthService] Failed to clear token');
  }
}

export async function validateToken(token: string, config: AuthConfig): Promise<ValidateResponse> {
  try {
    const response = await fetch(`${config.baseUrl}/users/auth/validate`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { valid: false, error: `Validation failed: ${response.status}` };
    }

    const data = await response.json();
    return {
      valid: true,
      user: data.user || data.data?.user,
    };
  } catch (error: any) {
    console.error('[AuthService] Token validation error:', error);
    return { valid: false, error: error.message || 'Validation failed' };
  }
}

export async function login(credentials: LoginCredentials, config: AuthConfig): Promise<LoginResponse> {
  try {
    const response = await fetch(`${config.baseUrl}/users/auth/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Version-Number': config.versionNumber || '26.0.0',
        'Device-Id': config.deviceId,
        'Accept-Language': 'en',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: credentials.phone,
        password: credentials.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Login failed: ${response.status}`,
      };
    }

    const accessToken = data.data?.token?.access_token || data.access_token || data.token || data.data?.access_token;
    
    if (!accessToken) {
      console.error('[AuthService] Token extraction failed, response:', JSON.stringify(data));
      return { success: false, error: 'No access token in response' };
    }
    
    console.log('[AuthService] Extracted token:', accessToken.substring(0, 20) + '...');

    setStoredToken(accessToken);

    return {
      success: true,
      accessToken,
      user: data.user || data.data?.user,
    };
  } catch (error: any) {
    console.error('[AuthService] Login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
}

export async function fetchMyListings(token: string, config: AuthConfig, lang: string = 'ar'): Promise<MyListingsResponse> {
  try {
    const listingsUrl = config.listingsApiBaseUrl || `${config.baseUrl}/listings/my-listings`;
    const urlWithParams = `${listingsUrl}?page=1&per_page=30`;
    console.log('[AuthService] Fetching listings from:', urlWithParams);
    console.log('[AuthService] Using token:', token.substring(0, 20) + '...');
    
    const response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Device-Type': 'phone',
        'Accept-Language': lang,
        'Version-Number': config.versionNumber || '31.1.0',
        'Application-Source': 'q84sale',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[AuthService] Listings response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AuthService] Listings error response:', errorText);
      return { success: false, listings: [], error: `Failed to fetch listings: ${response.status}` };
    }

    const data = await response.json();
    console.log('[AuthService] Listings response data:', JSON.stringify(data).substring(0, 500));
    
    const listings: MyListing[] = [];
    
    // Handle response structure: { data: { listings: [...] } }
    const listingsArray = data.data?.listings || data.listings || data.data || [];
    
    if (Array.isArray(listingsArray)) {
      for (const item of listingsArray) {
        const categoryHierarchy = item.category?.cat_hierarchy || [];
        
        // Only include ads with "Used Cars" in category hierarchy
        const isUsedCar = categoryHierarchy.some((cat: string) => 
          cat.toLowerCase().trim().includes('used cars')
        );
        
        if (!isUsedCar) continue;
        
        listings.push({
          adv_id: String(item.id || item.adv_id),
          title: item.title || item.name || `Listing ${item.id || item.adv_id}`,
          description: item.description || item.desc || '',
          slug: item.slug || '',
          category_id: item.category?.cat_id ? String(item.category.cat_id) : undefined,
          category_name: item.category?.name,
          category_hierarchy: categoryHierarchy,
          price: item.price,
          status: item.status,
          thumbnail: item.image || item.thumbnail,
        });
      }
    }
    
    console.log('[AuthService] Parsed listings count:', listings.length);
    
    // Extract user data from the first listing item (user is the same for all listings)
    const firstListing = Array.isArray(listingsArray) && listingsArray.length > 0 ? listingsArray[0] : null;
    const userData = firstListing?.user;
    console.log('[AuthService] User data from first listing:', JSON.stringify(userData));

    return { 
      success: true, 
      listings,
      user: userData ? {
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
      } : undefined,
    };
  } catch (error: any) {
    console.error('[AuthService] Fetch listings error:', error);
    return { success: false, listings: [], error: error.message || 'Failed to fetch listings' };
  }
}

export type PurchasePayload = {
  items: Array<{
    id: string;
    category_id: string;
    district_id: string;
  }>;
  adv_id: string;
  user_lang: string;
  payment_method: string;
};

export type PurchaseResponse = {
  success: boolean;
  data?: any;
  error?: string;
  transactionId?: string;
  paymentLink?: string;
};

export type ItemVariant = {
  id: string;
  old_id: string;
  product_id: string;
  category_id: string;
  district_id: string;
  price: number;
  is_free: boolean;
  price_before_discount: number;
};

export async function fetchItemVariant(
  token: string,
  baseUrl: string,
  variantId: string
): Promise<{ success: boolean; variant?: ItemVariant; error?: string }> {
  try {
    console.log('[AuthService] Fetching item variant:', variantId);
    
    // Use backend proxy to avoid CORS issues
    const response = await fetch('/api/cashier/item-variant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: token,
        base_url: baseUrl,
        variant_id: variantId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Failed to fetch variant: ${response.status}`,
      };
    }

    console.log('[AuthService] Item variant response:', JSON.stringify(data));
    
    return {
      success: true,
      variant: data,
    };
  } catch (error: any) {
    console.error('[AuthService] Fetch item variant error:', error);
    return { success: false, error: error.message || 'Failed to fetch item variant' };
  }
}

export async function callPurchaseAPI(
  token: string,
  purchaseUrl: string,
  payload: PurchasePayload
): Promise<PurchaseResponse> {
  try {
    console.log('[AuthService] Calling purchase API via proxy');
    console.log('[AuthService] Purchase payload:', JSON.stringify(payload));
    
    // Use backend proxy to avoid CORS issues
    const proxyPayload = {
      ...payload,
      auth_token: token,
      purchase_url: purchaseUrl,
    };
    
    const response = await fetch('/api/purchase/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Purchase failed: ${response.status}`,
        data,
      };
    }

    console.log('[AuthService] Purchase API response:', JSON.stringify(data));
    
    return {
      success: true,
      data,
      transactionId: data.transaction_id || data.transactionId || data.id,
      paymentLink: data.payment_link || data.paymentLink,
    };
  } catch (error: any) {
    console.error('[AuthService] Purchase API error:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}
