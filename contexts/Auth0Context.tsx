import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import {
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_AUDIENCE,
  discovery,
  getRedirectUri,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserInfo,
  getLogoutUrl,
} from '@/lib/auth0';
import { setAccessToken } from '@/lib/api';

// Ensure web browser redirect completes
WebBrowser.maybeCompleteAuthSession();

interface Auth0User {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface Auth0ContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: Auth0User | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

const TOKEN_KEY = 'auth0_tokens';

export function Auth0Provider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<Auth0User | null>(null);
  const [localAccessToken, setLocalAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const redirectUri = getRedirectUri();

  // Create the auth request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: AUTH0_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      extraParams: {
        audience: AUTH0_AUDIENCE,
      },
      usePKCE: true,
    },
    discovery
  );

  // Handle auth response
  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success' && response.params.code && request?.codeVerifier) {
        try {
          setIsLoading(true);

          // Exchange code for tokens
          const tokens = await exchangeCodeForTokens(
            response.params.code,
            request.codeVerifier,
            redirectUri
          );

          if (tokens.accessToken) {
            setLocalAccessToken(tokens.accessToken);
            setAccessToken(tokens.accessToken);
            setRefreshToken(tokens.refreshToken || null);

            // Get user info
            const userInfo = await getUserInfo(tokens.accessToken);
            setUser({
              sub: userInfo.sub,
              email: userInfo.email || '',
              name: userInfo.name,
              picture: userInfo.picture,
            });
            setIsAuthenticated(true);

            // Store tokens
            await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            }));
          }
        } catch (error) {
          console.error('Token exchange error:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === 'error') {
        console.error('Auth error:', response.error);
        setIsLoading(false);
      }
    };

    handleResponse();
  }, [response]);

  // Load stored tokens on app start
  useEffect(() => {
    loadStoredTokens();
  }, []);

  const loadStoredTokens = async () => {
    try {
      const storedTokens = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        if (tokens.accessToken && tokens.refreshToken) {
          try {
            // Try to refresh the token
            const newTokens = await refreshAccessToken(tokens.refreshToken);

            if (newTokens.accessToken) {
              setLocalAccessToken(newTokens.accessToken);
              setAccessToken(newTokens.accessToken);
              setRefreshToken(newTokens.refreshToken || tokens.refreshToken);

              // Get user info
              const userInfo = await getUserInfo(newTokens.accessToken);
              setUser({
                sub: userInfo.sub,
                email: userInfo.email || '',
                name: userInfo.name,
                picture: userInfo.picture,
              });
              setIsAuthenticated(true);

              // Store new tokens
              await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify({
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken || tokens.refreshToken,
              }));
            }
          } catch (refreshError) {
            console.log('Token refresh failed, clearing tokens');
            await clearTokens();
          }
        }
      }
    } catch (error) {
      console.log('No valid stored tokens, user needs to log in');
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const clearTokens = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      // Ignore errors
    }
    setLocalAccessToken(null);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      await promptAsync();
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      throw error;
    }
  }, [promptAsync]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      // Clear local state first
      await clearTokens();

      // Open Auth0 logout URL
      const logoutUrl = getLogoutUrl(redirectUri);
      await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state anyway
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, [redirectUri]);

  const getAccessTokenAsync = useCallback(async () => {
    if (localAccessToken) {
      return localAccessToken;
    }

    if (refreshToken) {
      try {
        const newTokens = await refreshAccessToken(refreshToken);

        if (newTokens.accessToken) {
          setLocalAccessToken(newTokens.accessToken);
          setAccessToken(newTokens.accessToken);
          return newTokens.accessToken;
        }
      } catch (error) {
        console.error('Token refresh error:', error);
        await clearTokens();
      }
    }

    return null;
  }, [localAccessToken, refreshToken]);

  return (
    <Auth0Context.Provider
      value={{
        isLoading,
        isAuthenticated,
        user,
        accessToken: localAccessToken,
        login,
        logout,
        getAccessToken: getAccessTokenAsync,
      }}
    >
      {children}
    </Auth0Context.Provider>
  );
}

export function useAuth0() {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth0 must be used within an Auth0Provider');
  }
  return context;
}
