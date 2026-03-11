// Setup file for Jest mobile tests
global.__ExpoImportMetaRegistry = {
  get: () => ({}),
};

// Robust Reanimated Mock
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = require('react-native');
  
  const REA = {
    default: {
      call: () => {},
      createAnimatedComponent: (c) => c,
    },
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: (cb) => cb() || {},
    withRepeat: (v) => v,
    withTiming: (v) => v,
    withSpring: (v) => v,
    interpolate: () => 0,
    Extrapolate: { CLAMP: 'clamp' },
    createAnimatedComponent: (c) => c,
    View: View,
    Text: Text,
    Image: Image,
    ScrollView: ScrollView,
    FadeIn: { delay: () => ({ duration: () => ({ springify: () => {} }) }) },
    FadeOut: { delay: () => ({ duration: () => ({ springify: () => {} }) }) },
    FadeInDown: { delay: () => ({ duration: () => ({ springify: () => {} }) }) },
    Layout: { springify: () => {} },
    runOnJS: (fn) => fn,
  };
  
  return REA;
});

// Gesture Handler Mock
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
  Swipeable: ({ children }) => children,
  RectButton: ({ children }) => children,
  PanGestureHandler: ({ children }) => children,
  State: {},
  Directions: {},
}));

// Linking Mocks - Multiple paths to be safe
const mockLinking = {
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
};

jest.mock('react-native/Libraries/Linking/Linking', () => mockLinking);

// SafeArea Mock
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
