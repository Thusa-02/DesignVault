import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';

export default function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
  style,
}) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);

  const activeColor = color || COLORS.primary;
  const activeBg = bgColor || (isDark ? COLORS.surfaceSubtle : COLORS.secondary);

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: activeBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={activeColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : 'transparent',
    ...SHADOWS.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
