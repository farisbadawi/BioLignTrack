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
  const [initialRouteSet, setInitialRouteSet] = useState(false);
  const router = useRouter();
  const {
    profile,
    isAuthenticated,
    loading,
    initialize,
    clearAuth
  } = usePatientStore();
  const { isDark, colors } = useTheme();

  // Initial setup with timeout
  useEffect(() => {
    const setup = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          console.log('Found existing session, initializing...');
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initialize timeout')), 10000)
          );
          try {
            await Promise.race([initialize(), timeoutPromise]);
          } catch (timeoutError) {
            console.log('Initialize timed out, continuing anyway...');
          }
        } else {
          console.log('No existing session found');
          clearAuth();
        }
      } catch (error) {
        console.error('Setup error:', error);
        clearAuth();
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    };

    setup();
  }, []);

  // Handle initial routing
  useEffect(() => {
    if (!isReady || initialRouteSet) return;

    // Don't wait for loading indefinitely - route after isReady
    if (isAuthenticated && profile) {
      console.log('User authenticated, going to tabs');
      router.replace('/(tabs)');
    } else {
      console.log('User not authenticated, going to role selection');
      router.replace('/role-selection');
    }

    setInitialRouteSet(true);
  }, [isReady, isAuthenticated, profile, initialRouteSet, router]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, initializing...');
          await initialize();
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing auth...');
          clearAuth();
          // Navigate to role selection after sign out
          router.replace('/role-selection');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initialize, clearAuth, router]);

  if (!isReady) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
      }}>
        <Image
          source={require('@/assets/images/biolign-logo-app.png')}
          style={{ width: 280, height: 220, marginBottom: 32 }}
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