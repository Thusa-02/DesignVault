import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../hooks/useProjects';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { userName, updateUserName, stats } = useProjects();

  const [displayName, setDisplayName] = useState(userName || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userName) {
      setDisplayName(userName);
    }
  }, [userName]);

  const handleSaveName = async () => {
    const trimmed = displayName.trim();

    if (!trimmed) {
      setError('Display name cannot be empty');
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
      Alert.alert('Saved', 'Your display name has been updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      console.error('[DesignVault] Error updating user name:', err);
      Alert.alert('Save Error', 'Failed to update display name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initial = (displayName.trim() || 'D').charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.profileName}>{displayName.trim() || 'Designer'}</Text>
          <Text style={styles.profileSubtitle}>Creative Portfolio Creator</Text>
        </View>

        {/* Edit Display Name Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Display Name</Text>
          <Text style={styles.sectionSubtitle}>
            This name appears in your personalized dashboard greetings.
          </Text>

          <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
            <MaterialCommunityIcons
              name="account-edit-outline"
              size={22}
              color={COLORS.primary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (error) setError('');
              }}
              placeholder="Your display name"
              placeholderTextColor={COLORS.textMuted}
              maxLength={35}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleSaveName}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={18} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Save Display Name</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Portfolio Stats Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Portfolio Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Designs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.danger }]}>{stats.favorites}</Text>
              <Text style={styles.statLabel}>Favourites</Text>
            </View>
          </View>
        </View>

        {/* About Card */}
        <View style={styles.sectionCard}>
          <View style={styles.aboutRow}>
            <View style={styles.aboutIcon}>
              <MaterialCommunityIcons name="palette-swatch" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutTitle}>DesignVault</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            </View>
          </View>
          <Text style={styles.aboutDescription}>
            A dedicated mobile portfolio manager for creative graphic designers, students, and visual artists.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.cardHover,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  profileSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 50,
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
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    gap: 6,
    marginTop: SPACING.md,
    ...SHADOWS.card,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.borderLight,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  aboutIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  aboutVersion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  aboutDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 6,
  },
});
