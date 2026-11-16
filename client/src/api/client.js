/**
 * formER API Client
 * Centralized fetch client managing credentials, double-submit CSRF token negotiation,
 * and error normalization.
 */

let apiBaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
  '';

export const setApiBaseUrl = (url) => {
  apiBaseUrl = url;
};

export const getApiBaseUrl = () => apiBaseUrl;

let cachedCsrfToken = null;

/**
 * Fetch and cache a fresh CSRF token from the server
 */
export const fetchCsrfToken = async () => {
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to obtain CSRF token: HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.success && json.data?.csrfToken) {
      cachedCsrfToken = json.data.csrfToken;
      return cachedCsrfToken;
    }
    throw new Error('CSRF token missing in server response');
  } catch (err) {
    cachedCsrfToken = null;
    throw err;
  }
};

/**
 * Clear cached CSRF token (e.g. after logout or session reset)
 */
export const clearCsrfToken = () => {
  cachedCsrfToken = null;
};

/**
 * Enhanced fetch wrapper with automatic CSRF injection and error normalization
 */
export const apiClient = async (endpoint, options = {}, isRetry = false) => {
  const url = `${apiBaseUrl}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // If request contains body and no Content-Type set, default to JSON
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  // Inject CSRF token for state-changing requests
  if (isStateChanging) {
    if (!cachedCsrfToken) {
      await fetchCsrfToken();
    }
    headers['x-csrf-token'] = cachedCsrfToken;
  }

  const fetchOptions = {
    ...options,
    method,
    headers,
    credentials: 'include' // Always include session and CSRF cookies
  };

  const res = await fetch(url, fetchOptions);

  // If CSRF token expired or invalid (403 CSRF_INVALID), retry once with a freshly fetched token
  if (res.status === 403 && !isRetry && isStateChanging) {
    try {
      const errClone = await res.clone().json();
      if (errClone.error?.code === 'CSRF_INVALID' || errClone.error?.code === 'EBADCSRFTOKEN') {
        await fetchCsrfToken();
        return apiClient(endpoint, options, true);
      }
    } catch {
      // Continue to standard error handling
    }
  }

  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const error = new Error(
      data?.error?.message || (typeof data === 'string' ? data : `Request failed with status ${res.status}`)
    );
    error.status = res.status;
    error.code = data?.error?.code || 'API_ERROR';
    error.details = data?.error?.details || null;
    throw error;
  }

  return data;
};
