import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Base URL for the API
const isProduction = window.location.hostname !== 'localhost';
export const API_BASE_URL = isProduction 
  ? "" // Use relative URLs in production to avoid CORS issues
  : "http://localhost:5000";

console.log(`API base URL configured as: ${API_BASE_URL}`);

// Utility function to get the full URL for API requests with cache busting
export function getFullApiUrl(url: string): string {
  // If the URL is already absolute, return it as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // In production, use relative URLs to avoid CORS issues
  if (isProduction) {
    // Make sure the URL starts with a slash
    return url.startsWith('/') ? url : `/${url}`;
  }
  
  // In development, use the full URL with localhost
  return `${API_BASE_URL}${url}`;
}

// Check if response is OK and throw error if not
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(`${res.status}: ${errorData.message || res.statusText}`);
    } catch (e) {
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: unknown | undefined,
  retries = 1
): Promise<any> {
  try {
    // Get the full URL for the API request
    const fullUrl = getFullApiUrl(url);
    
    const headers = {
      "Content-Type": "application/json", 
      "Accept": "application/json",
      "Cache-Control": "no-cache"
    };
    
    console.log(`API Request: ${method} ${fullUrl}`, data);
    
    const fetchOptions: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    };
    
    // In production, use 'same-origin' mode to avoid CORS issues
    if (isProduction) {
      fetchOptions.mode = 'same-origin';
    }
    
    const res = await fetch(fullUrl, fetchOptions);
    
    // Check if response is HTML (which would indicate a problem)
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(`API Error: Received HTML response instead of JSON`);
    }
    
    // Check for server error responses and handle appropriately
    if (!res.ok) {
      // Try to parse error message from response
      try {
        const errorData = await res.json();
        throw new Error(errorData.message || `Server responded with status: ${res.status}`);
      } catch (parseError) {
        // If we can't parse the error response, throw a generic error
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }
    }
    
    if (res.status === 204) {
      // No content
      return null;
    }
    
    // Parse response
    const responseText = await res.text();
    
    // Handle empty responses
    if (!responseText.trim()) {
      console.warn('Empty response from server');
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error(`API Request Error: ${method} ${url}`, error);
    
    if (retries > 0 && (
      error instanceof TypeError || // Network error
      (error instanceof Error && error.message.startsWith('5')) // 5xx error
    )) {
      // Wait for a short time before retrying
      await new Promise(resolve => setTimeout(resolve, 300));
      return apiRequest(url, method, data, retries - 1);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const fullUrl = getFullApiUrl(queryKey[0] as string);
      
      const fetchOptions: RequestInit = {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        cache: 'no-store'
      };
      
      // In production, use 'same-origin' mode to avoid CORS issues
      if (isProduction) {
        fetchOptions.mode = 'same-origin';
      }
      
      const res = await fetch(fullUrl, fetchOptions);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // Clone the response before checking status and reading body
      const resClone = res.clone();
      
      await throwIfResNotOk(resClone);
      
      // Read the response as text first
      const text = await res.text();
      if (!text) {
        return null;
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error('Invalid JSON response from server');
      }
    } catch (error) {
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5000, // Cache for 5 seconds to prevent duplicate calls
      retry: 1,
      retryDelay: 1000,
      networkMode: 'always',
      gcTime: 60000, // Set garbage collection time to 1 minute
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'always'
    },
  },
});
