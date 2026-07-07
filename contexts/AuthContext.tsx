import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useMutation } from '@tanstack/react-query';
import { User } from '@/types';
import { apiRequest } from '@/services/api';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshMe = useCallback(
    async (fallbackEmail?: string) => {
      const meRes = await apiRequest<{
        item: {
          id: string;
          name: string;
          email: string;
          username?: string;
          role: string;
          status: string;
          phone?: string;
          department?: string;
          company?: string;
          hireDate?: string;
          employeeRole?: string;
        };
      }>('/auth/me');

      const me = meRes.data?.item;
      if (!me?.id) {
        throw new Error('Failed to load user profile');
      }
      
      const apiRole = String(me.role || '').toLowerCase();
      const mappedUser: User = {
        id: me.id,
        email: me.email || fallbackEmail || '',
        username: me.username || '',
        fullName: me.name || '',
        phone: me.phone || '',
        jobTitle: String(me.role || '').toLowerCase() === 'manager' ? 'Manager' : me.employeeRole || '',
        department: me.department || '',
        company: me.company || '',
        hireDate: me.hireDate || '',
      
       /* role:
  String(me.role || '').toLowerCase() === 'manager'
    ? 'manager'
    : 'employee',*/
    role:
  apiRole === 'super-admin' 
    ? 'super-admin' 
    : apiRole === 'admin' 
    ? 'admin' 
    : apiRole === 'manager' 
    ? 'manager' 
    : 'employee',
      };

      setUser(mappedUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(mappedUser));
      return mappedUser;
    },
    [setUser],
  );

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        console.log('[Auth] Loading stored authentication...');
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);

        if (storedToken && storedUser) {
          console.log('[Auth] Found stored session');
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          try {
            await refreshMe();
          } catch (error) {
            console.log('[Auth] Failed to refresh profile:', error);
          }
        } else {
          console.log('[Auth] No stored session found');
        }
      } catch (error) {
        console.log('[Auth] Error loading stored auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const loginMutation = useMutation({
   mutationFn: async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  console.log('[Auth] Attempting login for:', email);

  const loginRes = await apiRequest<{
    item: {
      token: string;
      role: string;
      username: string;
      name?: string;
    };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: email,
      email: email,
      password,
    }),
  });

  console.log('[Auth] Login API response:', loginRes);

  const loginItem = loginRes.data?.item;

  if (!loginItem?.token) {
    throw new Error('Login failed');
  }

  await AsyncStorage.setItem(AUTH_TOKEN_KEY, loginItem.token);

  const mappedUser = await refreshMe(email);

  // Add username from login response if not set
  if (loginItem.username && !mappedUser.username) {
    mappedUser.username = loginItem.username;
  }

  if (loginItem.name && !mappedUser.fullName) {
    mappedUser.fullName = loginItem.name;
  }

  console.log('[Auth] Login successful via API');

  return {
    user: mappedUser,
    token: loginItem.token,
  };
},
    onSuccess: async (data) => {
      setUser(data.user);
      setToken(data.token);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      console.log('[Auth] Session stored successfully');
    },
  });

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out...');
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  }, []);

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error?.message ?? null,
    isLoggingIn: loginMutation.isPending,
    logout,
  };
});
