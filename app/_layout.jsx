import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import { ProjectProvider, useProjects } from '../context/ProjectContext';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

function AppLoader() {
  const { isDark, themeColors } = useProjects();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
      <View style={[styles.logoCircle, { backgroundColor: isDark ? themeColors.surfaceSubtle : themeColors.secondary }]}>
        <MaterialCommunityIcons name="palette-swatch" size={48} color={themeColors.primary} />
      </View>
      <Text style={[styles.brandTitle, { color: themeColors.text }]}>DesignVault</Text>
      <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 20 }} />
      <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Opening portfolio...</Text>
    </View>
  );
}

function RootNavigation() {
  const { userName, userNameLoading, isDark, themeColors } = useProjects();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (userNameLoading) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!userName && !inOnboarding) {
      router.replace('/onboarding');
    } else if (userName && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [userName, userNameLoading, segments]);

  // Synchronize Android system navigation bar with current theme
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setBackgroundColorAsync(themeColors.surface).catch(() => {});
        NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark').catch(() => {});
        NavigationBar.setBorderColorAsync(themeColors.border).catch(() => {});
      } catch (err) {
        // Graceful fallback on devices/emulators that do not support runtime styling
      }
    }
  }, [isDark, themeColors.surface, themeColors.border]);

  if (userNameLoading) {
    return <AppLoader />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={themeColors.background}
      />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: themeColors.surface },
          headerTintColor: themeColors.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: themeColors.background },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'My Profile',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="manage-categories"
          options={{
            title: 'Manage Categories',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="project/[id]"
          options={{
            title: 'Project Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="project/add"
          options={{
            title: 'Add New Project',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="project/edit/[id]"
          options={{
            title: 'Edit Project',
            headerBackTitle: 'Cancel',
          }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProjectProvider>
        <RootNavigation />
      </ProjectProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.card,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 8,
  },
});
