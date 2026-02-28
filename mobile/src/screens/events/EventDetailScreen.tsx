import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Users,
  Package,
  DollarSign,
  CreditCard,
  Clock,
  FileText,
  ShoppingCart,
  FileCheck,
  Receipt,
  Download,
  ChevronDown,
  Plus,
  X,
} from "lucide-react-native";
import { EventsStackParamList } from "../../types/navigation";
import { Event } from "../../types/entities";
import { eventService } from "../../services/eventService";
import { clientService } from "../../services/clientService";
import { paymentService } from "../../services/paymentService";
import { productService } from "../../services/productService";
import { useToast } from "../../hooks/useToast";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../lib/errorHandler";
import {
  generateBudgetPDF,
  generateContractPDF,
  generateShoppingListPDF,
  generatePaymentReportPDF,
  generateInvoicePDF,
} from "../../lib/pdfGenerator";
import { LoadingSpinner, ConfirmDialog, EmptyState } from "../../components/shared";
import { useStoreReview } from "../../hooks/useStoreReview";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<EventsStackParamList, "EventDetail">;

const STATUS_OPTIONS = [
  { key: "quoted", label: "Cotizado", color: colors.light.statusQuoted, bg: colors.light.statusQuotedBg, text: colors.light.statusQuoted },
  { key: "confirmed", label: "Confirmado", color: colors.light.statusConfirmed, bg: colors.light.statusConfirmedBg, text: colors.light.statusConfirmed },
  { key: "completed", label: "Completado", color: colors.light.statusCompleted, bg: colors.light.statusCompletedBg, text: colors.light.statusCompleted },
  { key: "cancelled", label: "Cancelado", color: colors.light.statusCancelled, bg: colors.light.statusCancelledBg, text: colors.light.statusCancelled },
];

const statusLabels: Record<string, string> = {
  quoted: "Cotizado",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export default function EventDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const addToast = useToast((s) => s.addToast);
  const { user } = useAuth();
  const { isBasicPlan } = usePlanLimits();
  const { trackPdfShared } = useStoreReview();

  const [event, setEvent] = useState<Event | null>(null);
  const [client, setClient] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments],
  );
  const remaining = useMemo(
    () => (event?.total_amount ?? 0) - totalPaid,
    [event?.total_amount, totalPaid],
  );
  const progress = useMemo(
    () => (event?.total_amount ? Math.min((totalPaid / event.total_amount) * 100, 100) : 0),
    [totalPaid, event?.total_amount],
  );
  const isFullyPaid = remaining <= 0.01;

  const loadData = useCallback(async () => {
    try {
      const eventData = await eventService.getById(id);
      setEvent(eventData);

      const [clientData, productsData, extrasData, paymentsData] = await Promise.all([
        clientService.getById(eventData.client_id),
        eventService.getProducts(id),
        eventService.getExtras(id),
        paymentService.getByEventIds([id]),
      ]);
      setClient(clientData);
      setProducts(productsData || []);
      setExtras(extrasData || []);
      setPayments(paymentsData || []);
    } catch (err) {
      logError("Error loading event detail", err);
      addToast("Error al cargar evento", "error");
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDelete = useCallback(async () => {
    try {
      await eventService.delete(id);
      addToast("Evento eliminado", "success");
      navigation.goBack();
    } catch (err) {
      logError("Error deleting event", err);
      addToast("Error al eliminar evento", "error");
    } finally {
      setShowDelete(false);
    }
  }, [id, addToast, navigation]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    try {
      await eventService.update(id, { status: newStatus as any });
      setEvent({ ...event!, status: newStatus as any });
      addToast("Estado actualizado", "success");
      setShowStatusModal(false);
    } catch (err) {
      logError("Error updating status", err);
      addToast("Error al actualizar estado", "error");
    }
  }, [id, event, addToast]);

  const handleAddPayment = useCallback(async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      addToast("Ingresa un monto válido", "error");
      return;
    }

    setSavingPayment(true);
    try {
      await paymentService.create({
        user_id: user?.id || "",
        event_id: id,
        amount: amount,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: paymentMethod,
        notes: paymentNotes || null,
      });

      // Auto-confirm quoted events when payment is registered
      if (amount > 0 && event?.status === "quoted") {
        await eventService.update(id, { status: "confirmed" as any });
        setEvent((prev) => prev ? { ...prev, status: "confirmed" as any } : prev);
        addToast("Pago registrado. Evento marcado como Confirmado.", "success");
      } else {
        addToast("Pago registrado", "success");
      }

      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
      loadData();
    } catch (err) {
      logError("Error adding payment", err);
      addToast("Error al registrar pago", "error");
    } finally {
      setSavingPayment(false);
    }
  }, [id, paymentAmount, paymentMethod, paymentNotes, event, addToast, loadData]);

  const handleDeletePayment = useCallback(async () => {
    if (!deletePaymentId) return;
    try {
      await paymentService.delete(deletePaymentId);
      addToast("Pago eliminado", "success");
      setDeletePaymentId(null);
      loadData();
    } catch (err) {
      logError("Error deleting payment", err);
      addToast("Error al eliminar pago", "error");
    }
  }, [deletePaymentId, addToast, loadData]);

  const handlePayRemaining = useCallback(() => {
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : "");
    setShowPaymentModal(true);
  }, [remaining]);

  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const handleGenerateQuote = useCallback(async () => {
    setShowActionsMenu(false);
    if (isBasicPlan) {
      addToast("La generación de PDFs es exclusiva del plan Pro.", "error");
      return;
    }
    try {
      setGeneratingPdf("quote");
      await generateBudgetPDF({ ...event!, client: client as any }, user, products, extras);
      trackPdfShared();
    } catch (err) {
      logError("Error generating quote PDF", err);
      addToast("Error al generar cotización", "error");
    } finally {
      setGeneratingPdf(null);
    }
  }, [event, client, user, products, extras, isBasicPlan, addToast]);

  const handleGenerateContract = useCallback(async () => {
    setShowActionsMenu(false);
    if (isBasicPlan) {
      addToast("La generación de PDFs es exclusiva del plan Pro.", "error");
      return;
    }
    try {
      setGeneratingPdf("contract");
      await generateContractPDF({ ...event!, client: client as any }, user);
      trackPdfShared();
    } catch (err) {
      logError("Error generating contract PDF", err);
      addToast("Error al generar contrato", "error");
    } finally {
      setGeneratingPdf(null);
    }
  }, [event, client, user, isBasicPlan, addToast]);

  const handleGenerateShoppingList = useCallback(async () => {
    setShowActionsMenu(false);
    if (isBasicPlan) {
      addToast("La generación de PDFs es exclusiva del plan Pro.", "error");
      return;
    }
    try {
      setGeneratingPdf("shopping");
      const productQuantities = new Map<string, number>();
      products.forEach((p: any) => {
        productQuantities.set(p.product_id, p.quantity || 0);
      });
      const productIds = Array.from(productQuantities.keys());
      const prodIngredients = productIds.length > 0
        ? await productService.getIngredientsForProducts(productIds)
        : [];
      const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
      (prodIngredients || []).forEach((ing: any) => {
        const key = ing.inventory_id;
        const qty = productQuantities.get(ing.product_id) || 0;
        if (!aggregated[key]) {
          aggregated[key] = { name: ing.ingredient_name || "Ingrediente", unit: ing.unit || "", quantity: 0 };
        }
        aggregated[key].quantity += (ing.quantity_required || 0) * qty;
      });
      await generateShoppingListPDF(event!, user, Object.values(aggregated));
      trackPdfShared();
    } catch (err) {
      logError("Error generating shopping list PDF", err);
      addToast("Error al generar lista de compras", "error");
    } finally {
      setGeneratingPdf(null);
    }
  }, [event, products, user, isBasicPlan, addToast]);

  const handleGeneratePaymentReport = useCallback(async () => {
    setShowActionsMenu(false);
    if (isBasicPlan) {
      addToast("La generación de PDFs es exclusiva del plan Pro.", "error");
      return;
    }
    try {
      setGeneratingPdf("payments");
      await generatePaymentReportPDF({ ...event!, client: client as any }, user, payments);
      trackPdfShared();
    } catch (err) {
      logError("Error generating payment report PDF", err);
      addToast("Error al generar reporte de pagos", "error");
    } finally {
      setGeneratingPdf(null);
    }
  }, [event, client, user, payments, isBasicPlan, addToast]);

  const handleGenerateInvoice = useCallback(async () => {
    setShowActionsMenu(false);
    if (isBasicPlan) {
      addToast("La generación de PDFs es exclusiva del plan Pro.", "error");
      return;
    }
    try {
      setGeneratingPdf("invoice");
      await generateInvoicePDF({ ...event!, client: client as any }, user, products, extras);
      trackPdfShared();
    } catch (err) {
      logError("Error generating invoice PDF", err);
      addToast("Error al generar factura", "error");
    } finally {
      setGeneratingPdf(null);
    }
  }, [event, client, user, products, extras, isBasicPlan, addToast]);

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  if (loading) return <LoadingSpinner />;
  if (!event) {
    return (
      <EmptyState
        title="Evento no encontrado"
        description="No se pudo cargar la información del evento."
      />
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.key === event.status) || STATUS_OPTIONS[0];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>
              {format(parseISO(event.event_date), "MMM", { locale: es }).toUpperCase()}
            </Text>
            <Text style={styles.dateDay}>
              {format(parseISO(event.event_date), "d")}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.eventType}>{event.service_type}</Text>
            <Text style={styles.clientName}>{client?.name}</Text>
            <TouchableOpacity 
              style={[styles.statusBadge, { backgroundColor: currentStatus.bg }]}
              onPress={() => setShowStatusModal(true)}
            >
              <Text style={[styles.statusText, { color: currentStatus.text }]}>
                {currentStatus.label}
              </Text>
              <ChevronDown size={14} color={currentStatus.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles</Text>
          
          <View style={styles.infoRow}>
            <Calendar color={colors.light.textMuted} size={18} />
            <Text style={styles.infoText}>
              {format(parseISO(event.event_date), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
            </Text>
          </View>
          
          {event.start_time && (
            <View style={styles.infoRow}>
              <Clock color={colors.light.textMuted} size={18} />
              <Text style={styles.infoText}>
                {event.start_time} - {event.end_time || "Por definir"}
              </Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Users color={colors.light.textMuted} size={18} />
            <Text style={styles.infoText}>{event.num_people} personas</Text>
          </View>
          
          {event.location && (
            <View style={styles.infoRow}>
              <MapPin color={colors.light.textMuted} size={18} />
              <Text style={styles.infoText}>
                {event.location}{event.city ? `, ${event.city}` : ""}
              </Text>
            </View>
          )}
        </View>

        {products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Productos</Text>
            
            {products.map((p: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{p.products?.name || "Producto"}</Text>
                  <Text style={styles.itemDetail}>
                    {p.quantity} x {formatCurrency(p.unit_price)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {formatCurrency(p.total_price || p.quantity * p.unit_price)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {extras.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extras</Text>
            
            {extras.map((e: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{e.description}</Text>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(e.price)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finanzas</Text>
          
          <View style={styles.totalCard}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(event.total_amount - event.tax_amount)}
              </Text>
            </View>
            {event.discount > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Descuento</Text>
                <Text style={[styles.totalValue, { color: colors.light.error }]}>
                  -{formatCurrency(event.discount)}
                </Text>
              </View>
            )}
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>IVA ({event.tax_rate}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(event.tax_amount)}</Text>
            </View>
            <View style={[styles.totalLine, styles.totalLineBold]}>
              <Text style={styles.totalLabelBold}>Total</Text>
              <Text style={styles.totalValueBold}>{formatCurrency(event.total_amount)}</Text>
            </View>
          </View>

          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Pagos y Saldo</Text>

            {/* Payment summary mini-cards */}
            <View style={styles.paymentSummary}>
              <View style={styles.paymentSummaryCard}>
                <Text style={styles.paymentSummaryLabel}>Total</Text>
                <Text style={styles.paymentSummaryValue}>
                  {formatCurrency(event.total_amount)}
                </Text>
              </View>
              <View style={[styles.paymentSummaryCard, { backgroundColor: colors.light.successBg }]}>
                <Text style={styles.paymentSummaryLabel}>Pagado</Text>
                <Text style={[styles.paymentSummaryValue, { color: colors.light.success }]}>
                  {formatCurrency(totalPaid)}
                </Text>
              </View>
              <View style={[styles.paymentSummaryCard, { backgroundColor: remaining > 0 ? colors.light.errorBg : colors.light.successBg }]}>
                <Text style={styles.paymentSummaryLabel}>Saldo</Text>
                <Text style={[styles.paymentSummaryValue, { color: remaining > 0 ? colors.light.error : colors.light.success }]}>
                  {formatCurrency(Math.abs(remaining))}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: isFullyPaid ? colors.light.success : colors.light.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}% pagado</Text>
            </View>

            {/* Payments list */}
            {payments.length > 0 && (
              <View style={styles.paymentsList}>
                {payments.map((p: any, index: number) => (
                  <View key={index} style={styles.paymentRow}>
                    <View style={styles.paymentInfo}>
                      <CreditCard color={colors.light.textMuted} size={14} />
                      <View>
                        <Text style={styles.paymentDate}>
                          {format(parseISO(p.payment_date), "d MMM", { locale: es })}
                          {" · "}
                          {p.payment_method === "efectivo" ? "Efectivo" :
                           p.payment_method === "transferencia" ? "Transferencia" :
                           p.payment_method === "tarjeta" ? "Tarjeta" :
                           p.payment_method === "cheque" ? "Cheque" :
                           p.payment_method || ""}
                        </Text>
                        {p.notes ? (
                          <Text style={styles.paymentNoteText}>{p.notes}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.paymentRowRight}>
                      <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                      <TouchableOpacity
                        onPress={() => setDeletePaymentId(p.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 color={colors.light.error} size={14} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {event.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.notesText}>{event.notes}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryActionBtn]}
            onPress={() => setShowPaymentModal(true)}
          >
            <Plus color={colors.light.textInverse} size={18} />
            <Text style={styles.primaryActionText}>
              Registrar Pago
            </Text>
          </TouchableOpacity>
          {remaining > 0.01 && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.payRemainingBtn]}
              onPress={handlePayRemaining}
            >
              <DollarSign color="#fff" size={18} />
              <Text style={styles.primaryActionText}>
                Liquidar ({formatCurrency(remaining)})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowActionsMenu(true)}
          >
            <Download color={colors.light.primary} size={18} />
            <Text style={[styles.actionText, { color: colors.light.primary }]}>
              Generar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("EventForm", { id })}
          >
            <Edit2 color={colors.light.primary} size={18} />
            <Text style={[styles.actionText, { color: colors.light.primary }]}>
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => setShowDelete(true)}
          >
            <Trash2 color={colors.light.error} size={18} />
            <Text style={[styles.actionText, { color: colors.light.error }]}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Estado</Text>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status.key}
                style={[
                  styles.modalOption,
                  event.status === status.key && styles.modalOptionActive,
                ]}
                onPress={() => handleStatusChange(status.key)}
              >
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={styles.modalOptionText}>{status.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Pago</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X color={colors.light.textMuted} size={24} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Monto</Text>
            <TextInput
              style={styles.modalInput}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Método de Pago</Text>
            <View style={styles.methodButtons}>
              {["efectivo", "transferencia", "tarjeta", "cheque"].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodButton,
                    paymentMethod === method && styles.methodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={[
                    styles.methodButtonText,
                    paymentMethod === method && styles.methodButtonTextActive,
                  ]}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notas / Referencia</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60, textAlignVertical: "top" }]}
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              placeholder="Referencia, folio, etc."
              placeholderTextColor={colors.light.textTertiary}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalTotal}>
              <Text style={styles.modalTotalLabel}>Restante:</Text>
              <Text style={styles.modalTotalValue}>{formatCurrency(remaining)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.modalSaveButton, savingPayment && styles.modalSaveButtonDisabled]}
              onPress={handleAddPayment}
              disabled={savingPayment}
            >
              <Text style={styles.modalSaveButtonText}>Registrar Pago</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showActionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionsMenu(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generar Documentos</Text>

            {generatingPdf ? (
              <View style={styles.menuLoadingContainer}>
                <ActivityIndicator color={colors.light.primary} size="large" />
                <Text style={styles.menuLoadingText}>Generando PDF...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.menuOption} onPress={handleGenerateQuote}>
                  <FileText color={colors.light.primary} size={24} />
                  <View style={styles.menuOptionInfo}>
                    <Text style={styles.menuOptionTitle}>Cotización</Text>
                    <Text style={styles.menuOptionDesc}>Genera PDF de la cotización</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuOption} onPress={handleGenerateContract}>
                  <FileCheck color={colors.light.primary} size={24} />
                  <View style={styles.menuOptionInfo}>
                    <Text style={styles.menuOptionTitle}>Contrato</Text>
                    <Text style={styles.menuOptionDesc}>Genera PDF del contrato</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuOption} onPress={handleGenerateShoppingList}>
                  <ShoppingCart color={colors.light.primary} size={24} />
                  <View style={styles.menuOptionInfo}>
                    <Text style={styles.menuOptionTitle}>Lista de Compras</Text>
                    <Text style={styles.menuOptionDesc}>Genera lista de ingredientes</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuOption} onPress={handleGeneratePaymentReport}>
                  <DollarSign color={colors.light.primary} size={24} />
                  <View style={styles.menuOptionInfo}>
                    <Text style={styles.menuOptionTitle}>Reporte de Pagos</Text>
                    <Text style={styles.menuOptionDesc}>Resumen de pagos realizados</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuOption} onPress={handleGenerateInvoice}>
                  <Receipt color={colors.light.primary} size={24} />
                  <View style={styles.menuOptionInfo}>
                    <Text style={styles.menuOptionTitle}>Factura</Text>
                    <Text style={styles.menuOptionDesc}>Genera factura simplificada</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowActionsMenu(false)}
            >
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={!!deletePaymentId}
        title="Eliminar Pago"
        description="¿Eliminar este pago? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleDeletePayment}
        onCancel={() => setDeletePaymentId(null)}
      />

      <ConfirmDialog
        visible={showDelete}
        title="Eliminar evento"
        description={`¿Eliminar el evento del ${format(parseISO(event.event_date), "d/MM/yyyy")}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.surfaceGrouped,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  dateBox: {
    width: 56,
    height: 56,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.light.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.light.primary,
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.light.primary,
    lineHeight: 24,
  },
  headerInfo: {
    flex: 1,
  },
  eventType: {
    ...typography.h3,
    color: colors.light.text,
  },
  clientName: {
    ...typography.body,
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  section: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  infoText: {
    ...typography.body,
    color: colors.light.text,
    flex: 1,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.label,
    color: colors.light.text,
  },
  itemDetail: {
    ...typography.caption,
    color: colors.light.textMuted,
  },
  itemTotal: {
    ...typography.label,
    color: colors.light.text,
  },
  totalCard: {
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  totalLineBold: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    ...typography.body,
    color: colors.light.textSecondary,
  },
  totalValue: {
    ...typography.label,
    color: colors.light.text,
  },
  totalLabelBold: {
    ...typography.h3,
    color: colors.light.text,
  },
  totalValueBold: {
    ...typography.h3,
    color: colors.light.primary,
  },
  paymentCard: {
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
  },
  paymentTitle: {
    ...typography.label,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  paymentSummary: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentSummaryCard: {
    flex: 1,
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    alignItems: "center",
  },
  paymentSummaryLabel: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  paymentSummaryValue: {
    ...typography.headline,
    color: colors.light.text,
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    marginTop: spacing.xxs,
    textAlign: "right",
  },
  paymentsList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    flex: 1,
  },
  paymentDate: {
    ...typography.caption,
    color: colors.light.textMuted,
  },
  paymentNoteText: {
    ...typography.caption1,
    color: colors.light.textTertiary,
    marginTop: 2,
  },
  paymentRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paymentAmount: {
    ...typography.label,
    color: colors.light.success,
  },
  payRemainingBtn: {
    backgroundColor: colors.light.success,
  },
  notesText: {
    ...typography.body,
    color: colors.light.text,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
  },
  primaryActionBtn: {
    backgroundColor: colors.light.primary,
  },
  primaryActionText: {
    ...typography.button,
    fontSize: 14,
    color: colors.light.textInverse,
  },
  deleteBtn: {
    backgroundColor: colors.light.errorBg,
  },
  actionText: {
    ...typography.button,
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.light.text,
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.xs,
  },
  modalOptionActive: {
    backgroundColor: colors.light.surface,
  },
  modalOptionText: {
    ...typography.body,
    color: colors.light.text,
  },
  modalClose: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  modalCloseText: {
    ...typography.body,
    color: colors.light.primary,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.light.text,
    marginBottom: spacing.md,
  },
  methodButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  methodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.light.surface,
  },
  methodButtonActive: {
    backgroundColor: colors.light.primary,
  },
  methodButtonText: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  methodButtonTextActive: {
    color: colors.light.textInverse,
  },
  modalTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
    marginBottom: spacing.md,
  },
  modalTotalLabel: {
    ...typography.label,
    color: colors.light.text,
  },
  modalTotalValue: {
    ...typography.h3,
    color: colors.light.error,
  },
  modalSaveButton: {
    backgroundColor: colors.light.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    ...typography.button,
    color: colors.light.textInverse,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.light.surface,
    marginBottom: spacing.sm,
  },
  menuOptionInfo: {
    flex: 1,
  },
  menuOptionTitle: {
    ...typography.label,
    color: colors.light.text,
  },
  menuOptionDesc: {
    ...typography.caption,
    color: colors.light.textMuted,
  },
  menuLoadingContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  menuLoadingText: {
    ...typography.body,
    color: colors.light.textSecondary,
  },
});
