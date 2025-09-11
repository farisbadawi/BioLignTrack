// app/_layout.tsx - COMPLETE REPLACEMENT
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";
import { usePatientStore } from "@/stores/patient-store";
import { Colors } from "@/constants/colors";
import AuthScreen from "./auth";
import RoleSelectionScreen from "./role-selection";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Loading component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ marginTop: 16, fontSize: 16, color: Colors.textSecondary }}>
        Loading...
      </Text>
    </View>
  );
}

function RootLayoutNav() {
  const [isReady, setIsReady] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const { initialize, profile, loading } = usePatientStore();

  useEffect(() => {
    const setup = async () => {
      try {
        await initialize();
        
        // Check if this is first time user (no profile found)
        // Show role selection if no user is logged in
        if (!profile) {
          setShowRoleSelection(true);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setShowRoleSelection(true);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    };
    
    setup();
  }, [initialize]);

  // Show loading screen while initializing
  if (!isReady || loading) {
    return <LoadingScreen />;
  }

  // Show role selection for new users
  if (!profile && showRoleSelection) {
    return (
      <>
        <StatusBar style="dark" backgroundColor="#f8fafc" />
        <RoleSelectionScreen />
      </>
    );
  }

  // Show auth screen if user is not logged in
  if (!profile) {
    return (
      <>
        <StatusBar style="dark" backgroundColor="#f8fafc" />
        <AuthScreen />
      </>
    );
  }

  // Show main app if user is logged in
  return (
    <>
      <StatusBar style="dark" backgroundColor="#f8fafc" />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="role-selection" options={{ headerShown: false }} />
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