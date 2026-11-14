import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../context/ProjectContext';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { pickAndSaveProfileImage } from '../services/imageStorage';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    userName,
    profileImageUri,
    updateProfile,
    stats,
    themeColors,
    isDark,
  } = useProjects();

  const [nameInput, setNameInput] = useState(userName || '');
  const [avatarUri, setAvatarUri] = useState(profileImageUri);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Keep input in sync if context updates
  useEffect(() => {
    setNameInput(userName || '');
  }, [userName]);

  useEffect(() => {
    setAvatarUri(profileImageUri);
  }, [profileImageUri]);

  // Initial letter for the avatar fallback
  const initial = (nameInput.trim() || userName || 'D').charAt(0).toUpperCase();

  const handlePickAvatar = async () => {
    try {
      setErrorMessage('');
      const savedUri = await pickAndSaveProfileImage();
      if (savedUri) {
        setAvatarUri(savedUri);
        // Automatically save persistent avatar change
        await updateProfile({
          name: nameInput.trim() || userName || 'Creator',
          profileImageUri: savedUri,
        });
        showSuccess('Profile photo updated');
      }
    } catch (err) {
      console.warn('Error choosing avatar:', err);
      setErrorMessage('Could not update avatar image. Please try again.');
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo and use your initial instead?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setAvatarUri(null);
              await updateProfile({
                name: nameInput.trim() || userName || 'Creator',
                profileImageUri: null,
              });
              showSuccess('Photo removed. Using initial avatar.');
            } catch (err) {
              setErrorMessage('Failed to remove photo.');
            }
          },
        },
      ]
    );
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3500);
  };

  const handleSaveProfile = async () => {
    setErrorMessage('');
    const trimmed = nameInput.trim();

    if (!trimmed) {
      setErrorMessage('Display name cannot be empty or contain only whitespace.');
      return;
    }

    if (trimmed.length > 40) {
      setErrorMessage('Name must be 40 characters or fewer.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: trimmed,
        profileImageUri: avatarUri,
      });
      showSuccess('Profile changes saved successfully!');
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasNameChanged = nameInput.trim() !== (userName || '').trim();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SUCCESS BANNER */}
        {!!successMessage && (
          <View style={[styles.feedbackBanner, { backgroundColor: '#10B9811A', borderColor: '#10B981' }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
            <Text style={[styles.feedbackBannerText, { color: isDark ? '#34D399' : '#047857' }]}>
              {successMessage}
            </Text>
          </View>
        )}

        {/* ERROR BANNER */}
        {!!errorMessage && (
          <View style={[styles.feedbackBanner, { backgroundColor: '#EF44441A', borderColor: '#EF4444' }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#EF4444" />
            <Text style={[styles.feedbackBannerText, { color: isDark ? '#F87171' : '#B91C1C' }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* SECTION 1: HERO AVATAR CARD */}
        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarInitialWrap,
                    { backgroundColor: isDark ? themeColors.primaryDark || '#6D28D9' : themeColors.secondary || '#EDE9FE' },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarInitialText,
                      { color: isDark ? '#FFFFFF' : themeColors.primary },
                    ]}
                  >
                    {initial}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.cameraBadge, { backgroundColor: themeColors.primary, borderColor: themeColors.surface }]}
                activeOpacity={0.85}
                onPress={handlePickAvatar}
              >
                <MaterialCommunityIcons name="camera" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.heroName, { color: themeColors.text }]}>
              {nameInput.trim() || userName || 'Design Creator'}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: isDark ? '#312E81' : '#EDE9FE' }]}>
                <MaterialCommunityIcons name="shield-star" size={14} color={themeColors.primary} />
                <Text style={[styles.roleBadgeText, { color: themeColors.primary }]}>
                  DesignVault Creator
                </Text>
              </View>
            </View>

            {/* Avatar Action Buttons */}
            <View style={styles.avatarButtonsRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: themeColors.primary }]}
                activeOpacity={0.7}
                onPress={handlePickAvatar}
              >
                <MaterialCommunityIcons name="image-plus" size={16} color={themeColors.primary} />
                <Text style={[styles.outlineBtnText, { color: themeColors.primary }]}>
                  {avatarUri ? 'Change Photo' : 'Upload Photo'}
                </Text>
              </TouchableOpacity>

              {!!avatarUri && (
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: themeColors.border, marginLeft: 10 }]}
                  activeOpacity={0.7}
                  onPress={handleRemoveAvatar}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={themeColors.textSecondary} />
                  <Text style={[styles.outlineBtnText, { color: themeColors.textSecondary }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* SECTION 2: EDIT PROFILE FORM */}
        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-edit-outline" size={20} color={themeColors.primary} />
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>
              Profile Information
            </Text>
          </View>

          <Text style={[styles.cardDescription, { color: themeColors.textSecondary }]}>
            Your display name personalizes your Home Dashboard greeting and organizes your creative workspace.
          </Text>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: themeColors.text }]}>
                Display Name <Text style={{ color: COLORS.error || '#EF4444' }}>*</Text>
              </Text>
              <Text style={[styles.charCount, { color: themeColors.textSecondary }]}>
                {nameInput.length}/40
              </Text>
            </View>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: themeColors.surfaceSubtle,
                  borderColor: errorMessage ? '#EF4444' : themeColors.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={themeColors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { color: themeColors.text }]}
                value={nameInput}
                onChangeText={(text) => {
                  setNameInput(text);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter your name"
                placeholderTextColor={themeColors.textSecondary}
                maxLength={40}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSaveProfile}
              />
              {nameInput.length > 0 && (
                <TouchableOpacity
                  onPress={() => setNameInput('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={18}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primarySaveBtn,
              {
                backgroundColor: themeColors.primary,
                opacity: saving || !nameInput.trim() ? 0.6 : 1,
              },
            ]}
            activeOpacity={0.85}
            disabled={saving || !nameInput.trim()}
            onPress={handleSaveProfile}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={18} color={COLORS.white} />
                <Text style={styles.primarySaveBtnText}>Save Profile Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 3: CREATIVE PORTFOLIO SNAPSHOT */}
        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-box-outline" size={20} color={themeColors.primary} />
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>
              Portfolio Activity
            </Text>
          </View>

          <Text style={[styles.cardDescription, { color: themeColors.textSecondary }]}>
            Summary of your projects and design assets stored locally on this device.
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.border }]}>
              <MaterialCommunityIcons name="folder-multiple-outline" size={22} color={themeColors.primary} />
              <Text style={[styles.statValue, { color: themeColors.text }]}>{stats.total || 0}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Projects</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.border }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={22} color="#10B981" />
              <Text style={[styles.statValue, { color: themeColors.text }]}>{stats.completed || 0}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Completed</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.border }]}>
              <MaterialCommunityIcons name="progress-clock" size={22} color="#F59E0B" />
              <Text style={[styles.statValue, { color: themeColors.text }]}>{stats.inProgress || 0}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>In Progress</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.border }]}>
              <MaterialCommunityIcons name="image-multiple-outline" size={22} color="#8B5CF6" />
              <Text style={[styles.statValue, { color: themeColors.text }]}>{stats.totalArtworks || 0}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Artworks</Text>
            </View>
          </View>
        </View>

        {/* SECTION 4: QUICK SHORTCUT TO SETTINGS */}
        <TouchableOpacity
          style={[styles.settingsLinkCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
          activeOpacity={0.8}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.settingsLinkLeft}>
            <View style={[styles.settingsLinkIconWrap, { backgroundColor: isDark ? '#312E81' : '#EDE9FE' }]}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={themeColors.primary} />
            </View>
            <View>
              <Text style={[styles.settingsLinkTitle, { color: themeColors.text }]}>
                Application Settings
              </Text>
              <Text style={[styles.settingsLinkSubtitle, { color: themeColors.textSecondary }]}>
                Appearance, themes, categories & data backup
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md || 16,
    paddingBottom: 40,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  feedbackBannerText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  card: {
    borderRadius: RADIUS.lg || 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitialWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 38,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  avatarButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  charCount: {
    fontSize: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: RADIUS.md || 12,
    marginTop: 8,
    ...SHADOWS.sm,
  },
  primarySaveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  settingsLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  settingsLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsLinkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsLinkTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingsLinkSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
