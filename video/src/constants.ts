export const COLORS = {
  primary: '#C4A265',
  primaryDark: '#B8965A',
  primaryLight: '#F5F0E8',
  accent: '#1B2A4A',
  bg: '#F5F4F1',
  surface: '#FAF9F7',
  surfaceAlt: '#F0EFEC',
  card: '#ffffff',
  text: '#1A1A1A',
  textSecondary: '#7A7670',
  textTertiary: '#A8A29E',
  border: '#E6E3DD',
  borderStrong: '#D4D0C8',
  success: '#34c759',
  error: '#ff3b30',
  white: '#ffffff',
} as const;

export const PREMIUM_GRADIENT = 'linear-gradient(135deg, #C4A265 0%, #D4B87A 100%)';

export const FPS = 30;
export const DURATION_FRAMES = 1060; // ~35 seconds

// Scene durations (raw frames before transition overlap)
export const SCENE_FRAMES = {
  intro: 130,
  navigation: 140,
  clientList: 120,
  formFill: 500,
  save: 120,
  outro: 100,
} as const;

export const TRANSITION_FRAMES = 10;

// Navigation items matching the real app sidebar
export const NAV_ITEMS = [
  { name: 'Dashboard', icon: 'grid' },
  { name: 'Calendario', icon: 'calendar' },
  { name: 'Cotización', icon: 'calculator' },
  { name: 'Cotización Rápida', icon: 'zap' },
  { name: 'Clientes', icon: 'users' },
  { name: 'Productos', icon: 'package' },
  { name: 'Inventario', icon: 'boxes' },
  { name: 'Configuración', icon: 'settings' },
] as const;
