import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import StatusBadge from './StatusBadge';
import ProjectImage from './ProjectImage';
import { formatReadableDate } from './DatePickerField';
import DeadlineBadge from './DeadlineBadge';

export default function ProjectCard({
  project,
  onPress,
  onToggleFavorite,
  style,
  compact = false,
}) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const isFav = project.is_favorite === 1;
  const coverUri = project.cover_image_uri || project.image_uri;
  const artworkCount = project.artwork_count !== undefined
    ? project.artwork_count
    : (project.artworks ? project.artworks.length : (coverUri ? 1 : 0));

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, compact && styles.compactCard, style]}
    >
      {/* Thumbnail */}
      <View style={[styles.imageContainer, compact && styles.compactImageContainer]}>
        <ProjectImage
          uri={coverUri}
          category={project.category}
          style={styles.image}
        />
        {/* Favorite Icon Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite?.(project.id);
          }}
          style={styles.favoriteButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name={isFav ? 'heart' : 'heart-outline'}
            size={18}
            color={isFav ? COLORS.danger : COLORS.textMuted}
          />
        </TouchableOpacity>

        {/* Artwork Count Badge */}
        {artworkCount > 0 && (
          <View style={styles.artworkBadge}>
            <MaterialCommunityIcons name="image-multiple" size={12} color={COLORS.white} />
            <Text style={styles.artworkBadgeText}>
              {artworkCount} {artworkCount === 1 ? 'artwork' : 'artworks'}
            </Text>
          </View>
        )}
      </View>

      {/* Info Container */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.category} numberOfLines={1}>
            {project.category}
          </Text>
          <StatusBadge status={project.status} />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {project.title}
        </Text>

        {!!project.deadline_date && (
          <View style={styles.cardDeadlineRow}>
            <DeadlineBadge
              deadlineDate={project.deadline_date}
              status={project.status}
              compact={true}
              showDays={true}
            />
          </View>
        )}

        {!compact && project.software && (
          <View style={styles.softwareRow}>
            <MaterialCommunityIcons name="tools" size={13} color={COLORS.textSecondary} />
            <Text style={styles.softwareText} numberOfLines={1}>
              {project.software}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar-range" size={13} color={COLORS.textMuted} />
            <Text style={styles.dateText}>
              {project.created_date ? formatReadableDate(project.created_date) : 'Undated'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : 'transparent',
    ...SHADOWS.card,
  },
  compactCard: {
    width: 260,
    marginRight: SPACING.md,
    marginBottom: SPACING.xs,
  },
  imageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
    backgroundColor: COLORS.surfaceSubtle,
  },
  compactImageContainer: {
    height: 130,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.92)',
    borderRadius: RADIUS.full,
    padding: 7,
    ...SHADOWS.card,
  },
  artworkBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  artworkBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDeadlineRow: {
    marginBottom: 8,
  },
  softwareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  softwareText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
