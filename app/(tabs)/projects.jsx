import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../../hooks/useProjects';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { CATEGORIES, STATUS_OPTIONS } from '../../constants/categories';
import SearchBar from '../../components/SearchBar';
import ProjectCard from '../../components/ProjectCard';
import EmptyState from '../../components/EmptyState';

export default function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { projects, refreshData, toggleFavorite } = useProjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // If navigated here with a category param (from Home or Categories screen), apply it
  useEffect(() => {
    if (params?.selectedCategory) {
      setSelectedCategory(params.selectedCategory);
    }
  }, [params?.selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Filtered project list
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Category match
      const matchesCategory =
        selectedCategory === 'All' ||
        project.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Status match
      const matchesStatus =
        selectedStatus === 'All' ||
        project.status?.toLowerCase() === selectedStatus.toLowerCase();

      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.software?.toLowerCase().includes(query);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [projects, selectedCategory, selectedStatus, searchQuery]);

  const activeFiltersCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedStatus !== 'All' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCategory('All');
    setSelectedStatus('All');
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

          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.id}
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

      {/* Filter Reset Pill if active */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersCount}>
            Active filters: {activeFiltersCount}
          </Text>
          <TouchableOpacity onPress={clearAllFilters} style={styles.resetButton}>
            <MaterialCommunityIcons name="filter-remove" size={14} color={COLORS.primary} />
            <Text style={styles.resetText}>Reset All</Text>
          </TouchableOpacity>
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.secondary,
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
  activeFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: COLORS.secondary,
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
    gap: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
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
