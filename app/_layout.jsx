import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProjectProvider, useProjects } from '../context/ProjectContext';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

function AppLoader() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoCircle}>
        <MaterialCommunityIcons name="palette-swatch" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.brandTitle}>DesignVault</Text>
      <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      <Text style={styles.loadingText}>Opening portfolio...</Text>
    </View>
  );
}

function RootNavigation() {
  const { userName, userNameLoading } = useProjects();
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

  if (userNameLoading) {
    return <AppLoader />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.background },
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
        name="settings"
        options={{
          title: 'Profile & Settings',
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
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProjectProvider>
        <StatusBar style="dark" backgroundColor={COLORS.background} />
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
