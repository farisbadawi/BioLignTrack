import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { setAccessToken, setTokenExpiresAt, registerTokenRefresh } from '@/lib/api';
import { disconnectSocket, updateSocketAuth } from '@/lib/socket';
import { useChatStore } from '@/stores/chat-store';

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

  // Keep a ref for the refresh token so the registered callback always
  // reads the latest value without needing to re-register.
  const refreshTokenRef = useRef<string | null>(null);
  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

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

  // ── Helpers ──────────────────────────────────────────

  const storeTokens = async (access: string, refresh: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify({
      accessToken: access,
      refreshToken: refresh,
    }));
  };

  const applyTokens = (access: string, expiresIn: number, refresh?: string) => {
    setLocalAccessToken(access);
    setAccessToken(access);
    setTokenExpiresAt(Date.now() + expiresIn * 1000);
    if (refresh) setRefreshToken(refresh);
    // Keep socket auth in sync
    updateSocketAuth();
  };

  const clearTokens = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Ignore errors
    }
    setLocalAccessToken(null);
    setAccessToken(null);
    setTokenExpiresAt(0);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // ── Register token refresh callback (once) ──────────
  // api.ts will call this when it receives a 401 so the token is
  // transparently refreshed and the request retried.
  useEffect(() => {
    registerTokenRefresh(async () => {
      const currentRefreshToken = refreshTokenRef.current;
      if (!currentRefreshToken) return null;

      try {
        const newTokens = await refreshAccessToken(currentRefreshToken);
        if (newTokens.accessToken) {
          const newRefresh = newTokens.refreshToken || currentRefreshToken;
          applyTokens(newTokens.accessToken, newTokens.expiresIn, newRefresh);
          await storeTokens(newTokens.accessToken, newRefresh);
          return newTokens.accessToken;
        }
      } catch (error) {
        if (__DEV__) console.error('Token refresh (via 401) error:', error);
        await clearTokens();
      }
      return null;
    });
  }, []); // register once; uses ref so always has latest refreshToken

  // ── Handle auth response ────────────────────────────

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success' && response.params.code && request?.codeVerifier) {
        try {
          setIsLoading(true);

          const tokens = await exchangeCodeForTokens(
            response.params.code,
            request.codeVerifier,
            redirectUri
          );

          if (tokens.accessToken) {
            const refresh = tokens.refreshToken || '';
            applyTokens(tokens.accessToken, tokens.expiresIn, refresh);

            const userInfo = await getUserInfo(tokens.accessToken);
            setUser({
              sub: userInfo.sub,
              email: userInfo.email || '',
              name: userInfo.name,
              picture: userInfo.picture,
            });
            setIsAuthenticated(true);
            await storeTokens(tokens.accessToken, refresh);
          }
        } catch (error) {
          if (__DEV__) console.error('Token exchange error:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === 'error') {
        if (__DEV__) console.error('Auth error:', response.error);
        setIsLoading(false);
      }
    };

    handleResponse();
  }, [response]);

  // ── Load stored tokens on app start ─────────────────

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
            const newTokens = await refreshAccessToken(tokens.refreshToken);

            if (newTokens.accessToken) {
              const newRefresh = newTokens.refreshToken || tokens.refreshToken;
              applyTokens(newTokens.accessToken, newTokens.expiresIn, newRefresh);

              const userInfo = await getUserInfo(newTokens.accessToken);
              setUser({
                sub: userInfo.sub,
                email: userInfo.email || '',
                name: userInfo.name,
                picture: userInfo.picture,
              });
              setIsAuthenticated(true);
              await storeTokens(newTokens.accessToken, newRefresh);
            }
          } catch {
            if (__DEV__) console.log('Token refresh failed, clearing tokens');
            await clearTokens();
          }
        }
      }
    } catch {
      if (__DEV__) console.log('No valid stored tokens, user needs to log in');
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  // ── Login ───────────────────────────────────────────

  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      await promptAsync();
    } catch (error) {
      if (__DEV__) console.error('Login error:', error);
      setIsLoading(false);
      throw error;
    }
  }, [promptAsync]);

  // ── Logout ──────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      // Disconnect real-time and clear chat state
      disconnectSocket();
      useChatStore.getState().reset();

      // Revoke refresh token (best-effort)
      const currentRefresh = refreshTokenRef.current;
      if (currentRefresh) {
        try {
          await fetch(discovery.revocationEndpoint!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: AUTH0_CLIENT_ID,
              token: currentRefresh,
              token_type_hint: 'refresh_token',
            }).toString(),
          });
        } catch {
          // Best-effort — don't block logout
        }
      }

      // Clear local state
      await clearTokens();

      // Open Auth0 logout URL
      const logoutUrl = getLogoutUrl(redirectUri);
      await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
    } catch (error) {
      if (__DEV__) console.error('Logout error:', error);
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, [redirectUri]);

  // ── getAccessToken (for manual use) ─────────────────

  const getAccessTokenAsync = useCallback(async () => {
    if (localAccessToken) {
      return localAccessToken;
    }

    if (refreshToken) {
      try {
        const newTokens = await refreshAccessToken(refreshToken);

        if (newTokens.accessToken) {
          const newRefresh = newTokens.refreshToken || refreshToken;
          applyTokens(newTokens.accessToken, newTokens.expiresIn, newRefresh);
          return newTokens.accessToken;
        }
      } catch (error) {
        if (__DEV__) console.error('Token refresh error:', error);
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
