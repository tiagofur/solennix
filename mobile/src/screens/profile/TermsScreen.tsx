import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

type Props = NativeStackScreenProps<SettingsStackParamList, "Terms">;

export default function TermsScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={palette.text} size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>T&#xE9;rminos y Condiciones</Text>
        <Text style={styles.lastUpdated}>&#xDA;ltima actualizaci&#xF3;n: 1 de enero de 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Uso del servicio</Text>
          <Text style={styles.body}>
            Al usar Solennix, aceptas estos t&#xE9;rminos. Solennix es una plataforma
            SaaS para organizadores de eventos. Te otorgamos una licencia limitada,
            no exclusiva y no transferible para usar el servicio seg&#xFA;n tu plan de
            suscripci&#xF3;n activo.{"\n\n"}
            Te comprometes a:{"\n\n"}
            &#x2022; Proporcionar informaci&#xF3;n veraz al registrarte{"\n"}
            &#x2022; Mantener la confidencialidad de tu cuenta{"\n"}
            &#x2022; No usar el servicio para actividades ilegales{"\n"}
            &#x2022; No intentar acceder a datos de otros usuarios
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Suscripci&#xF3;n y pagos</Text>
          <Text style={styles.body}>
            Solennix ofrece planes de suscripci&#xF3;n mensual. Los cobros se realizan
            a trav&#xE9;s de la App Store de Apple o Google Play, seg&#xFA;n corresponda.{"\n\n"}
            &#x2022; El plan B&#xE1;sico es gratuito con funcionalidades limitadas{"\n"}
            &#x2022; El plan Pro incluye todas las funcionalidades sin restricciones{"\n"}
            &#x2022; Los precios pueden variar seg&#xFA;n tu regi&#xF3;n{"\n"}
            &#x2022; Las suscripciones se renuevan autom&#xE1;ticamente salvo cancelaci&#xF3;n
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Cancelaci&#xF3;n</Text>
          <Text style={styles.body}>
            Puedes cancelar tu suscripci&#xF3;n en cualquier momento desde la configuraci&#xF3;n
            de tu cuenta en la App Store o Google Play. La cancelaci&#xF3;n ser&#xE1; efectiva
            al final del per&#xED;odo de facturaci&#xF3;n actual.{"\n\n"}
            Al cancelar:{"\n\n"}
            &#x2022; Mantendr&#xE1;s acceso hasta el final del per&#xED;odo pagado{"\n"}
            &#x2022; No se realizan reembolsos proporcionales{"\n"}
            &#x2022; Tus datos se conservan por 30 d&#xED;as adicionales{"\n"}
            &#x2022; Puedes exportar tus datos antes de eliminar la cuenta
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Propiedad intelectual</Text>
          <Text style={styles.body}>
            Solennix y su contenido son propiedad de Creapolis.Dev. Los datos que
            introduces en la aplicaci&#xF3;n (clientes, eventos, productos) son de tu
            propiedad. Nos otorgas una licencia para almacenarlos y procesarlos
            &#xFA;nicamente con el fin de prestarte el servicio.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Disponibilidad del servicio</Text>
          <Text style={styles.body}>
            Nos esforzamos por mantener Solennix disponible 24/7, pero no garantizamos
            disponibilidad ininterrumpida. Podemos realizar mantenimientos programados
            con previo aviso. No somos responsables por interrupciones causadas por
            factores externos.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Limitaci&#xF3;n de responsabilidad</Text>
          <Text style={styles.body}>
            Solennix se proporciona "tal cual". En la m&#xE1;xima medida permitida por
            la ley aplicable:{"\n\n"}
            &#x2022; No garantizamos que el servicio sea libre de errores{"\n"}
            &#x2022; No somos responsables de p&#xE9;rdidas de datos por causas ajenas a nosotros{"\n"}
            &#x2022; Nuestra responsabilidad total no superar&#xE1; el monto pagado en los
            &#xFA;ltimos 3 meses de servicio{"\n"}
            &#x2022; No somos responsables de da&#xF1;os indirectos o consecuentes
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Modificaciones</Text>
          <Text style={styles.body}>
            Nos reservamos el derecho de modificar estos t&#xE9;rminos. Te notificaremos
            con al menos 15 d&#xED;as de anticipaci&#xF3;n sobre cambios materiales.
            El uso continuado del servicio tras los cambios implica aceptaci&#xF3;n.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Ley aplicable</Text>
          <Text style={styles.body}>
            Estos t&#xE9;rminos se rigen por las leyes de M&#xE9;xico. Cualquier disputa
            se resolver&#xE1; en los tribunales competentes de la Ciudad de M&#xE9;xico.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Contacto</Text>
          <Text style={styles.body}>
            Para cualquier consulta sobre estos t&#xE9;rminos:{"\n\n"}
            Creapolis.Dev{"\n"}
            hola@creapolis.dev{"\n"}
            https://www.creapolis.dev
          </Text>
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
