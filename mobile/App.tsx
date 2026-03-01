import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "./src/contexts/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { ToastContainer } from "./src/components/shared";
import { setupGlobalErrorHandlers } from "./src/lib/errorHandler";
import { initSentry, wrapWithSentry } from "./src/lib/sentry";
import { ThemeProvider } from "./src/hooks/useTheme";

SplashScreen.preventAutoHideAsync();
initSentry();

function App() {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <AuthProvider>
              <RootNavigator />
              <ToastContainer />
              <StatusBar style="auto" />
            </AuthProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default wrapWithSentry(App);
