import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { ChevronLeft, Code2, Heart, Globe, Mail, FileText, Shield } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "../../types/navigation";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<SettingsStackParamList, "About">;

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function AboutScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const openURL = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={palette.text} size={24} />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Code2 color={palette.primary} size={64} />
          </View>
          <Text style={styles.appName}>EventosApp</Text>
          <Text style={styles.version}>Versi&#xF3;n {APP_VERSION}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Desarrollado por</Text>
          <Text style={styles.developer}>Creapolis.Dev</Text>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openURL("https://www.creapolis.dev")}
          >
            <Globe color={palette.primary} size={20} />
            <Text style={styles.linkText}>www.creapolis.dev</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openURL("mailto:hola@creapolis.dev")}
          >
            <Mail color={palette.primary} size={20} />
            <Text style={styles.linkText}>hola@creapolis.dev</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openURL("https://www.creapolis.dev/terms")}
          >
            <FileText color={palette.primary} size={20} />
            <Text style={styles.linkText}>T&#xE9;rminos y Condiciones</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openURL("https://www.creapolis.dev/privacy")}
          >
            <Shield color={palette.primary} size={20} />
            <Text style={styles.linkText}>Pol&#xED;tica de Privacidad</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sobre la app</Text>
          <Text style={styles.description}>
            EventosApp es una aplicaci&#xF3;n SaaS dise&#xF1;ada para organizadores de eventos,
            caterers y banquetes. Gestiona clientes, eventos, cat&#xE1;logo de productos,
            inventario, cotizaciones y pagos en un solo lugar.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerText}>
              Hecho con <Heart color={palette.error} size={14} fill={palette.error} /> por el equipo de Creapolis.Dev
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    ...shadows.md,
  },
  appName: {
    ...typography.title1,
    color: palette.text,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  version: {
    ...typography.body,
    color: palette.textSecondary,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  developer: {
    ...typography.h2,
    color: palette.text,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: palette.separator,
    marginVertical: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linkText: {
    ...typography.body,
    color: palette.primary,
  },
  description: {
    ...typography.body,
    color: palette.textSecondary,
    lineHeight: 24,
  },
  footer: {
    marginTop: spacing.lg,
  },
  footerContent: {
    alignItems: "center",
  },
  footerText: {
    ...typography.caption,
    color: palette.textMuted,
    textAlign: "center",
  },
});
