import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Image, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS } from '../constants/theme';
import { CATEGORIES } from '../constants/categories';

export default function ProjectImage({ uri, category, style, iconSize = 36 }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => getStyles(COLORS, isDark), [COLORS, isDark]);
  const [imageError, setImageError] = useState(false);

  // Reset error state whenever uri changes
  useEffect(() => {
    setImageError(false);
  }, [uri]);

  // Match category details for elegant placeholder
  const catObj = CATEGORIES.find(
    (c) => c.name.toLowerCase() === (category || '').toLowerCase()
  ) || {
    icon: 'palette-swatch',
    color: COLORS.primary,
    bgColor: COLORS.secondary,
  };

  const hasValidUri = uri && typeof uri === 'string' && !imageError;

  if (hasValidUri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, style]}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
    );
  }

  const placeholderBg = isDark ? `${catObj.color}25` : catObj.bgColor;

  // Graceful artistic placeholder
  return (
    <View style={[styles.placeholder, { backgroundColor: placeholderBg }, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: COLORS.surface }]}>
        <MaterialCommunityIcons name={catObj.icon} size={iconSize} color={catObj.color} />
      </View>
      <Text style={[styles.placeholderText, { color: catObj.color }]} numberOfLines={1}>
        {category || 'Design'}
      </Text>
    </View>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.borderLight,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
