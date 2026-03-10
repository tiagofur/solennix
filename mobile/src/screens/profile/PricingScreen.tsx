import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Star, Zap, RefreshCw } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import {
  revenueCatService,
  OfferingInfo,
} from "../../services/revenueCatService";
import { useToast } from "../../hooks/useToast";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

const featuresFree = [
  "Hasta 3 eventos por mes",
  "Hasta 50 clientes registrados",
  "Hasta 20 ítems en catálogo",
  "Gestión básica de clientes",
  "Calendario de eventos",
  "Generación de PDFs (cotizaciones, contratos y más)",
];

const featuresPro = [
  "Eventos ilimitados",
  "Clientes y catálogo ilimitados",
  "Control de pagos e ingresos",
  "Reportes y analíticas avanzadas",
  "Soporte prioritario",
];

export default function PricingScreen() {
  const { user, checkAuth } = useAuth();
  const { addToast } = useToast();
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const [offerings, setOfferings] = useState<OfferingInfo[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  const isPremium = user?.plan === "pro" || user?.plan === "premium";

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const result = await revenueCatService.getOfferings();
      setOfferings(result);
    } catch (error) {
      console.warn("Failed to load offerings:", error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handleUpgrade = async () => {
    if (!offerings.length) return;

    const offering = offerings[0];
    setPurchasing(true);

    try {
      await revenueCatService.purchasePackage(offering.rcPackage);
      await checkAuth();
      addToast("Plan actualizado a Premium", "success");
    } catch (error) {
      if (revenueCatService.isUserCancelled(error)) {
        // User cancelled — no toast needed
        return;
      }
      console.error("Purchase failed:", error);
      addToast("Error al procesar la compra", "error");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { isPro } = await revenueCatService.restorePurchases();
      await checkAuth();

      if (isPro) {
        addToast("Compras restauradas exitosamente", "success");
      } else {
        addToast("No se encontraron compras anteriores", "info");
      }
    } catch (error) {
      console.error("Restore failed:", error);
      addToast("Error al restaurar compras", "error");
    } finally {
      setRestoring(false);
    }
  };

  const proPrice = offerings.length > 0 ? offerings[0].price : "$99.00 MXN";
  const proPeriod = offerings.length > 0 ? offerings[0].period : "mensual";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Planes y Precios</Text>
          <Text style={styles.subtitle}>
            Elige el plan que se adapte al crecimiento de tu negocio
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {/* Basic Plan */}
          <View style={styles.planCard}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                {isPremium ? "Básico" : "Actual"}
              </Text>
            </View>
            <Text style={styles.planName}>Básico</Text>
            <View style={styles.planPrice}>
              <Text style={styles.priceAmount}>$0</Text>
              <Text style={styles.pricePeriod}>/mes</Text>
            </View>
            <Text style={styles.planDescription}>
              Perfecto para empezar a organizar tus eventos
            </Text>

            <View style={styles.featuresList}>
              {featuresFree.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Check color={palette.success} size={18} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pro Plan */}
          <View style={[styles.planCard, styles.planCardPro]}>
            <View style={[styles.planBadge, styles.planBadgePro]}>
              <Zap color={palette.text} size={12} />
              <Text style={styles.planBadgeTextPro}>Más Popular</Text>
            </View>
            <Text style={[styles.planName, styles.planNamePro]}>Premium</Text>
            <View style={styles.planPrice}>
              {loadingOfferings ? (
                <ActivityIndicator color={palette.textInverse} size="small" />
              ) : (
                <>
                  <Text style={[styles.priceAmount, styles.priceAmountPro]}>
                    {proPrice}
                  </Text>
                  <Text style={[styles.pricePeriod, styles.pricePeriodPro]}>
                    /{proPeriod}
                  </Text>
                </>
              )}
            </View>
            <Text style={[styles.planDescription, styles.planDescriptionPro]}>
              Para profesionales que necesitan más capacidad
            </Text>

            <View style={styles.featuresList}>
              {featuresPro.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Check color={palette.textInverse} size={18} />
                  <Text style={[styles.featureText, styles.featureTextPro]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {isPremium ? (
              <View style={styles.currentPlanBadge}>
                <Star color={palette.warning} size={16} />
                <Text style={styles.currentPlanText}>Ya tienes Premium</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
                disabled={purchasing || loadingOfferings}
                activeOpacity={0.8}
              >
                {purchasing ? (
                  <ActivityIndicator color={palette.text} />
                ) : (
                  <Text style={styles.upgradeButtonText}>
                    Actualizar a Premium
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Restore Purchases */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
            activeOpacity={0.7}
          >
            {restoring ? (
              <ActivityIndicator color={palette.textTertiary} size="small" />
            ) : (
              <>
                <RefreshCw color={palette.textTertiary} size={14} />
                <Text style={styles.restoreButtonText}>Restaurar Compras</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Debug button (dev only) */}
        {__DEV__ && !isPremium && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={handleUpgrade}
            disabled={purchasing}
          >
            <Text style={styles.debugButtonText}>
              Modo Debug: Actualizar a Premium
            </Text>
          </TouchableOpacity>
        )}

        {/* FAQ */}
        <View style={styles.faq}>
          <Text style={styles.faqTitle}>Preguntas Frecuentes</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              ¿Puedo cancelar en cualquier momento?
            </Text>
            <Text style={styles.faqAnswer}>
              Sí, puedes cancelar tu plan Premium en cualquier momento. Seguirás
              teniendo acceso hasta el final del período de facturación.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              ¿Qué métodos de pago aceptan?
            </Text>
            <Text style={styles.faqAnswer}>
              En la app móvil se procesan los pagos a través de la App Store
              (iOS) o Google Play (Android).
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              ¿Qué pasa si excedo los límites del plan Básico?
            </Text>
            <Text style={styles.faqAnswer}>
              Te notificaremos cuando te acerques a los límites. Puedes
              actualizar a Premium en cualquier momento para obtener límites
              ilimitados.
            </Text>
          </View>
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
    header: {
      alignItems: "center",
      paddingVertical: spacing.xl,
    },
    title: {
      ...typography.title1,
      color: palette.text,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      color: palette.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    plansContainer: {
      gap: spacing.lg,
    },
    planCard: {
      backgroundColor: palette.card,
      borderRadius: spacing.borderRadius.xl,
      padding: spacing.lg,
      position: "relative",
      ...shadows.sm,
    },
    planCardPro: {
      backgroundColor: palette.primary,
      ...shadows.md,
    },
    planBadge: {
      position: "absolute",
      top: -12,
      left: spacing.lg,
      backgroundColor: palette.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: spacing.borderRadius.full,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      ...shadows.sm,
    },
    planBadgePro: {
      backgroundColor: palette.warning,
    },
    planBadgeText: {
      ...typography.caption1,
      color: palette.textSecondary,
      fontWeight: "600",
    },
    planBadgeTextPro: {
      ...typography.caption1,
      color: palette.text,
      fontWeight: "600",
    },
    planName: {
      ...typography.title2,
      color: palette.text,
      marginTop: spacing.sm,
    },
    planNamePro: {
      color: palette.textInverse,
    },
    planPrice: {
      flexDirection: "row",
      alignItems: "baseline",
      marginTop: spacing.sm,
    },
    priceAmount: {
      ...typography.title1,
      color: palette.text,
    },
    priceAmountPro: {
      color: palette.textInverse,
    },
    pricePeriod: {
      ...typography.body,
      color: palette.textSecondary,
      marginLeft: spacing.xs,
    },
    pricePeriodPro: {
      color: palette.textInverse,
      opacity: 0.8,
    },
    planDescription: {
      ...typography.body,
      color: palette.textSecondary,
      marginTop: spacing.xs,
    },
    planDescriptionPro: {
      color: palette.textInverse,
      opacity: 0.8,
    },
    featuresList: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    featureText: {
      ...typography.body,
      color: palette.text,
      flex: 1,
    },
    featureTextPro: {
      color: palette.textInverse,
    },
    upgradeButton: {
      backgroundColor: palette.warning,
      borderRadius: spacing.borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginTop: spacing.lg,
    },
    upgradeButtonText: {
      ...typography.button,
      color: palette.text,
    },
    currentPlanBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      backgroundColor: palette.primaryLight,
      borderRadius: spacing.borderRadius.lg,
      paddingVertical: spacing.md,
      marginTop: spacing.lg,
    },
    currentPlanText: {
      ...typography.button,
      color: palette.textInverse,
    },
    restoreButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.lg,
    },
    restoreButtonText: {
      ...typography.subheadline,
      color: palette.textTertiary,
    },
    debugButton: {
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    debugButtonText: {
      ...typography.caption1,
      color: palette.textTertiary,
    },
    faq: {
      marginTop: spacing.xl,
    },
    faqTitle: {
      ...typography.headline,
      color: palette.text,
      marginBottom: spacing.md,
    },
    faqItem: {
      marginBottom: spacing.md,
    },
    faqQuestion: {
      ...typography.subheadline,
      fontWeight: "600",
      color: palette.text,
    },
    faqAnswer: {
      ...typography.body,
      color: palette.textSecondary,
      marginTop: spacing.xs,
    },
  });
