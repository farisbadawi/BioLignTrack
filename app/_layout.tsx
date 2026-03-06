// app/_layout.tsx - Auth0 + PMS Backend Version
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Image } from "react-native";
import { usePatientStore } from "@/stores/patient-store";
import { useRouter } from "expo-router";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Auth0Provider, useAuth0 } from "@/contexts/Auth0Context";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const [isReady, setIsReady] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const router = useRouter();
  const { profile, isAuthenticated, initialize, clearAuth } = usePatientStore();
  const { isLoading: auth0Loading, isAuthenticated: auth0Authenticated, user: auth0User, logout: auth0Logout } = useAuth0();
  const { isDark, colors } = useTheme();

  // Initialize store when Auth0 auth state changes
  useEffect(() => {
    // Wait for Auth0 to finish loading
    if (auth0Loading) return;

    // Hard timeout - app loads after 5 seconds no matter what
    const hardTimeout = setTimeout(() => {
      console.log('Hard timeout - forcing app to load');
      if (!isReady) {
        setIsReady(true);
        setInitialCheckDone(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 5000);

    const initializeApp = async () => {
      try {
        if (auth0Authenticated && auth0User) {
          console.log('Auth0 authenticated, initializing store...');
          await Promise.race([
            initialize(),
            new Promise((_, reject) => setTimeout(() => reject('timeout'), 4000))
          ]);
        } else {
          console.log('No Auth0 session');
          clearAuth();
        }
      } catch (error) {
        console.log('Initialize error:', error);
        clearAuth();
      } finally {
        clearTimeout(hardTimeout);
        setInitialCheckDone(true);
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    };

    initializeApp();

    return () => {
      clearTimeout(hardTimeout);
    };
  }, [auth0Loading, auth0Authenticated, auth0User]);

  // Handle routing after initial check is done
  useEffect(() => {
    if (!initialCheckDone) return;

    if (isAuthenticated && profile) {
      console.log('Routing to tabs');
      router.replace('/(tabs)');
    } else {
      console.log('Routing to role selection');
      router.replace('/role-selection');
    }
  }, [initialCheckDone, isAuthenticated, profile]);

  if (!isReady) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
      }}>
        <Image
          source={require('@/assets/images/biolign-logo-transparent.png')}
          style={{ width: 240, height: 140, marginBottom: 32 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.surface} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="role-selection" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="doctor-onboarding" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="edit-practice" />
        <Stack.Screen name="book-appointment" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Auth0Provider>
          <ThemeProvider>
            <NotificationProvider>
              <RootLayoutNav />
            </NotificationProvider>
          </ThemeProvider>
        </Auth0Provider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
