import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

/**
 * Converts a Date object to local YYYY-MM-DD string without timezone offset shifts.
 */
export function formatDateToISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date object.
 */
export function parseISOToDate(isoString) {
  if (!isoString || typeof isoString !== 'string') return new Date();
  const parts = isoString.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(isoString);
  return !isNaN(fallback.getTime()) ? fallback : new Date();
}

/**
 * Formats a Date or YYYY-MM-DD string to a readable format: "02 November 2026".
 */
export function formatReadableDate(dateOrString) {
  const date = typeof dateOrString === 'string' ? parseISOToDate(dateOrString) : dateOrString;
  if (!date || isNaN(date.getTime())) return 'Select Date';
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function DatePickerField({
  value,
  onChange,
  label = 'Creation Date',
  maxDate,
  minDate,
  placeholder = 'Select Date',
  allowClear = false,
  onClear,
  style,
}) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);
  const [showPicker, setShowPicker] = useState(false);

  // Convert current ISO string value to Date object for picker, or default to today
  const currentDate = value ? parseISOToDate(value) : new Date();

  const handleValueChange = (event, selectedDate) => {
    // Close picker immediately upon date selection
    setShowPicker(false);

    if (!selectedDate) {
      return;
    }

    // Format local date safely to YYYY-MM-DD
    const isoString = formatDateToISO(selectedDate);
    if (onChange) {
      onChange(isoString);
    }
  };

  const handleDismiss = () => {
    // Close picker when cancelled or dismissed without modifying date
    setShowPicker(false);
  };

  const handleNeutralButtonPress = () => {
    // Close picker if neutral button is pressed
    setShowPicker(false);
  };

  const handleClear = (e) => {
    e.stopPropagation?.();
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange(null);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={styles.field}
        activeOpacity={0.8}
        onPress={() => setShowPicker(true)}
      >
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons
            name={value ? "calendar-month-outline" : "calendar-clock-outline"}
            size={22}
            color={value ? COLORS.primary : COLORS.textMuted}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.readableDate, !value && styles.placeholderText]}>
            {value ? formatReadableDate(value) : placeholder}
          </Text>
        </View>

        <View style={styles.actionsGroup}>
          {allowClear && !!value && (
            <TouchableOpacity
              style={styles.clearChip}
              activeOpacity={0.7}
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={16}
                color={COLORS.textMuted}
              />
              <Text style={styles.clearChipText}>Clear</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionChip}>
            <MaterialCommunityIcons
              name="calendar-edit"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.actionChipText}>
              {value ? 'Change' : 'Set Date'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === 'android' ? 'default' : 'spinner'}
          maximumDate={maxDate || undefined}
          minimumDate={minDate || undefined}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
          onNeutralButtonPress={handleNeutralButtonPress}
          accentColor={COLORS.primary}
          themeVariant={isDark ? 'dark' : 'light'}
        />
      )}
    </View>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    ...SHADOWS.card,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  readableDate: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? COLORS.surfaceSubtle : '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  clearChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? COLORS.surfaceSubtle : COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  actionChipText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
});
