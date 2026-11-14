import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../../hooks/useProjects';
import { useTheme } from '../../hooks/useTheme';
import { pickAndSaveArtworks, deleteLocalImage } from '../../services/imageStorage';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { CATEGORIES, STATUS_OPTIONS, SOFTWARE_OPTIONS } from '../../constants/categories';
import DatePickerField, { formatDateToISO } from '../../components/DatePickerField';

export default function AddProjectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const { addProject, categories } = useProjects();

  const displayCategories = categories && categories.length > 0 ? categories : CATEGORIES;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(params?.prefillCategory || displayCategories[0]?.name || 'Social Media');
  const [selectedSoftware, setSelectedSoftware] = useState(['Adobe Photoshop']);
  const [customSoftware, setCustomSoftware] = useState('');
  const [status, setStatus] = useState('In Progress');
  const [createdDate, setCreatedDate] = useState(formatDateToISO(new Date()));
  const [artworks, setArtworks] = useState([]);

  const [titleError, setTitleError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const handlePickArtworks = async () => {
    try {
      setPickingImage(true);
      const newItems = await pickAndSaveArtworks();
      if (newItems && newItems.length > 0) {
        setArtworks((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('[DesignVault] Error picking artworks in add screen:', err);
      Alert.alert('Artwork Selection Error', `Could not save images: ${err?.message || err}`);
    } finally {
      setPickingImage(false);
    }
  };

  const handleRemoveArtwork = async (indexToRemove) => {
    const target = artworks[indexToRemove];
    if (target && target.image_uri) {
      await deleteLocalImage(target.image_uri);
    }
    setArtworks((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateArtworkTitle = (index, newTitle) => {
    setArtworks((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, artwork_title: newTitle } : item))
    );
  };

  const toggleSoftware = (tool) => {
    if (selectedSoftware.includes(tool)) {
      setSelectedSoftware(selectedSoftware.filter((s) => s !== tool));
    } else {
      setSelectedSoftware([...selectedSoftware, tool]);
    }
  };

  const handleAddCustomSoftware = () => {
    const trimmed = customSoftware.trim();
    if (trimmed && !selectedSoftware.includes(trimmed)) {
      setSelectedSoftware([...selectedSoftware, trimmed]);
      setCustomSoftware('');
    }
  };

  const handleSave = async () => {
    // 1. Validation
    if (!title.trim()) {
      setTitleError('Project title is required');
      return;
    }
    setTitleError('');

    try {
      setSaving(true);

      const softwareString = selectedSoftware.join(', ');

      // 2. Insert into SQLite with multiple artworks
      await addProject({
        title: title.trim(),
        description: description.trim(),
        category,
        software: softwareString,
        status,
        created_date: createdDate,
        image_uri: artworks.length > 0 ? artworks[0].image_uri : null,
        artworks: artworks,
        is_favorite: 0,
      });

      Alert.alert('Success', 'Design project created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Failed to save project. Please check input values.');
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Artworks Gallery Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.label}>
            Project Artworks {artworks.length > 0 ? `(${artworks.length})` : ''}
          </Text>
          {artworks.length > 0 && (
            <TouchableOpacity
              style={styles.addMoreSmallBtn}
              activeOpacity={0.8}
              onPress={handlePickArtworks}
              disabled={pickingImage}
            >
              <MaterialCommunityIcons name="image-plus" size={16} color={COLORS.primary} />
              <Text style={styles.addMoreSmallText}>Add More</Text>
            </TouchableOpacity>
          )}
        </View>

        {artworks.length === 0 ? (
          <TouchableOpacity
            style={styles.imagePicker}
            activeOpacity={0.8}
            onPress={handlePickArtworks}
            disabled={pickingImage}
          >
            {pickingImage ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.uploadIconCircle}>
                  <MaterialCommunityIcons name="image-multiple" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.uploadTitle}>Select Artworks from Gallery</Text>
                <Text style={styles.uploadSubtitle}>
                  Choose one or multiple designs (posters, banners, announcements)
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.artworksGrid}>
            {artworks.map((item, index) => (
              <View key={index} style={styles.artworkCard}>
                <View style={styles.artworkImageWrap}>
                  <Image source={{ uri: item.image_uri }} style={styles.artworkThumb} />
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.artworkRemoveBtn}
                    onPress={() => handleRemoveArtwork(index)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialCommunityIcons name="close" size={14} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.artworkTitleInput}
                  value={item.artwork_title}
                  onChangeText={(text) => handleUpdateArtworkTitle(index, text)}
                  placeholder={`Design #${index + 1} title (optional)`}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addMoreCard}
              activeOpacity={0.8}
              onPress={handlePickArtworks}
              disabled={pickingImage}
            >
              <MaterialCommunityIcons name="plus" size={24} color={COLORS.primary} />
              <Text style={styles.addMoreCardText}>Add Designs</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Project Title Input */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Project Title <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, titleError ? styles.inputError : null]}
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (titleError) setTitleError('');
          }}
          placeholder="e.g. Artificial Vertex Event Poster"
          placeholderTextColor={COLORS.textMuted}
        />
        {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
      </View>

      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Category <Text style={styles.requiredStar}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {displayCategories.map((cat) => {
            const isSelected = category === cat.name;
            const catColor = cat.color || COLORS.primary;
            const catBg = cat.bgColor || cat.bg_color || '#EDE9FE';
            return (
              <TouchableOpacity
                key={cat.id || cat.name}
                style={[
                  styles.choiceChip,
                  isSelected && {
                    backgroundColor: catBg,
                    borderColor: catColor,
                  },
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <MaterialCommunityIcons
                  name={cat.icon || 'palette'}
                  size={16}
                  color={isSelected ? catColor : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.choiceChipText,
                    isSelected && { color: catColor, fontWeight: '700' },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Project Status</Text>
        <View style={styles.statusGrid}>
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = status === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.statusChoiceChip,
                  isSelected && {
                    backgroundColor: opt.bgColor,
                    borderColor: opt.color,
                  },
                ]}
                onPress={() => setStatus(opt.value)}
              >
                <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                <Text
                  style={[
                    styles.statusChoiceText,
                    isSelected && { color: opt.color, fontWeight: '700' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Software Used Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Software / Tools Used</Text>
        <View style={styles.wrapGrid}>
          {SOFTWARE_OPTIONS.map((tool) => {
            const isSelected = selectedSoftware.includes(tool);
            return (
              <TouchableOpacity
                key={tool}
                style={[
                  styles.toolChip,
                  isSelected && styles.toolChipSelected,
                ]}
                onPress={() => toggleSoftware(tool)}
              >
                <MaterialCommunityIcons
                  name={isSelected ? 'check-circle' : 'plus-circle-outline'}
                  size={14}
                  color={isSelected ? COLORS.white : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.toolChipText,
                    isSelected && styles.toolChipTextSelected,
                  ]}
                >
                  {tool}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom software add row */}
        <View style={styles.customToolRow}>
          <TextInput
            style={styles.customToolInput}
            value={customSoftware}
            onChangeText={setCustomSoftware}
            placeholder="Add other tool (e.g. Affinity, Procreate)"
            placeholderTextColor={COLORS.textMuted}
          />
          <TouchableOpacity
            style={styles.addToolButton}
            onPress={handleAddCustomSoftware}
          >
            <Text style={styles.addToolText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Creation Date Picker */}
      <View style={styles.section}>
        <DatePickerField
          value={createdDate}
          onChange={setCreatedDate}
          label="Creation Date"
          maxDate={new Date()}
        />
      </View>

      {/* Description Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Description & Design Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of the design concept, typography, color palette, or target audience..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, saving && styles.submitButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <MaterialCommunityIcons name="content-save-check" size={20} color={COLORS.white} />
            <Text style={styles.submitButtonText}>Save Project</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  requiredStar: {
    color: COLORS.danger,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  addMoreSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  addMoreSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  artworksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  artworkCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingBottom: 6,
    ...SHADOWS.card,
  },
  artworkImageWrap: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: COLORS.surfaceSubtle,
  },
  artworkThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  coverBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  artworkRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: RADIUS.full,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkTitleInput: {
    fontSize: 11,
    color: COLORS.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  addMoreCard: {
    width: '48%',
    height: 156,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addMoreCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  textArea: {
    minHeight: 100,
  },
  imagePicker: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  imagePreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeImageBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  changeImageText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  removeImageText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  choiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  choiceChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChoiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  statusChoiceText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  wrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  toolChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toolChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  toolChipTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  customToolRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  customToolInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  addToolButton: {
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  addToolText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    gap: 8,
    marginTop: SPACING.sm,
    ...SHADOWS.card,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
