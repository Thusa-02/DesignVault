import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../../context/ProjectContext';
import { useTheme } from '../../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { CATEGORIES, STATUS_OPTIONS } from '../../constants/categories';
import SearchBar from '../../components/SearchBar';
import ProjectCard from '../../components/ProjectCard';
import EmptyState from '../../components/EmptyState';
import { getDeadlineInfo } from '../../utils/deadlines';

const SORT_LABELS = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  deadline_asc: 'Earliest Deadline',
  name_asc: 'Name A–Z',
  name_desc: 'Name Z–A',
  updated: 'Recently Updated',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: 'sort-calendar-descending' },
  { value: 'oldest', label: 'Oldest First', icon: 'sort-calendar-ascending' },
  { value: 'deadline_asc', label: 'Earliest Deadline', icon: 'calendar-clock' },
  { value: 'name_asc', label: 'Name A–Z', icon: 'sort-alphabetical-ascending' },
  { value: 'name_desc', label: 'Name Z–A', icon: 'sort-alphabetical-descending' },
  { value: 'updated', label: 'Recently Updated', icon: 'clock-outline' },
];

export default function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const {
    projects,
    categories,
    defaultSort,
    refreshData,
    toggleFavorite,
  } = useProjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [activeSort, setActiveSort] = useState(defaultSort || 'newest');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (defaultSort) {
      setActiveSort(defaultSort);
    }
  }, [defaultSort]);

  // If navigated here with a category param or sort param, apply it
  useEffect(() => {
    if (params?.selectedCategory) {
      setSelectedCategory(params.selectedCategory);
    }
    if (params?.activeSort) {
      setActiveSort(params.activeSort);
    }
  }, [params?.selectedCategory, params?.activeSort]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Filtered and sorted project list
  const filteredProjects = useMemo(() => {
    const list = projects.filter((project) => {
      // Category match
      const matchesCategory =
        selectedCategory === 'All' ||
        project.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Status match
      const matchesStatus =
        selectedStatus === 'All' ||
        project.status?.toLowerCase() === selectedStatus.toLowerCase();

      // Deadline filter match
      let matchesDeadline = true;
      if (deadlineFilter === 'has_deadline') {
        matchesDeadline = !!(project.deadline_date && project.deadline_date.trim() !== '');
      } else if (deadlineFilter === 'upcoming') {
        const info = getDeadlineInfo(project.deadline_date, project.status);
        matchesDeadline = !!info && (info.statusKey === 'upcoming' || info.statusKey === 'due_today');
      } else if (deadlineFilter === 'overdue') {
        const info = getDeadlineInfo(project.deadline_date, project.status);
        matchesDeadline = !!info && info.statusKey === 'overdue';
      }

      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.software?.toLowerCase().includes(query);

      return matchesCategory && matchesStatus && matchesDeadline && matchesSearch;
    });

    return list.sort((a, b) => {
      if (activeSort === 'deadline_asc') {
        const hasA = !!(a.deadline_date && a.deadline_date.trim() !== '');
        const hasB = !!(b.deadline_date && b.deadline_date.trim() !== '');
        if (hasA && hasB) {
          return a.deadline_date.localeCompare(b.deadline_date) || (b.id - a.id);
        }
        if (hasA) return -1;
        if (hasB) return 1;
        return (b.created_date || '').localeCompare(a.created_date || '') || b.id - a.id;
      }
      if (activeSort === 'newest') {
        return (b.created_date || '').localeCompare(a.created_date || '') || b.id - a.id;
      }
      if (activeSort === 'oldest') {
        return (a.created_date || '').localeCompare(b.created_date || '') || a.id - b.id;
      }
      if (activeSort === 'name_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (activeSort === 'name_desc') {
        return (b.title || '').localeCompare(a.title || '');
      }
      if (activeSort === 'updated') {
        return (b.updated_at || '').localeCompare(a.updated_at || '') || b.id - a.id;
      }
      return 0;
    });
  }, [projects, selectedCategory, selectedStatus, deadlineFilter, searchQuery, activeSort]);

  const activeFiltersCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedStatus !== 'All' ? 1 : 0) +
    (deadlineFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCategory('All');
    setSelectedStatus('All');
    setDeadlineFilter('all');
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Projects</Text>
          <Text style={styles.headerSubtitle}>
            {filteredProjects.length} {filteredProjects.length === 1 ? 'design' : 'designs'} found
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={() => router.push('/project/add')}
        >
          <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by title, software, keyword..."
        />
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === 'All' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory('All')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'All' && styles.filterChipTextActive,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {(categories && categories.length > 0 ? categories : CATEGORIES).map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.id || cat.name}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Filter Chips */}
      <View style={styles.statusFiltersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.statusChip,
              selectedStatus === 'All' && styles.statusChipActive,
            ]}
            onPress={() => setSelectedStatus('All')}
          >
            <Text
              style={[
                styles.statusChipText,
                selectedStatus === 'All' && styles.statusChipTextActive,
              ]}
            >
              All Statuses
            </Text>
          </TouchableOpacity>

          {STATUS_OPTIONS.map((status) => {
            const isActive = selectedStatus === status.value;
            return (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.statusChip,
                  isActive && {
                    backgroundColor: status.bgColor,
                    borderColor: status.color,
                  },
                ]}
                onPress={() => setSelectedStatus(status.value)}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: status.color },
                  ]}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    isActive && { color: status.color, fontWeight: '700' },
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Deadline Filter Chips */}
      <View style={styles.deadlineFiltersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { label: 'All Projects', value: 'all', icon: 'calendar-range' },
            { label: 'With Deadlines', value: 'has_deadline', icon: 'calendar-clock' },
            { label: 'Upcoming', value: 'upcoming', icon: 'clock-outline' },
            { label: 'Overdue', value: 'overdue', icon: 'calendar-alert' },
          ].map((item) => {
            const isActive = deadlineFilter === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.deadlineFilterChip,
                  isActive && styles.deadlineFilterChipActive,
                ]}
                onPress={() => setDeadlineFilter(item.value)}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={13}
                  color={isActive ? COLORS.white : (isDark ? COLORS.textSecondary : COLORS.primary)}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.deadlineFilterChipText,
                    isActive && styles.deadlineFilterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Controls Bar: Sort Button & Active Filters Indicator */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="sort" size={16} color={COLORS.primary} />
          <Text style={styles.sortButtonText}>
            {SORT_LABELS[activeSort] || 'Sort'}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={COLORS.primary} />
        </TouchableOpacity>

        {activeFiltersCount > 0 ? (
          <TouchableOpacity onPress={clearAllFilters} style={styles.resetButton}>
            <MaterialCommunityIcons name="filter-remove" size={13} color={COLORS.danger} />
            <Text style={styles.resetText}>Reset ({activeFiltersCount})</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.resultsCountText}>
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
          </Text>
        )}
      </View>

      {/* Projects List */}
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/project/${item.id}`)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredProjects.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="file-search-outline"
            title="No Matching Designs"
            message={
              searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                ? "We couldn't find any projects matching your active filters."
                : 'No projects added yet.'
            }
            actionLabel={
              searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                ? 'Clear Filters'
                : 'Add Project'
            }
            onAction={
              searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                ? clearAllFilters
                : () => router.push('/project/add')
            }
          />
        }
      />

      {/* Sort Selector Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Projects By</Text>
              <TouchableOpacity
                onPress={() => setSortModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: 8 }}>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = activeSort === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.sortOptionRow,
                      isSelected && styles.sortOptionRowSelected,
                    ]}
                    onPress={() => {
                      setActiveSort(opt.value);
                      setSortModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.sortOptionLabel,
                        isSelected && { color: COLORS.primary, fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color={COLORS.primary}
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
    </View>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    gap: 4,
    ...SHADOWS.card,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  searchWrapper: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  filtersSection: {
    marginTop: SPACING.xs,
  },
  statusFiltersSection: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  deadlineFiltersSection: {
    marginBottom: SPACING.xs,
  },
  deadlineFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: isDark ? COLORS.surfaceSubtle : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : '#E2E8F0',
    marginRight: 6,
  },
  deadlineFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  deadlineFilterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  deadlineFilterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs + 2,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
    gap: 5,
  },
  statusChipActive: {
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    borderColor: COLORS.primary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  statusChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    marginBottom: SPACING.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  resultsCountText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  activeFiltersCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#7F1D1D40' : '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  resetText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
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
    maxWidth: 360,
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
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    gap: 10,
  },
  sortOptionRowSelected: {
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    borderColor: COLORS.primary,
  },
  sortOptionLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xl * 2,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
