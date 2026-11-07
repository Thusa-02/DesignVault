import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../hooks/useProjects';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateUserName } = useProjects();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleGetStarted = async () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Please enter your name to continue');
      return;
    }

    if (trimmed.length > 35) {
      setError('Name must be 35 characters or less');
      return;
    }

    setError('');

    try {
      setSaving(true);
      await updateUserName(trimmed);
      // Navigate to Home Dashboard
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[DesignVault] Failed to save display name:', err);
      Alert.alert(
        'Setup Error',
        'Unable to save your name. Please try again.'
      );
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + SPACING.xl,
            paddingBottom: insets.bottom + SPACING.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Icon Header */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons
              name="palette-swatch"
              size={54}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.brandTitle}>DesignVault</Text>
          <Text style={styles.brandTagline}>Creative Project Portfolio</Text>
        </View>

        {/* Welcome Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Welcome!</Text>
          <Text style={styles.cardSubheading}>
            Organize, curate, and showcase your graphic design portfolio in one elegant place.
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>What should we call you?</Text>
            <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
              <MaterialCommunityIcons
                name="account-outline"
                size={22}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError('');
                }}
                placeholder="Enter your name or creative alias"
                placeholderTextColor={COLORS.textMuted}
                maxLength={35}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleGetStarted}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.startButton, saving && styles.startButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleGetStarted}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.startButtonText}>Get Started</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={COLORS.white}
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Your portfolio and profile remain private and securely stored on your device.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.cardHover,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.4,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 420,
    ...SHADOWS.card,
    marginBottom: SPACING.lg,
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  cardSubheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  inputWrapperError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    gap: 8,
    ...SHADOWS.card,
  },
  startButtonDisabled: {
    opacity: 0.65,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
});
