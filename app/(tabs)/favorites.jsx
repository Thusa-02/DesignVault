import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjects } from '../../hooks/useProjects';
import { COLORS, SPACING } from '../../constants/theme';
import ProjectCard from '../../components/ProjectCard';
import EmptyState from '../../components/EmptyState';

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects, refreshData, toggleFavorite } = useProjects();
  const [refreshing, setRefreshing] = useState(false);

  const favoriteProjects = projects.filter((p) => p.is_favorite === 1);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favourite Designs</Text>
        <Text style={styles.headerSubtitle}>
          {favoriteProjects.length} {favoriteProjects.length === 1 ? 'starred project' : 'starred projects'}
        </Text>
      </View>

      <FlatList
        data={favoriteProjects}
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
          favoriteProjects.length === 0 && styles.listEmpty,
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
            icon="heart-outline"
            title="No Favourites Yet"
            message="Tap the heart icon on any design project card or details page to add it to your favourites collection."
            actionLabel="Explore Projects"
            onAction={() => router.push('/projects')}
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
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
