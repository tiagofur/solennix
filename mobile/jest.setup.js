// Setup file for Jest mobile tests
global.__ExpoImportMetaRegistry = {
  get: () => ({}),
};

// Simplified Reanimated Mock
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

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

