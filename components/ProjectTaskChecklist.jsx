import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import {
  addTask,
  updateTask,
  toggleTaskCompletion,
  deleteTask,
} from '../database/projectRepository';

export default function ProjectTaskChecklist({
  projectId,
  initialTasks = [],
  onTasksUpdated,
}) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const [tasks, setTasks] = useState(initialTasks);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [titleError, setTitleError] = useState('');

  // Sync when initialTasks prop updates
  React.useEffect(() => {
    if (initialTasks) {
      setTasks(initialTasks);
    }
  }, [initialTasks]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.is_completed === 1).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const openAddModal = () => {
    setEditingTask(null);
    setTitleInput('');
    setDescInput('');
    setTitleError('');
    setModalVisible(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTitleInput(task.title || '');
    setDescInput(task.description || '');
    setTitleError('');
    setModalVisible(true);
  };

  const handleToggleTask = async (task) => {
    try {
      const updated = await toggleTaskCompletion(task.id);
      const updatedList = tasks.map((t) => (t.id === task.id ? updated : t));
      setTasks(updatedList);
      if (onTasksUpdated) onTasksUpdated(updatedList);
    } catch (err) {
      console.warn('Error toggling task:', err);
    }
  };

  const handleSaveTask = async () => {
    if (!titleInput.trim()) {
      setTitleError('Task title is required');
      return;
    }

    try {
      let updatedList = [];
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: titleInput.trim(),
          description: descInput.trim(),
          is_completed: editingTask.is_completed,
        });
        updatedList = tasks.map((t) =>
          t.id === editingTask.id
            ? { ...t, title: titleInput.trim(), description: descInput.trim() }
            : t
        );
      } else {
        updatedList = await addTask({
          projectId,
          title: titleInput.trim(),
          description: descInput.trim(),
        });
      }

      setTasks(updatedList);
      if (onTasksUpdated) onTasksUpdated(updatedList);
      setModalVisible(false);
    } catch (err) {
      setTitleError(err?.message || 'Failed to save task.');
    }
  };

  const handleDeleteTask = (task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = await deleteTask(task.id, projectId);
              setTasks(updatedList);
              if (onTasksUpdated) onTasksUpdated(updatedList);
              setModalVisible(false);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete task.');
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
          <MaterialCommunityIcons name="format-list-checks" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Design Tasks</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={16} color={COLORS.primaryDark} />
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Section */}
      {totalTasks > 0 ? (
        <View style={styles.progressCard}>
          <View style={styles.progressMetaRow}>
            <View>
              <Text style={styles.progressHeading}>Design Progress</Text>
              <Text style={styles.progressSubtitle}>
                {completedTasks} of {totalTasks} tasks completed
              </Text>
            </View>
            <View style={styles.percentageBadge}>
              <Text style={styles.percentageText}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Progress Bar Track */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={28} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No tasks added yet</Text>
          <Text style={styles.emptySubtitle}>
            Break your project down into creative deliverables (posters, banners, countdown posts, announcements).
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={16} color={COLORS.white} />
            <Text style={styles.emptyAddBtnText}>Add First Task</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task List */}
      {totalTasks > 0 && (
        <View style={styles.taskList}>
          {tasks.map((task) => {
            const isDone = task.is_completed === 1;
            return (
              <View key={task.id} style={[styles.taskItem, isDone && styles.taskItemDone]}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => handleToggleTask(task)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name={isDone ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={22}
                    color={isDone ? COLORS.primary : COLORS.border}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.taskTextWrap}
                  activeOpacity={0.7}
                  onPress={() => openEditModal(task)}
                >
                  <Text
                    style={[
                      styles.taskTitle,
                      isDone && styles.taskTitleDone,
                    ]}
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>
                  {task.description ? (
                    <Text
                      style={[
                        styles.taskDesc,
                        isDone && styles.taskDescDone,
                      ]}
                      numberOfLines={2}
                    >
                      {task.description}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.taskEditBtn}
                  onPress={() => openEditModal(task)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Add / Edit Task Modal */}
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
                {editingTask ? 'Edit Task' : 'Add Design Task'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Task Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Task Title <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, titleError ? styles.textInputError : null]}
                value={titleInput}
                onChangeText={(text) => {
                  setTitleInput(text);
                  if (titleError) setTitleError('');
                }}
                placeholder="e.g. Speaker Announcement Poster"
                placeholderTextColor={COLORS.textMuted}
                maxLength={80}
              />
              {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
            </View>

            {/* Description / Deliverable Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Deliverable Details (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={descInput}
                onChangeText={setDescInput}
                placeholder="Include specifications, dimensions, text hierarchy, or deadline notes..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtonsRow}>
              {editingTask && (
                <TouchableOpacity
                  style={styles.deleteModalBtn}
                  onPress={() => handleDeleteTask(editingTask)}
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
                onPress={handleSaveTask}
                activeOpacity={0.85}
              >
                <Text style={styles.saveModalBtnText}>
                  {editingTask ? 'Update' : 'Save Task'}
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
  progressCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  percentageBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
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
  taskList: {
    gap: 8,
    marginTop: 4,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
  },
  taskItemDone: {
    backgroundColor: isDark ? COLORS.surface : '#F8FAFC',
    opacity: 0.8,
  },
  checkboxTouch: {
    padding: 2,
  },
  taskTextWrap: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  taskDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  taskDescDone: {
    color: COLORS.textMuted,
  },
  taskEditBtn: {
    padding: 4,
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
    minHeight: 70,
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
