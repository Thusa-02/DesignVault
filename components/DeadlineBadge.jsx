import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SPACING } from '../constants/theme';
import { getDeadlineInfo } from '../utils/deadlines';

/**
 * Reusable Deadline Badge component supporting light/dark themes and multiple sizes.
 *
 * @param {string|null} deadlineDate - YYYY-MM-DD string
 * @param {string|null} status - Project status (e.g. 'Completed')
 * @param {boolean} compact - Compact single-line pill or full banner
 * @param {boolean} showDays - Whether to show days left/overdue
 */
export default function DeadlineBadge({
  deadlineDate,
  status,
  compact = false,
  showDays = true,
  style,
}) {
  const { isDark } = useTheme();
  const info = getDeadlineInfo(deadlineDate, status);

  if (!info) return null;

  // Dark mode subtle tints
  const bgStyle = isDark
    ? { backgroundColor: `${info.badgeColor}25`, borderColor: `${info.badgeColor}50` }
    : { backgroundColor: info.badgeBg, borderColor: `${info.badgeColor}30` };

  if (compact) {
    return (
      <View style={[styles.compactBadge, bgStyle, style]}>
        <MaterialCommunityIcons
          name={info.icon}
          size={12}
          color={info.badgeColor}
          style={styles.icon}
        />
        <Text
          style={[styles.compactText, { color: info.badgeColor }]}
          numberOfLines={1}
        >
          {showDays ? info.formattedDays : info.label}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, bgStyle, style]}>
      <MaterialCommunityIcons
        name={info.icon}
        size={15}
        color={info.badgeColor}
        style={styles.icon}
      />
      <View style={styles.textColumn}>
        <Text style={[styles.label, { color: info.badgeColor }]}>
          {info.label}
        </Text>
        {showDays && (
          <Text style={[styles.subText, { color: info.badgeColor }]}>
            {info.formattedDays}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 6,
  },
  textColumn: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
});
