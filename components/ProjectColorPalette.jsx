import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ToastAndroid,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import {
  addColor,
  updateColor,
  deleteColor,
  isValidHex,
  normalizeHex,
} from '../database/projectRepository';

// Curated designer palette presets for quick selection
const DESIGNER_PRESETS = [
  { name: 'Dark Red', hex: '#8B0000' },
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Clean White', hex: '#FFFFFF' },
  { name: 'Accent Gold', hex: '#FFD700' },
  { name: 'Deep Purple', hex: '#7C3AED' },
  { name: 'Electric Cyan', hex: '#06B6D4' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Coral Rose', hex: '#F43F5E' },
  { name: 'Slate Gray', hex: '#475569' },
  { name: 'Amber Orange', hex: '#F59E0B' },
];

export default function ProjectColorPalette({ projectId, initialColors = [], onColorsUpdated }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const [colors, setColors] = useState(initialColors);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingColor, setEditingColor] = useState(null); // null if adding new
  const [hexInput, setHexInput] = useState('#');
  const [nameInput, setNameInput] = useState('');
  const [hexError, setHexError] = useState('');
  const [copiedHex, setCopiedHex] = useState(null);

  // Sync when initialColors prop updates
  React.useEffect(() => {
    if (initialColors) {
      setColors(initialColors);
    }
  }, [initialColors]);

  const openAddModal = () => {
    setEditingColor(null);
    setHexInput('#');
    setNameInput('');
    setHexError('');
    setModalVisible(true);
  };

  const openEditModal = (color) => {
    setEditingColor(color);
    setHexInput(color.hex_code);
    setNameInput(color.color_name || '');
    setHexError('');
    setModalVisible(true);
  };

  const handleCopyHex = async (hexCode) => {
    try {
      await Clipboard.setStringAsync(hexCode);
      setCopiedHex(hexCode);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Copied ${hexCode} to clipboard`, ToastAndroid.SHORT);
      }
      setTimeout(() => {
        setCopiedHex(null);
      }, 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handlePresetSelect = (preset) => {
    setHexInput(preset.hex);
    if (!nameInput.trim()) {
      setNameInput(preset.name);
    }
    setHexError('');
  };

  const handleSaveColor = async () => {
    if (!isValidHex(hexInput)) {
      setHexError('Please enter a valid HEX code (e.g. #8B0000 or #F00)');
      return;
    }

    try {
      const normalized = normalizeHex(hexInput);
      let updatedList = [];

      if (editingColor) {
        // Update existing color
        await updateColor(editingColor.id, {
          colorName: nameInput,
          hexCode: normalized,
        });
        updatedList = colors.map((c) =>
          c.id === editingColor.id
            ? { ...c, color_name: nameInput.trim(), hex_code: normalized }
            : c
        );
      } else {
        // Add new color
        updatedList = await addColor({
          projectId,
          colorName: nameInput,
          hexCode: normalized,
        });
      }

      setColors(updatedList);
      if (onColorsUpdated) onColorsUpdated(updatedList);
      setModalVisible(false);
    } catch (err) {
      setHexError(err?.message || 'Error saving colour.');
    }
  };

  const handleDeleteColor = (color) => {
    Alert.alert(
      'Delete Colour',
      `Remove ${color.color_name || color.hex_code} from project colour palette?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = await deleteColor(color.id, projectId);
              setColors(updatedList);
              if (onColorsUpdated) onColorsUpdated(updatedList);
              setModalVisible(false);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete colour.');
            }
          },
        },
      ]
    );
  };

  // Preview color calculation (fallback to transparent if invalid)
  const isCurrentInputValid = isValidHex(hexInput);
  const previewColor = isCurrentInputValid ? hexInput.trim() : '#E2E8F0';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <MaterialCommunityIcons name="palette-swatch-outline" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Project Colour Palette</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={16} color={COLORS.primaryDark} />
          <Text style={styles.addButtonText}>Add Colour</Text>
        </TouchableOpacity>
      </View>

      {/* Swatches Grid / Empty State */}
      {colors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="palette-outline" size={28} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No colours added yet</Text>
          <Text style={styles.emptySubtitle}>
            Save brand colours, accents, and theme hex codes for this design project.
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={16} color={COLORS.white} />
            <Text style={styles.emptyAddBtnText}>Add First Colour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.swatchGrid}>
          {colors.map((color) => {
            const isCopied = copiedHex === color.hex_code;
            return (
              <View key={color.id} style={styles.swatchCard}>
                <TouchableOpacity
                  style={styles.swatchMainRow}
                  activeOpacity={0.75}
                  onPress={() => handleCopyHex(color.hex_code)}
                >
                  <View style={[styles.swatchCircle, { backgroundColor: color.hex_code }]}>
                    {color.hex_code.toUpperCase() === '#FFFFFF' && (
                      <View style={styles.swatchBorder} />
                    )}
                  </View>

                  <View style={styles.swatchInfo}>
                    <Text style={styles.swatchHex} numberOfLines={1}>
                      {color.hex_code}
                    </Text>
                    {color.color_name ? (
                      <Text style={styles.swatchName} numberOfLines={1}>
                        {color.color_name}
                      </Text>
                    ) : (
                      <Text style={styles.swatchTapHint}>Tap to copy</Text>
                    )}
                  </View>

                  <View style={styles.copyBadge}>
                    <MaterialCommunityIcons
                      name={isCopied ? 'check' : 'content-copy'}
                      size={14}
                      color={isCopied ? COLORS.success : COLORS.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Edit / Manage Action */}
                <TouchableOpacity
                  style={styles.editActionBtn}
                  onPress={() => openEditModal(color)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={15} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Add / Edit Colour Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Title */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingColor ? 'Edit Colour' : 'Add Project Colour'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Live Color Preview Banner */}
            <View style={styles.previewBanner}>
              <View
                style={[
                  styles.previewBox,
                  { backgroundColor: previewColor },
                ]}
              >
                {previewColor.toUpperCase() === '#FFFFFF' && (
                  <View style={styles.swatchBorder} />
                )}
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewHex}>
                  {isCurrentInputValid ? hexInput.toUpperCase() : 'Invalid HEX'}
                </Text>
                <Text style={styles.previewLabel}>
                  {nameInput.trim() ? nameInput.trim() : 'Colour Preview'}
                </Text>
              </View>
            </View>

            {/* HEX Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                HEX Colour Code <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, hexError ? styles.textInputError : null]}
                value={hexInput}
                onChangeText={(text) => {
                  setHexInput(text);
                  if (hexError) setHexError('');
                }}
                placeholder="#8B0000 or #F00"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                maxLength={7}
              />
              {hexError ? <Text style={styles.errorText}>{hexError}</Text> : null}
            </View>

            {/* Colour Name Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Colour Name (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="e.g. Dark Red, Accent Gold, Background"
                placeholderTextColor={COLORS.textMuted}
                maxLength={30}
              />
            </View>

            {/* Quick Designer Presets */}
            <Text style={styles.presetLabel}>Quick Designer Palette</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsRow}
            >
              {DESIGNER_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetCircle}
                  onPress={() => handlePresetSelect(preset)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.presetColor, { backgroundColor: preset.hex }]}>
                    {preset.hex.toUpperCase() === '#FFFFFF' && (
                      <View style={styles.swatchBorder} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalButtonsRow}>
              {editingColor && (
                <TouchableOpacity
                  style={styles.deleteModalBtn}
                  onPress={() => handleDeleteColor(editingColor)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveColor}
                activeOpacity={0.85}
              >
                <Text style={styles.saveModalBtnText}>
                  {editingColor ? 'Update' : 'Save Colour'}
                </Text>
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  emptyAddBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  swatchCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 8,
  },
  swatchMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  swatchCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    position: 'relative',
  },
  swatchBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swatchInfo: {
    flex: 1,
  },
  swatchHex: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  swatchName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  swatchTapHint: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  copyBadge: {
    paddingHorizontal: 4,
  },
  editActionBtn: {
    padding: 4,
    marginLeft: 2,
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
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: SPACING.md,
    gap: 12,
  },
  previewBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewInfo: {
    flex: 1,
  },
  previewHex: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  previewLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  textInputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: SPACING.md,
  },
  presetCircle: {
    padding: 2,
  },
  presetColor: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING.xs,
  },
  deleteModalBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: isDark ? '#7F1D1D40' : '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 'auto',
  },
  cancelModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  cancelModalBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveModalBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  saveModalBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
