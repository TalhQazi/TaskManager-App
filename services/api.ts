import AsyncStorage from '@react-native-async-storage/async-storage';

  //export const API_BASE_URL = 'http://192.168.31.131:5002/api';


export const API_BASE_URL = 'https://task.se7eninc.com/api';
export const API_BASE_URL_IMAGE = 'https://task.se7eninc.com';




//export const API_BASE_URL = 'http://192.168.31.130:5002/api';
//export const API_BASE_URL_IMAGE = 'http://192.168.31.130:5002';


//export const API_BASE_URL = 'http://192.168.0.100:5002/api';
 
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

async function getAuthToken(): Promise<string | null> {
  try {
    const keys = ['auth_token', 'token', 'jwt', 'user_token'];
    for (const key of keys) {
      const val = await AsyncStorage.getItem(key);
      if (val && typeof val === 'string' && val.trim().length > 0) {
        return val.trim();
      }
    }
    const empAuth = await AsyncStorage.getItem('employee_auth');
    if (empAuth) {
      try {
        const parsed = JSON.parse(empAuth);
        if (parsed?.token && typeof parsed.token === 'string') {
          return parsed.token.trim();
        }
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api/, '');
  } else if (cleanEndpoint.startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^api\/?/, '');
  }
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = '/' + cleanEndpoint;
  }

  const url = `${API_BASE_URL}${cleanEndpoint}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      console.log('[API] Unauthorized - clearing token');
      await AsyncStorage.removeItem('auth_token');
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorBody = await response.text();
     // console.log(`[API] Error ${response.status}: ${errorBody}`);
      throw new Error(`Request failed: ${response.statusText}`);
    }

    const data = await response.json();
   // console.log(`[API] Response:`, data);
    return { data, success: true };
  } catch (error) {
    console.log(`[API] Request failed:`, error);
    throw error;
  }
}

export default apiRequest;
