import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProjects } from '../../hooks/useProjects';
import { useTheme } from '../../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { CATEGORIES } from '../../constants/categories';
import ProjectImage from '../../components/ProjectImage';
import StatusBadge from '../../components/StatusBadge';
import { formatReadableDate } from '../../components/DatePickerField';
import ArtworkGalleryViewer from '../../components/ArtworkGalleryViewer';
import ProjectColorPalette from '../../components/ProjectColorPalette';
import ProjectTaskChecklist from '../../components/ProjectTaskChecklist';
import ProjectNotes from '../../components/ProjectNotes';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const {
    deleteProject,
    toggleFavorite,
    getProjectById,
    projects,
    galleryLayout,
  } = useProjects();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Fullscreen modal artwork viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeViewerIndex, setActiveViewerIndex] = useState(0);

  const loadData = async () => {
    if (!id) return;
    try {
      const found = await getProjectById(id);
      if (found) {
        setProject(found);
      }
    } catch (err) {
      console.error('[DesignVault] Error loading project by id:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, projects]);

  if (loading || !project) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading project details...</Text>
      </View>
    );
  }

  const isFav = project.is_favorite === 1;

  const categoryObj = CATEGORIES.find(
    (c) => c.name.toLowerCase() === (project.category || '').toLowerCase()
  ) || {
    icon: 'palette',
    color: COLORS.primary,
    bgColor: COLORS.secondary,
  };

  const softwareList = project.software
    ? project.software.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  // Determine artworks list (with fallback to cover image if no artworks rows exist)
  const rawArtworks = project.artworks || [];
  const primaryUri = project.cover_image_uri || project.image_uri;
  const artworksList =
    rawArtworks.length > 0
      ? rawArtworks
      : primaryUri
      ? [{ id: 0, image_uri: primaryUri, artwork_title: project.title }]
      : [];

  const openViewerAtIndex = (index) => {
    setActiveViewerIndex(index);
    setViewerVisible(true);
  };

  const handleColorsUpdated = (newColors) => {
    setProject((prev) => (prev ? { ...prev, colors: newColors } : prev));
  };

  const handleTasksUpdated = (newTasks) => {
    const total = newTasks.length;
    const completed = newTasks.filter((t) => t.is_completed === 1).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    setProject((prev) =>
      prev
        ? {
            ...prev,
            tasks: newTasks,
            taskProgress: { total, completed, percentage },
          }
        : prev
    );
  };

  const handleNotesUpdated = (newNotes) => {
    setProject((prev) => (prev ? { ...prev, notes: newNotes } : prev));
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteProject(project.id);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete project.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: project.title || 'Project Details',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => toggleFavorite(project.id)}
              style={styles.headerHeartButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name={isFav ? 'heart' : 'heart-outline'}
                size={24}
                color={isFav ? COLORS.danger : COLORS.textMuted}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. PROJECT INFORMATION & HERO SHOWCASE */}
        <TouchableOpacity
          style={styles.imageShowcase}
          activeOpacity={artworksList.length > 0 ? 0.9 : 1}
          onPress={() => {
            if (artworksList.length > 0) openViewerAtIndex(0);
          }}
        >
          <ProjectImage
            uri={artworksList[0]?.image_uri || primaryUri}
            category={project.category}
            iconSize={56}
            style={styles.largeImage}
          />

          {artworksList.length > 0 && (
            <View style={styles.showcaseOverlayBadge}>
              <MaterialCommunityIcons name="fullscreen" size={16} color={COLORS.white} />
              <Text style={styles.showcaseOverlayText}>
                {artworksList.length > 1
                  ? `${artworksList.length} Artworks • Tap to view`
                  : 'Tap to view fullscreen'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.card}>
          {/* Header Row: Category Badge & Status */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: isDark ? `${categoryObj.color}25` : categoryObj.bgColor },
              ]}
            >
              <MaterialCommunityIcons
                name={categoryObj.icon}
                size={16}
                color={categoryObj.color}
              />
              <Text style={[styles.categoryPillText, { color: categoryObj.color }]}>
                {project.category}
              </Text>
            </View>
            <StatusBadge status={project.status} />
          </View>

          {/* Project Title */}
          <Text style={styles.title}>{project.title}</Text>

          {/* Date & Favorite Status Indicator */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={16} color={COLORS.textMuted} />
              <Text style={styles.metaText}>
                {project.created_date ? formatReadableDate(project.created_date) : 'N/A'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.favBadge, isFav && styles.favBadgeActive]}
              onPress={() => toggleFavorite(project.id)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={isFav ? 'heart' : 'heart-outline'}
                size={16}
                color={isFav ? COLORS.danger : COLORS.textSecondary}
              />
              <Text style={[styles.favBadgeText, isFav && styles.favBadgeTextActive]}>
                {isFav ? 'Favourited' : 'Add to Favs'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description Section */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionHeading}>Description & Concept</Text>
            <Text style={styles.descriptionText}>
              {project.description || 'No project description provided.'}
            </Text>
          </View>

          {/* Software Used Section */}
          {softwareList.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeading}>Creative Software Used</Text>
              <View style={styles.softwareChipWrap}>
                {softwareList.map((tool, index) => (
                  <View key={index} style={styles.softwareChip}>
                    <MaterialCommunityIcons
                      name="layers-outline"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.softwareChipText}>{tool}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 2. ARTWORK GALLERY SECTION */}
        {artworksList.length > 0 && (
          <View style={styles.galleryCard}>
            <View style={styles.galleryHeaderRow}>
              <View style={styles.galleryTitleWrap}>
                <MaterialCommunityIcons
                  name="image-multiple-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.galleryTitle}>Project Designs & Artworks</Text>
              </View>
              <View style={styles.artworkCountPill}>
                <Text style={styles.artworkCountPillText}>
                  {artworksList.length} {artworksList.length === 1 ? 'Design' : 'Designs'}
                </Text>
              </View>
            </View>

            {galleryLayout === 'list' ? (
              <View style={styles.galleryList}>
                {artworksList.map((art, idx) => (
                  <TouchableOpacity
                    key={art.id || idx}
                    style={styles.listArtworkCard}
                    activeOpacity={0.85}
                    onPress={() => openViewerAtIndex(idx)}
                  >
                    <View style={styles.listArtworkImageWrap}>
                      <Image source={{ uri: art.image_uri }} style={styles.listArtworkImage} />
                      <View style={styles.thumbBadge}>
                        <Text style={styles.thumbBadgeText}>#{idx + 1}</Text>
                      </View>
                    </View>
                    <View style={styles.listArtworkInfo}>
                      <Text style={styles.listArtworkTitle} numberOfLines={1}>
                        {art.artwork_title || `Design #${idx + 1}`}
                      </Text>
                      <Text style={styles.listArtworkHint}>Tap to view fullscreen</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.galleryGrid}>
                {artworksList.map((art, idx) => (
                  <TouchableOpacity
                    key={art.id || idx}
                    style={styles.thumbCard}
                    activeOpacity={0.8}
                    onPress={() => openViewerAtIndex(idx)}
                  >
                    <View style={styles.thumbImageWrap}>
                      <Image source={{ uri: art.image_uri }} style={styles.thumbImage} />
                      <View style={styles.thumbBadge}>
                        <Text style={styles.thumbBadgeText}>#{idx + 1}</Text>
                      </View>
                    </View>
                    <Text style={styles.thumbTitle} numberOfLines={1}>
                      {art.artwork_title || `Design #${idx + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 3. DESIGN TASKS & PROGRESS TRACKING (FEATURE 2) */}
        <ProjectTaskChecklist
          projectId={project.id}
          initialTasks={project.tasks || []}
          onTasksUpdated={handleTasksUpdated}
        />

        {/* 4. COLOUR PALETTE MANAGER (FEATURE 1) */}
        <ProjectColorPalette
          projectId={project.id}
          initialColors={project.colors || []}
          onColorsUpdated={handleColorsUpdated}
        />

        {/* 5. PROJECT NOTES (FEATURE 4) */}
        <ProjectNotes
          projectId={project.id}
          initialNotes={project.notes || []}
          onNotesUpdated={handleNotesUpdated}
        />

        {/* 6. ACTION BUTTONS: EDIT & DELETE */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.85}
            onPress={() => router.push(`/project/edit/${project.id}`)}
          >
            <MaterialCommunityIcons name="pencil" size={18} color={COLORS.white} />
            <Text style={styles.editButtonText}>Edit Project</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            activeOpacity={0.85}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FULL-SCREEN PINCH-TO-ZOOM ARTWORK GALLERY VIEWER (FEATURE 3) */}
      <ArtworkGalleryViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        artworks={artworksList}
        initialIndex={activeViewerIndex}
        projectTitle={project.title}
      />
    </>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
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
  headerHeartButton: {
    marginRight: SPACING.xs,
    padding: 6,
  },
  imageShowcase: {
    width: '100%',
    height: 270,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceSubtle,
    marginBottom: SPACING.md,
    position: 'relative',
    ...SHADOWS.card,
  },
  largeImage: {
    width: '100%',
    height: '100%',
  },
  showcaseOverlayBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  showcaseOverlayText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.card,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 28,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  favBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  favBadgeActive: {
    backgroundColor: isDark ? '#7F1D1D40' : '#FEE2E2',
  },
  favBadgeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  favBadgeTextActive: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md,
  },
  infoSection: {
    marginBottom: SPACING.md,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  softwareChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  softwareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  softwareChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  galleryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  galleryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  galleryTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  galleryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  artworkCountPill: {
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  artworkCountPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryList: {
    gap: 10,
  },
  listArtworkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 8,
    gap: 12,
  },
  listArtworkImageWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.borderLight,
  },
  listArtworkImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listArtworkInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listArtworkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  listArtworkHint: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  thumbCard: {
    width: '31%',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingBottom: 4,
  },
  thumbImageWrap: {
    width: '100%',
    height: 80,
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  thumbBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  thumbTitle: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  editButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    gap: 6,
    ...SHADOWS.card,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#7F1D1D40' : '#FEE2E2',
    borderWidth: 1,
    borderColor: isDark ? '#B91C1C' : '#FCA5A5',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    gap: 6,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});
