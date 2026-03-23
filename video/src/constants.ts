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

// ── Social Media Brand Colors ──
export const SOCIAL_COLORS = {
  navy: '#1B2A4A',
  navyLight: '#2A3A5A',
  navyDark: '#0F1A2E',
  gold: '#C4A265',
  goldLight: '#D4B87A',
  goldDark: '#B8965A',
  cream: '#F5F0E8',
  creamWarm: '#FAF6F0',
  textMuted: '#6B7B8D',
  white: '#FFFFFF',
} as const;

export const SOCIAL_NAVY_GRADIENT = 'linear-gradient(135deg, #1B2A4A 0%, #0F1A2E 100%)';
export const SOCIAL_GOLD_GRADIENT = 'linear-gradient(135deg, #C4A265 0%, #D4B87A 100%)';

// ── Social Media Formats ──
export const SOCIAL_FORMATS = {
  REEL: { width: 1080, height: 1920 },  // 9:16 — Instagram Reels, TikTok, Stories
  FEED: { width: 1080, height: 1080 },  // 1:1  — Instagram Feed, Facebook
} as const;

export const SOCIAL_FPS = 30;

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

// Cotización tutorial: longer duration for multi-step form, no list scene
// (clicking Cotización goes directly to the form)
export const COTIZACION_DURATION_FRAMES = 1300; // ~43 seconds
export const COTIZACION_SCENE_FRAMES = {
  intro: 120,
  navigation: 130,
  // NO list scene — sidebar click goes directly to form
  formFill: 900,   // 3 key steps: General Info → Products → Financials
  save: 110,
  outro: 90,
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
