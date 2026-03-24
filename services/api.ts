import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://192.168.18.56:5000/api';

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
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

  const url = `${API_BASE_URL}${endpoint}`;
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
      console.log(`[API] Error ${response.status}: ${errorBody}`);
      throw new Error(`Request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[API] Response:`, data);
    return { data, success: true };
  } catch (error) {
    console.log(`[API] Request failed:`, error);
    throw error;
  }
}

export default apiRequest;
