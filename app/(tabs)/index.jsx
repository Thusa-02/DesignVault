import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../../context/ProjectContext';
import { useTheme } from '../../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { CATEGORIES } from '../../constants/categories';
import StatCard from '../../components/StatCard';
import ProjectCard from '../../components/ProjectCard';
import EmptyState from '../../components/EmptyState';
import { getPersonalizedGreeting } from '../../utils/greeting';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const {
    stats,
    userName,
    profileImageUri,
    categories,
    loading,
    refreshData,
    toggleFavorite,
  } = useProjects();
  const [refreshing, setRefreshing] = useState(false);

  const greeting = getPersonalizedGreeting(userName);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.md, paddingBottom: insets.bottom + SPACING.xl },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header with App Branding & Profile */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="palette-swatch" size={26} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.appName}>DesignVault</Text>
            <Text style={styles.tagline}>Creative Portfolio</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.settingsIconButton}
            activeOpacity={0.75}
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.8}
            onPress={() => router.push('/profile')}
          >
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.profileAvatarImg} />
            ) : (
              <Text style={styles.profileAvatarText}>
                {(userName || 'D').charAt(0).toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAddButton}
            activeOpacity={0.85}
            onPress={() => router.push('/project/add')}
          >
            <MaterialCommunityIcons name="plus" size={18} color={COLORS.white} />
            <Text style={styles.quickAddText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeTextGroup}>
          <Text style={styles.welcomeTitle}>{greeting}</Text>
          <Text style={styles.welcomeSubtitle}>
            Track, curate, and present your graphic design projects in one place.
          </Text>
        </View>
        <MaterialCommunityIcons
          name="folder-star"
          size={50}
          color="rgba(255, 255, 255, 0.25)"
          style={styles.bannerDecorIcon}
        />
      </View>

      {/* Portfolio Overview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Portfolio Overview</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            icon="folder-multiple"
            label="Total Projects"
            value={stats.total}
            color={COLORS.primary}
            bgColor={COLORS.secondary}
          />
          <View style={{ width: SPACING.md }} />
          <StatCard
            icon="check-circle"
            label="Completed"
            value={stats.completed}
            color={COLORS.success}
            bgColor="#D1FAE5"
          />
        </View>

        <View style={[styles.statsRow, { marginTop: SPACING.md }]}>
          <StatCard
            icon="progress-clock"
            label="In Progress"
            value={stats.inProgress}
            color={COLORS.warning}
            bgColor="#FEF3C7"
          />
          <View style={{ width: SPACING.md }} />
          <StatCard
            icon="heart"
            label="Favourites"
            value={stats.favorites}
            color={COLORS.danger}
            bgColor="#FEE2E2"
          />
        </View>
      </View>

      {/* Category Shortcuts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/categories')}
        >
          <Text style={styles.seeAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {(categories && categories.length > 0 ? categories : CATEGORIES).map((cat) => {
          const count = stats.categoryCounts[cat.name] || 0;
          const catBg = cat.bgColor || cat.bg_color || '#EDE9FE';
          const catColor = cat.color || COLORS.primary;
          return (
            <TouchableOpacity
              key={cat.id || cat.name}
              style={styles.categoryChip}
              activeOpacity={0.8}
              onPress={() => {
                router.push({
                  pathname: '/projects',
                  params: { selectedCategory: cat.name },
                });
              }}
            >
              <View style={[styles.categoryChipIcon, { backgroundColor: catBg }]}>
                <MaterialCommunityIcons name={cat.icon || 'palette'} size={20} color={catColor} />
              </View>
              <View>
                <Text style={styles.categoryChipName} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text style={styles.categoryChipCount}>
                  {count} {count === 1 ? 'project' : 'projects'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Recently Added Projects */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recently Updated Projects</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/projects')}
        >
          <Text style={styles.seeAllText}>See All ({stats.total})</Text>
        </TouchableOpacity>
      </View>

      {stats.recentProjects && stats.recentProjects.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentScroll}
        >
          {stats.recentProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              compact
              onPress={() => router.push(`/project/${project.id}`)}
              onToggleFavorite={() => toggleFavorite(project.id)}
            />
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          icon="folder-plus-outline"
          title="No Projects Yet"
          message="Start creating your design showcase by adding your first project!"
          actionLabel="Add Project"
          onAction={() => router.push('/project/add')}
        />
      )}
    </ScrollView>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  settingsIconButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.full,
  },
  profileAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    gap: 4,
    ...SHADOWS.card,
  },
  quickAddText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  welcomeBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  welcomeTextGroup: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: isDark ? '#E2E8F0' : COLORS.secondary,
    lineHeight: 18,
  },
  bannerDecorIcon: {
    marginLeft: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionMeta: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statsGrid: {
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
  },
  categoryScroll: {
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : 'transparent',
    ...SHADOWS.card,
  },
  categoryChipIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryChipCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  recentScroll: {
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.md,
  },
});
