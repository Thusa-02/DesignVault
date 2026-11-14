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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { formatReadableDate } from './DatePickerField';
import {
  addNote,
  updateNote,
  deleteNote,
} from '../database/projectRepository';

const NOTE_TYPES = [
  {
    type: 'Idea',
    label: 'Design Idea',
    icon: 'lightbulb-outline',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
  },
  {
    type: 'Feedback',
    label: 'Feedback',
    icon: 'comment-text-outline',
    color: '#0284C7',
    bgColor: '#E0F2FE',
  },
  {
    type: 'Revision',
    label: 'Revision',
    icon: 'autorenew',
    color: '#EA580C',
    bgColor: '#FFEDD5',
  },
  {
    type: 'General',
    label: 'General',
    icon: 'notebook-outline',
    color: '#475569',
    bgColor: '#F1F5F9',
  },
];

export default function ProjectNotes({
  projectId,
  initialNotes = [],
  onNotesUpdated,
}) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const [notes, setNotes] = useState(initialNotes);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [typeInput, setTypeInput] = useState('Idea');
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');

  // Track expanded note IDs for long text toggle
  const [expandedNotes, setExpandedNotes] = useState({});

  React.useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  const toggleExpand = (noteId) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };

  const openAddModal = () => {
    setEditingNote(null);
    setTitleInput('');
    setContentInput('');
    setTypeInput('Idea');
    setTitleError('');
    setContentError('');
    setModalVisible(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setTitleInput(note.title || '');
    setContentInput(note.content || '');
    setTypeInput(note.note_type || 'General');
    setTitleError('');
    setContentError('');
    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    let hasError = false;
    if (!titleInput.trim()) {
      setTitleError('Note title is required');
      hasError = true;
    }
    if (!contentInput.trim()) {
      setContentError('Note content cannot be empty');
      hasError = true;
    }
    if (hasError) return;

    try {
      let updatedList = [];
      if (editingNote) {
        await updateNote(editingNote.id, {
          title: titleInput.trim(),
          content: contentInput.trim(),
          noteType: typeInput,
        });
        updatedList = notes.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                title: titleInput.trim(),
                content: contentInput.trim(),
                note_type: typeInput,
                updated_at: new Date().toISOString(),
              }
            : n
        );
      } else {
        updatedList = await addNote({
          projectId,
          title: titleInput.trim(),
          content: contentInput.trim(),
          noteType: typeInput,
        });
      }

      setNotes(updatedList);
      if (onNotesUpdated) onNotesUpdated(updatedList);
      setModalVisible(false);
    } catch (err) {
      setContentError(err?.message || 'Failed to save note.');
    }
  };

  const handleDeleteNote = (note) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete note "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = await deleteNote(note.id, projectId);
              setNotes(updatedList);
              if (onNotesUpdated) onNotesUpdated(updatedList);
              setModalVisible(false);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete note.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <MaterialCommunityIcons name="note-text-outline" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Project Notes</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={16} color={COLORS.primaryDark} />
          <Text style={styles.addButtonText}>Add Note</Text>
        </TouchableOpacity>
      </View>

      {/* Notes List or Empty State */}
      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="notebook-outline" size={28} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No notes added yet</Text>
          <Text style={styles.emptySubtitle}>
            Save design concepts, client feedback, typography ideas, and revision requests.
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={16} color={COLORS.white} />
            <Text style={styles.emptyAddBtnText}>Add First Note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.notesList}>
          {notes.map((note) => {
            const typeConfig = NOTE_TYPES.find((t) => t.type === note.note_type) || NOTE_TYPES[3];
            const isExpanded = !!expandedNotes[note.id];
            const isLong = (note.content || '').length > 130;

            const dateString = note.updated_at || note.created_at;
            const formattedDate = dateString ? formatReadableDate(dateString.split('T')[0]) : '';

            return (
              <View key={note.id} style={styles.noteCard}>
                {/* Note Top Bar: Type Pill & Action Buttons */}
                <View style={styles.noteTopRow}>
                  <View style={[styles.typePill, { backgroundColor: typeConfig.bgColor }]}>
                    <MaterialCommunityIcons
                      name={typeConfig.icon}
                      size={13}
                      color={typeConfig.color}
                    />
                    <Text style={[styles.typePillText, { color: typeConfig.color }]}>
                      {typeConfig.label}
                    </Text>
                  </View>

                  <View style={styles.noteActionRow}>
                    {formattedDate ? (
                      <Text style={styles.noteDateText}>{formattedDate}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => openEditModal(note)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={15} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Note Title */}
                <Text style={styles.noteTitle}>{note.title}</Text>

                {/* Note Content */}
                <Text
                  style={styles.noteContent}
                  numberOfLines={isExpanded ? undefined : 3}
                >
                  {note.content}
                </Text>

                {/* Read More / Read Less Toggle */}
                {isLong && (
                  <TouchableOpacity
                    style={styles.expandToggle}
                    onPress={() => toggleExpand(note.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.expandToggleText}>
                      {isExpanded ? 'Show less' : 'Read full note'}
                    </Text>
                    <MaterialCommunityIcons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Add / Edit Note Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNote ? 'Edit Note' : 'Add Project Note'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Note Type Selector */}
            <Text style={styles.inputLabel}>Note Type</Text>
            <View style={styles.typesRow}>
              {NOTE_TYPES.map((t) => {
                const isSelected = typeInput === t.type;
                return (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      styles.typeChip,
                      isSelected && {
                        backgroundColor: t.bgColor,
                        borderColor: t.color,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setTypeInput(t.type)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={t.icon}
                      size={14}
                      color={isSelected ? t.color : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        isSelected && { color: t.color, fontWeight: '700' },
                      ]}
                    >
                      {t.type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Title <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, titleError ? styles.textInputError : null]}
                value={titleInput}
                onChangeText={(text) => {
                  setTitleInput(text);
                  if (titleError) setTitleError('');
                }}
                placeholder="e.g. Design Idea, Client Revision Request"
                placeholderTextColor={COLORS.textMuted}
                maxLength={60}
              />
              {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
            </View>

            {/* Note Content Multiline Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Content <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea, contentError ? styles.textInputError : null]}
                value={contentInput}
                onChangeText={(text) => {
                  setContentInput(text);
                  if (contentError) setContentError('');
                }}
                placeholder="Write your creative thoughts, feedback details, or requested changes..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {contentError ? <Text style={styles.errorText}>{contentError}</Text> : null}
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtonsRow}>
              {editingNote && (
                <TouchableOpacity
                  style={styles.deleteModalBtn}
                  onPress={() => handleDeleteNote(editingNote)}
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
                onPress={handleSaveNote}
                activeOpacity={0.85}
              >
                <Text style={styles.saveModalBtnText}>
                  {editingNote ? 'Update' : 'Save Note'}
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
  notesList: {
    gap: 10,
    marginTop: 4,
  },
  noteCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
  },
  noteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  noteActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteDateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  actionIconBtn: {
    padding: 3,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  noteContent: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
    alignSelf: 'flex-start',
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
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
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 5,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
    minHeight: 85,
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
