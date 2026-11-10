import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { STATUS_OPTIONS } from '../constants/categories';
import { COLORS, RADIUS } from '../constants/theme';

export default function StatusBadge({ status, style }) {
  const currentStatus = STATUS_OPTIONS.find(
    (s) => s.value.toLowerCase() === (status || '').toLowerCase()
  ) || {
    label: status || 'Pending',
    color: COLORS.primary,
    bgColor: COLORS.secondary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: currentStatus.bgColor }, style]}>
      <View style={[styles.dot, { backgroundColor: currentStatus.color }]} />
      <Text style={[styles.text, { color: currentStatus.color }]}>
        {currentStatus.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    marginRight: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
