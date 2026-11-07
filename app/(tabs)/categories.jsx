import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../../hooks/useProjects';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { CATEGORIES } from '../../constants/categories';
import CategoryCard from '../../components/CategoryCard';
import ProjectCard from '../../components/ProjectCard';

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stats, projects, refreshData, toggleFavorite } = useProjects();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const categoryProjects = selectedCategory
    ? projects.filter(
        (p) => p.category?.toLowerCase() === selectedCategory.name.toLowerCase()
      )
    : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Design Categories</Text>
          <Text style={styles.headerSubtitle}>
            Browse portfolio projects organized by discipline
          </Text>
        </View>
      </View>

      {selectedCategory ? (
        // Detailed category view
        <View style={styles.detailContainer}>
          <View style={styles.categoryBanner}>
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.primary} />
              <Text style={styles.backButtonText}>All Categories</Text>
            </TouchableOpacity>

            <View style={styles.bannerInfo}>
              <View style={[styles.bannerIcon, { backgroundColor: selectedCategory.bgColor }]}>
                <MaterialCommunityIcons
                  name={selectedCategory.icon}
                  size={32}
                  color={selectedCategory.color}
                />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>{selectedCategory.name}</Text>
                <Text style={styles.bannerSubtitle}>
                  {categoryProjects.length} {categoryProjects.length === 1 ? 'project' : 'projects'}
                </Text>
              </View>
            </View>

            <Text style={styles.bannerDescription}>
              {selectedCategory.description}
            </Text>
          </View>

          {/* List of projects in this category */}
          <FlatList
            data={categoryProjects}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ProjectCard
                project={item}
                onPress={() => router.push(`/project/${item.id}`)}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
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
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="folder-open-outline"
                  size={44}
                  color={COLORS.textMuted}
                />
                <Text style={styles.emptyTitle}>No projects in {selectedCategory.name}</Text>
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() =>
                    router.push({
                      pathname: '/project/add',
                      params: { prefillCategory: selectedCategory.name },
                    })
                  }
                >
                  <Text style={styles.emptyAddText}>Create One Now</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      ) : (
        // Grid / List of all categories
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {CATEGORIES.map((cat) => {
            const count = stats.categoryCounts[cat.name] || 0;
            return (
              <CategoryCard
                key={cat.id}
                category={cat}
                count={count}
                onPress={() => setSelectedCategory(cat)}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
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
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  detailContainer: {
    flex: 1,
  },
  categoryBanner: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  bannerIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  bannerDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  emptyAddButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  emptyAddText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
