
const colors = {
  // Backgrounds
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F7EE',

  // Borders
  border: '#E5E7EB',
  borderLight: '#DCE8D8',

  // Brand colors
  primary: '#116C0B',
  primaryDark: '#02480B',
  primaryLight: '#81C238',
  primaryGlow: 'rgba(129, 194, 56, 0.22)',
  primaryGlowSoft: 'rgba(34, 197, 94, 0.14)',

  // Supporting green accents
  secondary: '#81C238',
  secondaryLight: '#A3D977',
  accent: '#15803D',

  // Text
  textPrimary: '#012711',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Status colors
  success: '#15803D',
  error: '#DC2626',
  warning: '#81C238',
  info: '#2563EB',

  // Interactive states
  primaryPressed: '#02480B',
  secondaryPressed: '#02480B',
  disabled: '#D1D5DB',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.45)',
} as const;

export default colors;
