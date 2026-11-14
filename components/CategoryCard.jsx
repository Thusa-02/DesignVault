import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';

export default function CategoryCard({
  category,
  count = 0,
  onPress,
  style,
}) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const catBg = category.bgColor || category.bg_color || '#EDE9FE';
  const catColor = category.color || COLORS.primary;
  const finalCatBg = isDark ? `${catColor}25` : catBg;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={[styles.iconContainer, { backgroundColor: finalCatBg }]}>
        <MaterialCommunityIcons
          name={category.icon || 'palette'}
          size={28}
          color={catColor}
        />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {category.name}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: finalCatBg }]}>
            <Text style={[styles.countText, { color: catColor }]}>
              {count} {count === 1 ? 'project' : 'projects'}
            </Text>
          </View>
        </View>

        {category.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {category.description}
          </Text>
        ) : null}
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={COLORS.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : 'transparent',
    ...SHADOWS.card,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  chevron: {
    marginLeft: SPACING.sm,
  },
});
