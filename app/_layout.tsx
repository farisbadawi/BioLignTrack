// app/_layout.tsx - FINAL WORKING VERSION
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";
import { usePatientStore } from "@/stores/patient-store";
import { Colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Loading component
function LoadingScreen() {
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: Colors.surface 
    }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ 
        marginTop: 16, 
        fontSize: 16, 
        color: Colors.textSecondary 
      }}>
        Loading...
      </Text>
    </View>
  );
}

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

  // Initial setup
  useEffect(() => {
    const setup = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Found existing session, initializing...');
          await initialize();
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
    if (!isReady || initialRouteSet || loading) return;

    if (isAuthenticated && profile) {
      console.log('User authenticated, going to tabs');
      router.replace('/(tabs)');
    } else {
      console.log('User not authenticated, going to role selection');
      router.replace('/role-selection');
    }
    
    setInitialRouteSet(true);
  }, [isReady, isAuthenticated, profile, loading, initialRouteSet, router]);

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
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initialize, clearAuth]);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#f8fafc" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="role-selection" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}