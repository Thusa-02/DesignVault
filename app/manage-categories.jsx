import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../context/ProjectContext';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';

const ICON_CHOICES = [
  'folder-outline',
  'image-outline',
  'drawing-box',
  'cellphone-link',
  'bullhorn',
  'palette-outline',
  'brush',
  'vector-square',
  'camera-outline',
  'book-open-outline',
];

const COLOR_CHOICES = [
  { color: '#7C3AED', bgColor: '#EDE9FE' },
  { color: '#2563EB', bgColor: '#DBEAFE' },
  { color: '#059669', bgColor: '#D1FAE5' },
  { color: '#D97706', bgColor: '#FEF3C7' },
  { color: '#DC2626', bgColor: '#FEE2E2' },
  { color: '#0891B2', bgColor: '#CFFAFE' },
  { color: '#9333EA', bgColor: '#F3E8FF' },
  { color: '#E11D48', bgColor: '#FFE4E6' },
];

export default function ManageCategoriesScreen() {
  const router = useRouter();
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const {
    categories,
    addCategory,
    renameCategory,
    deleteCategory,
    reassignCategoryProjects,
  } = useProjects();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null when adding

  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder-outline');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Reassignment Modal state
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [sourceCategory, setSourceCategory] = useState(null);
  const [targetCategory, setTargetCategory] = useState(null);

  const openAddModal = () => {
    setEditingCategory(null);
    setNameInput('');
    setDescInput('');
    setSelectedIcon('folder-outline');
    setSelectedColorIndex(0);
    setErrorMessage('');
    setModalVisible(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setNameInput(cat.name || '');
    setDescInput(cat.description || '');
    setSelectedIcon(cat.icon || 'folder-outline');
    const colorIdx = COLOR_CHOICES.findIndex((c) => c.color === cat.color);
    setSelectedColorIndex(colorIdx >= 0 ? colorIdx : 0);
    setErrorMessage('');
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorMessage('Category name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const chosenColor = COLOR_CHOICES[selectedColorIndex];

      if (editingCategory) {
        await renameCategory(editingCategory.id, trimmed);
      } else {
        await addCategory({
          name: trimmed,
          description: descInput.trim(),
          icon: selectedIcon,
          color: chosenColor.color,
          bgColor: chosenColor.bgColor,
        });
      }

      setModalVisible(false);
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    const count = cat.project_count || 0;

    if (count > 0) {
      Alert.alert(
        'Category In Use',
        `"${cat.name}" currently contains ${count} ${
          count === 1 ? 'project' : 'projects'
        }. Reassign those projects to another category before deleting.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reassign Projects',
            onPress: () => {
              setSourceCategory(cat);
              const other = categories.find((c) => c.name !== cat.name);
              setTargetCategory(other || null);
              setReassignModalVisible(true);
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete category "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(cat.id);
            } catch (err) {
              Alert.alert('Delete Error', err?.message || 'Failed to delete category.');
            }
          },
        },
      ]
    );
  };

  const handleExecuteReassignment = async () => {
    if (!sourceCategory || !targetCategory) return;
    try {
      setSaving(true);
      const changed = await reassignCategoryProjects(
        sourceCategory.name,
        targetCategory.name
      );
      setReassignModalVisible(false);
      Alert.alert(
        'Reassigned',
        `Successfully moved ${changed} ${
          changed === 1 ? 'project' : 'projects'
        } from "${sourceCategory.name}" to "${targetCategory.name}". You can now safely delete "${sourceCategory.name}".`
      );
    } catch (err) {
      Alert.alert('Reassignment Error', err?.message || 'Failed to reassign projects.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.actionBar}>
        <View>
          <Text style={styles.pageTitle}>Manage Categories</Text>
          <Text style={styles.pageSubtitle}>
            {categories.length} total creative disciplines
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={openAddModal}
        >
          <MaterialCommunityIcons name="plus" size={18} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Custom</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((cat) => {
          const projectCount = cat.project_count || 0;
          return (
            <View key={cat.id || cat.name} style={styles.categoryCard}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: cat.bgColor || cat.bg_color || COLORS.secondary },
                ]}
              >
                <MaterialCommunityIcons
                  name={cat.icon || 'folder-outline'}
                  size={24}
                  color={cat.color || COLORS.primary}
                />
              </View>

              <View style={styles.catDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  {cat.is_custom === 1 && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Custom</Text>
                    </View>
                  )}
                </View>

                {cat.description ? (
                  <Text style={styles.catDesc} numberOfLines={2}>
                    {cat.description}
                  </Text>
                ) : null}

                <View style={styles.countPill}>
                  <MaterialCommunityIcons
                    name="folder-outline"
                    size={12}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.countText}>
                    {projectCount} {projectCount === 1 ? 'project' : 'projects'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsColumn}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => openEditModal(cat)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDeleteCategory(cat)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={COLORS.danger}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add / Edit Category Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Rename Category' : 'Add Custom Category'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Category Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, errorMessage ? styles.textInputError : null]}
                value={nameInput}
                onChangeText={(text) => {
                  setNameInput(text);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="e.g. 3D Renders, Typography, Packaging"
                placeholderTextColor={COLORS.textMuted}
                maxLength={40}
              />
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </View>

            {/* Description Input */}
            {!editingCategory && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={descInput}
                  onChangeText={setDescInput}
                  placeholder="Short description of this category..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            {/* Icon Picker (for new categories) */}
            {!editingCategory && (
              <>
                <Text style={styles.inputLabel}>Choose Icon</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.iconsRow}
                >
                  {ICON_CHOICES.map((iconName) => {
                    const isSelected = selectedIcon === iconName;
                    return (
                      <TouchableOpacity
                        key={iconName}
                        style={[
                          styles.iconChoice,
                          isSelected && styles.iconChoiceSelected,
                        ]}
                        onPress={() => setSelectedIcon(iconName)}
                      >
                        <MaterialCommunityIcons
                          name={iconName}
                          size={20}
                          color={isSelected ? COLORS.primary : COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Color Scheme Picker */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Choose Color</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.colorsRow}
                >
                  {COLOR_CHOICES.map((c, idx) => {
                    const isSelected = selectedColorIndex === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.colorChoice,
                          { backgroundColor: c.bgColor },
                          isSelected && { borderColor: c.color, borderWidth: 2 },
                        ]}
                        onPress={() => setSelectedColorIndex(idx)}
                      >
                        <View style={[styles.colorDot, { backgroundColor: c.color }]} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Modal Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveCategory}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingCategory ? 'Update' : 'Create Category'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reassignment Modal */}
      <Modal
        visible={reassignModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReassignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Projects</Text>
              <TouchableOpacity
                onPress={() => setReassignModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.reassignIntro}>
              Move all projects currently in{' '}
              <Text style={{ fontWeight: '800', color: COLORS.primary }}>
                "{sourceCategory?.name}"
              </Text>{' '}
              to:
            </Text>

            <ScrollView style={{ maxHeight: 200, marginVertical: 12 }}>
              {categories
                .filter((c) => c.name !== sourceCategory?.name)
                .map((cat) => {
                  const isSelected = targetCategory?.name === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.id || cat.name}
                      style={[
                        styles.targetCatOption,
                        isSelected && styles.targetCatOptionSelected,
                      ]}
                      onPress={() => setTargetCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={isSelected ? 'check-circle' : 'circle-outline'}
                        size={20}
                        color={isSelected ? COLORS.primary : COLORS.border}
                      />
                      <Text
                        style={[
                          styles.targetCatName,
                          isSelected && { color: COLORS.primary, fontWeight: '700' },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReassignModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleExecuteReassignment}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>Confirm Reassign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 4,
    ...SHADOWS.card,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.md,
    gap: 10,
    paddingBottom: SPACING.xl * 2,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  customBadge: {
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
  },
  catDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  countText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionsColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: RADIUS.sm,
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
    backgroundColor: COLORS.surface,
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
    color: COLORS.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  requiredStar: {
    color: COLORS.danger,
  },
  textInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 60,
  },
  textInputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  iconChoice: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconChoiceSelected: {
    borderColor: COLORS.primary,
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    borderWidth: 2,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  colorChoice: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: RADIUS.full,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING.md,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  reassignIntro: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  targetCatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 6,
  },
  targetCatOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
  },
  targetCatName: {
    fontSize: 14,
    color: COLORS.text,
  },
});
