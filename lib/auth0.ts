import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Enable web browser redirect
WebBrowser.maybeCompleteAuthSession();

// Auth0 Configuration
export const AUTH0_DOMAIN = 'dev-hsnmuebcrbimzso0.us.auth0.com';
export const AUTH0_CLIENT_ID = 'mEdMDEFzLWwNtDudqIr99AKa28Uob4jS';
export const AUTH0_AUDIENCE = 'https://aligner4d-api';

// API Configuration
export const API_BASE_URL = 'https://aligner4d-backend.azurewebsites.net';
// For local development, use:
// export const API_BASE_URL = 'http://localhost:3000';

// Discovery document for Auth0
export const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
  revocationEndpoint: `https://${AUTH0_DOMAIN}/oauth/revoke`,
  userInfoEndpoint: `https://${AUTH0_DOMAIN}/userinfo`,
};

// Get redirect URI for Expo
export const getRedirectUri = () => {
  const uri = AuthSession.makeRedirectUri({
    scheme: 'com.bioligntrack',
    // For Expo Go, this uses the proxy; for standalone, uses native scheme
  });
  if (__DEV__) console.log('Redirect URI:', uri);
  return uri;
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
}> => {
  const response = await fetch(discovery.tokenEndpoint!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: AUTH0_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
  };
};

// Refresh access token
export const refreshAccessToken = async (
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> => {
  const response = await fetch(discovery.tokenEndpoint!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: AUTH0_CLIENT_ID,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh token');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
};

// Get user info from token
export const getUserInfo = async (accessToken: string): Promise<{
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}> => {
  const response = await fetch(discovery.userInfoEndpoint!, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
};

// Logout URL
export const getLogoutUrl = (returnTo: string): string => {
  const params = new URLSearchParams({
    client_id: AUTH0_CLIENT_ID,
    returnTo,
  });
  return `https://${AUTH0_DOMAIN}/v2/logout?${params.toString()}`;
};
