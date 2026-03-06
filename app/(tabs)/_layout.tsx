// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Home, Package, Calendar, MessageCircle, User, LineChart, Users, BarChart3, UserPlus } from "lucide-react-native";
import React from "react";
import { usePatientStore } from "@/stores/patient-store";
import { View, Text, ActivityIndicator } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

// Loading component for tab layout
function TabLoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, fontSize: 16, color: colors.textSecondary }}>
        Loading...
      </Text>
    </View>
  );
}

// Patient Tab Layout
function PatientTabLayout() {
  const { colors } = useTheme();
  const unreadMessages = 0; // TODO: Implement messaging

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28,
          height: 90,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tray"
        options={{
          title: "Tray",
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => <LineChart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* Hide doctor-only tabs for patients */}
      <Tabs.Screen
        name="patients"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="invite"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

// Doctor Tab Layout
function DoctorTabLayout() {
  const { colors } = useTheme();
  const unreadMessages = 0; // TODO: Implement messaging

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28,
          height: 90,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="invite"
        options={{
          title: "Invite",
          tabBarIcon: ({ color, size }) => <UserPlus size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* Hide patient-only tabs for doctors */}
      <Tabs.Screen
        name="tray"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

// Main Layout Component with Role Detection
export default function TabLayout() {
  const { userType, loading, profile } = usePatientStore();

  if (loading || !profile) {
    return <TabLoadingScreen />;
  }

  if (userType === 'standalone_doctor') {
    return <DoctorTabLayout />;
  }

  return <PatientTabLayout />;
}
