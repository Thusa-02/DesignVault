import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../../../hooks/useProjects';
import { pickAndSaveArtworks, deleteLocalImage } from '../../../services/imageStorage';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../constants/theme';
import { CATEGORIES, STATUS_OPTIONS, SOFTWARE_OPTIONS } from '../../../constants/categories';
import DatePickerField from '../../../components/DatePickerField';

export default function EditProjectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { projects, updateProject, getProjectById } = useProjects();

  const [loading, setLoading] = useState(true);
  const [originalProject, setOriginalProject] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState([]);
  const [customSoftware, setCustomSoftware] = useState('');
  const [status, setStatus] = useState('In Progress');
  const [createdDate, setCreatedDate] = useState('');
  const [artworks, setArtworks] = useState([]);

  const [titleError, setTitleError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  useEffect(() => {
    async function loadProject() {
      if (!id) return;
      try {
        const found = await getProjectById(id);
        if (found) {
          setOriginalProject(found);
          setTitle(found.title || '');
          setDescription(found.description || '');
          setCategory(found.category || CATEGORIES[0].name);
          setStatus(found.status || 'In Progress');
          setCreatedDate(found.created_date || '');

          let initialArtworks = found.artworks || [];
          if (initialArtworks.length === 0 && found.image_uri) {
            initialArtworks = [{ image_uri: found.image_uri, artwork_title: found.title }];
          }
          setArtworks(initialArtworks);

          const currentTools = found.software
            ? found.software.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
          setSelectedSoftware(currentTools);
          setLoading(false);
        }
      } catch (err) {
        console.error('[DesignVault] Error loading project for edit:', err);
      }
    }
    loadProject();
  }, [id]);

  const handlePickArtworks = async () => {
    try {
      setPickingImage(true);
      const newItems = await pickAndSaveArtworks();
      if (newItems && newItems.length > 0) {
        setArtworks((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('[DesignVault] Error picking artworks in edit screen:', err);
      Alert.alert('Artwork Selection Error', `Could not save images: ${err?.message || err}`);
    } finally {
      setPickingImage(false);
    }
  };

  const handleRemoveArtwork = (indexToRemove) => {
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
    if (!title.trim()) {
      setTitleError('Project title is required');
      return;
    }
    setTitleError('');

    try {
      setSaving(true);
      const softwareString = selectedSoftware.join(', ');

      await updateProject(originalProject.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        software: softwareString,
        status,
        created_date: createdDate,
        artworks: artworks,
      });

      Alert.alert('Updated', 'Project changes saved successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('[DesignVault] Error updating project:', error);
      Alert.alert('Save Error', `Failed to update project: ${error?.message || error}`);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading project details...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Edit: ${originalProject?.title || 'Project'}`,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Project Artworks Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.label}>
              Project Artworks & Designs ({artworks.length})
            </Text>
            {artworks.length > 0 && (
              <TouchableOpacity
                onPress={handlePickArtworks}
                disabled={pickingImage}
                style={styles.addMoreSmallBtn}
              >
                <MaterialCommunityIcons name="plus" size={14} color={COLORS.primaryDark} />
                <Text style={styles.addMoreSmallText}>Add More</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionHint}>
            Manage multiple designs for this project. The first artwork is used as the cover.
          </Text>

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
                    value={item.artwork_title || ''}
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

        {/* Title Input */}
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
            placeholder="Project title..."
            placeholderTextColor={COLORS.textMuted}
          />
          {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
        </View>

        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.choiceChip,
                    isSelected && {
                      backgroundColor: cat.bgColor,
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  <MaterialCommunityIcons
                    name={cat.icon}
                    size={16}
                    color={isSelected ? cat.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.choiceChipText,
                      isSelected && { color: cat.color, fontWeight: '700' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Status Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
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

        {/* Software / Tools Selection */}
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

          {/* Custom Software input */}
          <View style={styles.customToolRow}>
            <TextInput
              style={styles.customToolInput}
              value={customSoftware}
              onChangeText={setCustomSoftware}
              placeholder="Add other software..."
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
            placeholder="Description..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save Changes Button */}
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
              <MaterialCommunityIcons name="check" size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Update Project</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textSecondary,
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
  sectionHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  addMoreSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
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
    backgroundColor: COLORS.secondary,
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
    marginTop: 2,
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
    backgroundColor: COLORS.secondary,
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
