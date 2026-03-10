import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "../../types/navigation";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<SettingsStackParamList, "PrivacyPolicy">;

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={palette.text} size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>Pol&#xED;tica de Privacidad</Text>
        <Text style={styles.lastUpdated}>
          &#xDA;ltima actualizaci&#xF3;n: 1 de enero de 2025
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            1. Informaci&#xF3;n que recopilamos
          </Text>
          <Text style={styles.body}>
            Recopilamos la informaci&#xF3;n que nos proporcionas al registrarte
            en Solennix, incluyendo tu nombre, correo electr&#xF3;nico y datos
            de tu negocio. Tambi&#xE9;n recopilamos informaci&#xF3;n sobre el
            uso de la aplicaci&#xF3;n para mejorar nuestros servicios.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. C&#xF3;mo usamos tu informaci&#xF3;n
          </Text>
          <Text style={styles.body}>
            Utilizamos tu informaci&#xF3;n para:{"\n\n"}
            &#x2022; Proporcionar y mejorar los servicios de Solennix{"\n"}
            &#x2022; Gestionar tu cuenta y suscripci&#xF3;n{"\n"}
            &#x2022; Enviarte comunicaciones sobre el servicio{"\n"}
            &#x2022; Procesar pagos a trav&#xE9;s de proveedores seguros{"\n"}
            &#x2022; Cumplir con obligaciones legales
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Almacenamiento y seguridad</Text>
          <Text style={styles.body}>
            Tus datos se almacenan en servidores seguros. Implementamos medidas
            t&#xE9;cnicas y organizativas apropiadas para proteger tu
            informaci&#xF3;n contra acceso no autorizado, alteraci&#xF3;n,
            divulgaci&#xF3;n o destrucci&#xF3;n.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Compartir informaci&#xF3;n</Text>
          <Text style={styles.body}>
            No vendemos, intercambiamos ni transferimos tu informaci&#xF3;n
            personal a terceros sin tu consentimiento, excepto cuando sea
            necesario para proporcionar el servicio (procesadores de pago,
            proveedores de infraestructura) o cuando lo exija la ley.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Tus derechos</Text>
          <Text style={styles.body}>
            Tienes derecho a:{"\n\n"}
            &#x2022; Acceder a tu informaci&#xF3;n personal{"\n"}
            &#x2022; Corregir datos inexactos{"\n"}
            &#x2022; Solicitar la eliminaci&#xF3;n de tu cuenta y datos{"\n"}
            &#x2022; Exportar tus datos{"\n\n"}
            Para ejercer estos derechos, cont&#xE1;ctanos en hola@creapolis.dev
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            6. Cookies y tecnolog&#xED;as similares
          </Text>
          <Text style={styles.body}>
            La aplicaci&#xF3;n utiliza almacenamiento local seguro para mantener
            tu sesi&#xF3;n iniciada y preferencias. No utilizamos cookies de
            rastreo con fines publicitarios.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            7. Cambios a esta pol&#xED;tica
          </Text>
          <Text style={styles.body}>
            Podemos actualizar esta Pol&#xED;tica de Privacidad
            peri&#xF3;dicamente. Te notificaremos sobre cambios significativos a
            trav&#xE9;s de la aplicaci&#xF3;n o por correo electr&#xF3;nico.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Contacto</Text>
          <Text style={styles.body}>
            Si tienes preguntas sobre esta pol&#xED;tica, cont&#xE1;ctanos:
            {"\n\n"}
            Creapolis.Dev{"\n"}
            hola@creapolis.dev{"\n"}
            https://www.creapolis.dev
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.surfaceGrouped,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    contentTablet: {
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
    },
    backButton: {
      alignSelf: "flex-start",
      padding: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.title1,
      color: palette.text,
      fontWeight: "700",
      marginBottom: spacing.xs,
    },
    lastUpdated: {
      ...typography.caption,
      color: palette.textSecondary,
      marginBottom: spacing.xl,
    },
    section: {
      backgroundColor: palette.card,
      borderRadius: spacing.borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    sectionTitle: {
      ...typography.h3,
      color: palette.text,
      fontWeight: "600",
      marginBottom: spacing.sm,
    },
    body: {
      ...typography.body,
      color: palette.textSecondary,
      lineHeight: 24,
    },
  });
