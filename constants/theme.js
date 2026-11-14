export const LIGHT_COLORS = {
  primary: '#7C3AED',       // Purple
  primaryDark: '#6D28D9',
  primaryLight: '#8B5CF6',
  secondary: '#EDE9FE',     // Lavender
  secondaryDark: '#DDD6FE',
  background: '#F8FAFC',    // Off-white
  surface: '#FFFFFF',       // Card background
  surfaceSubtle: '#F1F5F9',
  text: '#0F172A',          // Dark navy
  textSecondary: '#64748B',  // Slate gray
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  accent: '#EC4899',
  white: '#FFFFFF',
};

export const DARK_COLORS = {
  primary: '#A78BFA',       // High-contrast readable violet in dark mode
  primaryDark: '#8B5CF6',
  primaryLight: '#C4B5FD',
  secondary: '#2E1065',     // Deep lavender dark background
  secondaryDark: '#3B0764',
  background: '#0B0F19',    // Deep slate/navy
  surface: '#1E293B',       // Elevated dark card surface
  surfaceSubtle: '#334155',
  text: '#F8FAFC',          // Crisp light primary text
  textSecondary: '#94A3B8',  // Muted readable text
  textMuted: '#64748B',
  border: '#334155',
  borderLight: '#1E293B',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  accent: '#F472B6',
  white: '#FFFFFF',
};

// Default export maintains full backwards compatibility
export const COLORS = LIGHT_COLORS;

export function getThemeColors(isDark) {
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
};

export default COLORS;

