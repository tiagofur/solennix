import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { AlertTriangle, RotateCcw } from "lucide-react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useTheme } from "../hooks/useTheme";

interface Props {
  children: ReactNode;
  palette: typeof colors.light;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error("[ErrorBoundary]", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const { palette } = this.props;
      const styles = getStyles(palette);

      return (
        <View style={styles.container}>
          <AlertTriangle color={palette.error} size={64} />
          <Text style={styles.title}>Algo sali&#xF3; mal</Text>
          <Text style={styles.description}>
            Ocurri&#xF3; un error inesperado. Por favor, intenta de nuevo.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <RotateCcw color={palette.textInverse} size={18} />
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;

  return (
    <ErrorBoundaryInner palette={palette}>
      {children}
    </ErrorBoundaryInner>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: palette.background,
  },
  title: {
    ...typography.title1,
    color: palette.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },
  buttonText: {
    ...typography.button,
    color: palette.textInverse,
  },
});
