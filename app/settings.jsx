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
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../context/ProjectContext';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { pickAndSaveProfileImage, deleteLocalImage } from '../services/imageStorage';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: 'sort-calendar-descending' },
  { value: 'oldest', label: 'Oldest First', icon: 'sort-calendar-ascending' },
  { value: 'name_asc', label: 'Name A–Z', icon: 'sort-alphabetical-ascending' },
  { value: 'name_desc', label: 'Name Z–A', icon: 'sort-alphabetical-descending' },
  { value: 'updated', label: 'Recently Updated', icon: 'clock-outline' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light Mode', icon: 'weather-sunny' },
  { value: 'dark', label: 'Dark Mode', icon: 'weather-night' },
  { value: 'system', label: 'System Default', icon: 'cellphone-cog' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    userName,
    profileImageUri,
    updateProfile,
    themePreference,
    setThemePreference,
    defaultSort,
    setDefaultSort,
    galleryLayout,
    setGalleryLayout,
    categories,
    stats,
    clearAllProjects,
    getDatabaseSummary,
    themeColors,
    isDark,
  } = useProjects();

  // Profile Edit Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState(userName || '');
  const [editAvatarUri, setEditAvatarUri] = useState(profileImageUri);
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sorting Selector Modal State
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Dynamic Data Summary
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalProjects: stats.total || 0,
    totalArtworks: stats.totalArtworks || 0,
    totalNotes: 0,
    totalTasks: 0,
  });
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getDatabaseSummary();
        if (data) {
          setSummaryMetrics(data);
        }
      } catch (err) {
        console.warn('Could not load database summary:', err);
      }
    }
    loadSummary();
  }, [stats]);

  const openProfileModal = () => {
    setEditName(userName || '');
    setEditAvatarUri(profileImageUri);
    setProfileError('');
    setProfileModalVisible(true);
  };

  const handlePickAvatar = async () => {
    try {
      const savedUri = await pickAndSaveProfileImage();
      if (savedUri) {
        setEditAvatarUri(savedUri);
      }
    } catch (err) {
      console.warn('Error selecting avatar:', err);
    }
  };

  const handleRemoveAvatar = () => {
    setEditAvatarUri(null);
  };

  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setProfileError('Display name cannot be empty');
      return;
    }
    if (trimmed.length > 40) {
      setProfileError('Name must be 40 characters or less');
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        name: trimmed,
        profileImageUri: editAvatarUri,
      });
      setProfileModalVisible(false);
    } catch (err) {
      setProfileError(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSelectSort = async (sortValue) => {
    await setDefaultSort(sortValue);
    setSortModalVisible(false);
  };

  const handleClearAllProjectsFlow = () => {
    // Step 1: First Strong Confirmation
    Alert.alert(
      'Clear All Projects',
      'Are you sure you want to delete ALL projects, artworks, color palettes, tasks, and notes? This action is permanent and cannot be undone.\n\nYour profile and categories will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue...',
          style: 'destructive',
          onPress: () => {
            // Step 2: Second Explicit Confirmation Dialog
            Alert.alert(
              'Final Confirmation',
              `This will permanently remove ${summaryMetrics.totalProjects} projects, ${summaryMetrics.totalArtworks} artworks, ${summaryMetrics.totalTasks} tasks, and ${summaryMetrics.totalNotes} notes forever.\n\nTap "Confirm Delete" to proceed.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setClearing(true);
                      await clearAllProjects();
                      const updated = await getDatabaseSummary();
                      setSummaryMetrics(updated);
                      Alert.alert('Cleared', 'All projects and portfolio data have been cleared.');
                    } catch (err) {
                      Alert.alert('Error', err?.message || 'Failed to clear data.');
                    } finally {
                      setClearing(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const appVersion =
    Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

  const initial = (userName || 'D').trim().charAt(0).toUpperCase();
  const currentSortObj =
    SORT_OPTIONS.find((s) => s.value === defaultSort) || SORT_OPTIONS[0];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: MY PROFILE CARD */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
          activeOpacity={0.88}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.profileAvatarWrap}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.profileAvatarImg} />
            ) : (
              <View style={styles.profileAvatarInitial}>
                <Text style={styles.profileAvatarText}>{initial}</Text>
              </View>
            )}
            <View style={styles.avatarEditPill}>
              <MaterialCommunityIcons name="camera" size={12} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: themeColors.text }]}>
              {userName || 'Creative Designer'}
            </Text>
            <Text style={[styles.profileSubtitle, { color: themeColors.textSecondary }]}>
              Tap to edit display name & avatar
            </Text>
          </View>

          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={themeColors.textSecondary}
          />
        </TouchableOpacity>

        {/* SECTION 2: APPEARANCE (THEME SELECTOR) */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons
              name="theme-light-dark"
              size={20}
              color={themeColors.primary}
            />
            <Text style={[styles.sectionHeading, { color: themeColors.text }]}>
              Appearance
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: themeColors.textSecondary }]}>
            Choose between Light, Dark, or automatically match device system appearance.
          </Text>

          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((opt) => {
              const isSelected = themePreference === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.themeOptionChip,
                    { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.border },
                    isSelected && {
                      borderColor: themeColors.primary,
                      borderWidth: 2,
                      backgroundColor: themeColors.secondary,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setThemePreference(opt.value)}
                >
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={20}
                    color={isSelected ? themeColors.primary : themeColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: isSelected ? themeColors.primary : themeColors.text },
                      isSelected && { fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={themeColors.primary}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 3: PORTFOLIO PREFERENCES */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons
              name="tune-variant"
              size={20}
              color={themeColors.primary}
            />
            <Text style={[styles.sectionHeading, { color: themeColors.text }]}>
              Portfolio Preferences
            </Text>
          </View>

          {/* Manage Categories Link */}
          <TouchableOpacity
            style={[styles.prefRow, { borderBottomColor: themeColors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push('/manage-categories')}
          >
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconBox, { backgroundColor: themeColors.secondary }]}>
                <MaterialCommunityIcons
                  name="shape-outline"
                  size={18}
                  color={themeColors.primary}
                />
              </View>
              <View>
                <Text style={[styles.prefTitle, { color: themeColors.text }]}>
                  Manage Categories
                </Text>
                <Text style={[styles.prefSub, { color: themeColors.textSecondary }]}>
                  {categories.length} creative disciplines
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={themeColors.textSecondary}
            />
          </TouchableOpacity>

          {/* Default Sorting Selector */}
          <TouchableOpacity
            style={[styles.prefRow, { borderBottomColor: themeColors.border }]}
            activeOpacity={0.7}
            onPress={() => setSortModalVisible(true)}
          >
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconBox, { backgroundColor: themeColors.secondary }]}>
                <MaterialCommunityIcons
                  name="sort-variant"
                  size={18}
                  color={themeColors.primary}
                />
              </View>
              <View>
                <Text style={[styles.prefTitle, { color: themeColors.text }]}>
                  Default Project Sorting
                </Text>
                <Text style={[styles.prefSub, { color: themeColors.textSecondary }]}>
                  {currentSortObj.label}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={themeColors.textSecondary}
            />
          </TouchableOpacity>

          {/* Gallery Layout Preference */}
          <View style={styles.prefRowNoBorder}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconBox, { backgroundColor: themeColors.secondary }]}>
                <MaterialCommunityIcons
                  name="view-dashboard-outline"
                  size={18}
                  color={themeColors.primary}
                />
              </View>
              <View>
                <Text style={[styles.prefTitle, { color: themeColors.text }]}>
                  Artwork Gallery Layout
                </Text>
                <Text style={[styles.prefSub, { color: themeColors.textSecondary }]}>
                  {galleryLayout === 'grid' ? 'Grid View' : 'List View'}
                </Text>
              </View>
            </View>

            {/* Layout Toggle Buttons */}
            <View style={[styles.layoutToggleWrap, { backgroundColor: themeColors.surfaceSubtle }]}>
              <TouchableOpacity
                style={[
                  styles.layoutToggleBtn,
                  galleryLayout === 'grid' && {
                    backgroundColor: themeColors.primary,
                  },
                ]}
                onPress={() => setGalleryLayout('grid')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={16}
                  color={galleryLayout === 'grid' ? COLORS.white : themeColors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.layoutToggleBtn,
                  galleryLayout === 'list' && {
                    backgroundColor: themeColors.primary,
                  },
                ]}
                onPress={() => setGalleryLayout('list')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="view-list-outline"
                  size={16}
                  color={galleryLayout === 'list' ? COLORS.white : themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 4: DATA MANAGEMENT */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons
              name="database-outline"
              size={20}
              color={themeColors.primary}
            />
            <Text style={[styles.sectionHeading, { color: themeColors.text }]}>
              Data Management
            </Text>
          </View>

          {/* Live Data Counters */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryTile, { backgroundColor: themeColors.surfaceSubtle }]}>
              <Text style={[styles.summaryNumber, { color: themeColors.primary }]}>
                {summaryMetrics.totalProjects}
              </Text>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                Projects
              </Text>
            </View>

            <View style={[styles.summaryTile, { backgroundColor: themeColors.surfaceSubtle }]}>
              <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
                {summaryMetrics.totalArtworks}
              </Text>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                Artworks
              </Text>
            </View>

            <View style={[styles.summaryTile, { backgroundColor: themeColors.surfaceSubtle }]}>
              <Text style={[styles.summaryNumber, { color: COLORS.warning }]}>
                {summaryMetrics.totalTasks}
              </Text>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                Tasks
              </Text>
            </View>

            <View style={[styles.summaryTile, { backgroundColor: themeColors.surfaceSubtle }]}>
              <Text style={[styles.summaryNumber, { color: COLORS.accent }]}>
                {summaryMetrics.totalNotes}
              </Text>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                Notes
              </Text>
            </View>
          </View>

          {/* Clear All Projects Action */}
          <TouchableOpacity
            style={[
              styles.dangerButton,
              {
                backgroundColor: isDark ? '#7F1D1D35' : '#FEE2E2',
                borderColor: isDark ? '#B91C1C' : '#FCA5A5',
              },
              clearing && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
            onPress={handleClearAllProjectsFlow}
            disabled={clearing}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
                <Text style={styles.dangerButtonText}>Clear All Projects</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 5: ABOUT DESIGNVAULT */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.aboutHeaderRow}>
            <View style={[styles.aboutLogoBox, { backgroundColor: themeColors.secondary }]}>
              <MaterialCommunityIcons
                name="palette-swatch"
                size={28}
                color={themeColors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aboutAppName, { color: themeColors.text }]}>DesignVault</Text>
              <Text style={[styles.aboutSubtitle, { color: themeColors.primary }]}>
                Your Creative Space
              </Text>
            </View>
            <View style={[styles.versionPill, { backgroundColor: themeColors.surfaceSubtle }]}>
              <Text style={[styles.versionText, { color: themeColors.textSecondary }]}>
                v{appVersion}
              </Text>
            </View>
          </View>

          <Text style={[styles.aboutDescription, { color: themeColors.textSecondary }]}>
            DesignVault helps creative individuals organize projects, manage artwork collections,
            track design tasks, save colour palettes, and capture creative ideas in one place.
          </Text>

          <View style={[styles.courseBadgeRow, { borderTopColor: themeColors.border }]}>
            <MaterialCommunityIcons
              name="school-outline"
              size={16}
              color={themeColors.textSecondary}
            />
            <Text style={[styles.courseBadgeText, { color: themeColors.textSecondary }]}>
              Individual Assessment Project • IT3133(P) ICA 03
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setProfileModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Profile Avatar Selector */}
            <View style={styles.avatarEditContainer}>
              <TouchableOpacity
                style={styles.avatarCircleLarge}
                activeOpacity={0.8}
                onPress={handlePickAvatar}
              >
                {editAvatarUri ? (
                  <Image source={{ uri: editAvatarUri }} style={styles.avatarImgLarge} />
                ) : (
                  <View
                    style={[
                      styles.avatarInitialLarge,
                      { backgroundColor: themeColors.primary },
                    ]}
                  >
                    <Text style={styles.avatarTextLarge}>
                      {(editName || 'D').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.cameraOverlayIcon}>
                  <MaterialCommunityIcons name="camera" size={16} color={COLORS.white} />
                </View>
              </TouchableOpacity>

              <View style={styles.avatarBtnRow}>
                <TouchableOpacity
                  style={[styles.smallAvatarBtn, { backgroundColor: themeColors.secondary }]}
                  onPress={handlePickAvatar}
                >
                  <Text style={[styles.smallAvatarBtnText, { color: themeColors.primary }]}>
                    Choose Photo
                  </Text>
                </TouchableOpacity>

                {editAvatarUri && (
                  <TouchableOpacity
                    style={[
                      styles.smallAvatarBtn,
                      { backgroundColor: isDark ? '#7F1D1D40' : '#FEE2E2' },
                    ]}
                    onPress={handleRemoveAvatar}
                  >
                    <Text style={[styles.smallAvatarBtnText, { color: COLORS.danger }]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Display Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                Display Name <Text style={{ color: COLORS.danger }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                  profileError ? { borderColor: COLORS.danger } : null,
                ]}
                value={editName}
                onChangeText={(text) => {
                  setEditName(text);
                  if (profileError) setProfileError('');
                }}
                placeholder="Enter your name"
                placeholderTextColor={themeColors.textSecondary}
                maxLength={40}
              />
              {profileError ? (
                <Text style={styles.errorText}>{profileError}</Text>
              ) : null}
            </View>

            {/* Modal Actions */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setProfileModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: themeColors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: themeColors.primary }, savingProfile && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SORTING SELECTOR MODAL */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Default Sorting</Text>
              <TouchableOpacity
                onPress={() => setSortModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: 8 }}>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = defaultSort === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.sortOptionRow,
                      { borderColor: themeColors.border },
                      isSelected && {
                        backgroundColor: themeColors.secondary,
                        borderColor: themeColors.primary,
                      },
                    ]}
                    onPress={() => handleSelectSort(opt.value)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? themeColors.primary : themeColors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.sortOptionLabel,
                        { color: isSelected ? themeColors.primary : themeColors.text },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color={themeColors.primary}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
    gap: SPACING.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.card,
    gap: 12,
  },
  profileAvatarWrap: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  profileAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
  },
  profileAvatarInitial: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  avatarEditPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
  },
  profileSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: SPACING.sm,
  },
  themeGrid: {
    gap: 8,
    marginTop: 4,
  },
  themeOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 10,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  prefRowNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prefIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  prefSub: {
    fontSize: 12,
    marginTop: 2,
  },
  layoutToggleWrap: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  layoutToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  summaryTile: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  aboutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.sm,
  },
  aboutLogoBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutAppName: {
    fontSize: 17,
    fontWeight: '800',
  },
  aboutSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  aboutDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  courseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarCircleLarge: {
    position: 'relative',
    width: 84,
    height: 84,
    borderRadius: RADIUS.full,
    marginBottom: 8,
  },
  avatarImgLarge: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.full,
  },
  avatarInitialLarge: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.white,
  },
  cameraOverlayIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallAvatarBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  smallAvatarBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING.xs,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  sortOptionLabel: {
    fontSize: 14,
  },
});
