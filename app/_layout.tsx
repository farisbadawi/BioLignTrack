// app/_layout.tsx - FINAL WORKING VERSION
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, Image } from "react-native";
import { usePatientStore } from "@/stores/patient-store";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const [isReady, setIsReady] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const router = useRouter();
  const {
    profile,
    isAuthenticated,
    initialize,
    clearAuth
  } = usePatientStore();
  const { isDark, colors } = useTheme();

  // Single auth listener that handles everything
  useEffect(() => {
    let isInitialEvent = true;

    // Hard timeout - app loads after 5 seconds no matter what
    const hardTimeout = setTimeout(() => {
      console.log('Hard timeout - forcing app to load');
      if (!isReady) {
        setIsReady(true);
        setInitialCheckDone(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore token refresh events - they're normal and noisy
        if (event === 'TOKEN_REFRESHED') return;

        console.log('Auth event:', event, session ? 'has session' : 'no session');

        if (event === 'INITIAL_SESSION') {
          // This fires once on app load with the current session state
          if (session?.user) {
            console.log('Initial session found, initializing...');
            try {
              await Promise.race([
                initialize(),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 4000))
              ]);
            } catch {
              console.log('Initialize timed out, continuing anyway...');
            }
          } else {
            console.log('No initial session');
            clearAuth();
          }

          clearTimeout(hardTimeout);
          setInitialCheckDone(true);
          setIsReady(true);
          SplashScreen.hideAsync().catch(() => {});
          isInitialEvent = false;
        } else if (event === 'SIGNED_IN' && !isInitialEvent) {
          console.log('User signed in');
          await initialize();
          router.replace('/(tabs)');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          clearAuth();
          router.replace('/role-selection');
        }
      }
    );

    return () => {
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  }, []);

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
  }, [initialCheckDone]);

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
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}