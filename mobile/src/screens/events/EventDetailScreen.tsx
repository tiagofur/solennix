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
  Check,
  Camera,
  ClipboardList,
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
  generateChecklistPDF,
  generatePaymentReportPDF,
  generateInvoicePDF,
} from "../../lib/pdfGenerator";
import { ContractTemplateError } from "../../lib/contractTemplate";
import { LoadingSpinner, ConfirmDialog, EmptyState, AppBottomSheet, PhotoGallery } from "../../components/shared";
import { uploadService } from "../../services/uploadService";
import { useImagePicker } from "../../hooks/useImagePicker";
import { useStoreReview } from "../../hooks/useStoreReview";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<EventsStackParamList, "EventDetail">;

const getStatusOptions = (palette: typeof colors.light) => [
  { key: "quoted", label: "Cotizado", color: palette.statusQuoted, bg: palette.statusQuotedBg, text: palette.statusQuoted },
  { key: "confirmed", label: "Confirmado", color: palette.statusConfirmed, bg: palette.statusConfirmedBg, text: palette.statusConfirmed },
  { key: "completed", label: "Completado", color: palette.statusCompleted, bg: palette.statusCompletedBg, text: palette.statusCompleted },
  { key: "cancelled", label: "Cancelado", color: palette.statusCancelled, bg: palette.statusCancelledBg, text: palette.statusCancelled },
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
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const STATUS_OPTIONS = getStatusOptions(palette);

  const [event, setEvent] = useState<Event | null>(null);
  const [client, setClient] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
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
  const [eventPhotos, setEventPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const { pickFromGallery } = useImagePicker({ allowsMultiple: true });

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

      const [clientData, productsData, extrasData, paymentsData, equipmentData] = await Promise.all([
        clientService.getById(eventData.client_id),
        eventService.getProducts(id),
        eventService.getExtras(id),
        paymentService.getByEventIds([id]),
        eventService.getEquipment(id),
      ]);
      setClient(clientData);
      setProducts(productsData || []);
      setExtras(extrasData || []);
      setPayments(paymentsData || []);
      setEquipment(equipmentData || []);

      // Parse photos JSONB
      if (eventData.photos) {
        try {
          const parsed = typeof eventData.photos === 'string' ? JSON.parse(eventData.photos) : eventData.photos;
          setEventPhotos(Array.isArray(parsed) ? parsed : []);
        } catch {
          setEventPhotos([]);
        }
      } else {
        setEventPhotos([]);
      }
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

  const handleAddPhotos = useCallback(async () => {
    const result = await pickFromGallery();
    if (!result || result.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      for (const img of result) {
        const uploadResult = await uploadService.uploadImage(img.uri);
        newUrls.push(uploadResult.url);
      }

      if (newUrls.length > 0) {
        const updated = [...eventPhotos, ...newUrls];
        await eventService.update(id, { photos: JSON.stringify(updated) });
        setEventPhotos(updated);
        addToast(`${newUrls.length} foto(s) agregada(s)`, "success");
      }
    } catch (err) {
      logError("Error uploading event photos", err);
      addToast("Error al subir fotos", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [id, eventPhotos, pickFromGallery, addToast]);

  const handleRemovePhoto = useCallback(async (index: number) => {
    try {
      const updated = eventPhotos.filter((_, i) => i !== index);
      await eventService.update(id, { photos: JSON.stringify(updated) });
      setEventPhotos(updated);
      addToast("Foto eliminada", "success");
    } catch (err) {
      logError("Error removing photo", err);
      addToast("Error al eliminar foto", "error");
    }
  }, [id, eventPhotos, addToast]);

  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const handleGenerateQuote = useCallback(async () => {
    setShowActionsMenu(false);
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
  }, [event, client, user, products, extras, addToast]);

  const handleGenerateContract = useCallback(async () => {
    setShowActionsMenu(false);
    try {
      setGeneratingPdf("contract");
      await generateContractPDF({ ...event!, client: client as any }, user);
      trackPdfShared();
    } catch (err) {
      logError("Error generating contract PDF", err);
      const message =
        err instanceof ContractTemplateError
          ? `Faltan datos del contrato: ${err.missingTokens.map((t) => `[${t}]`).join(", ")}`
          : "Error al generar contrato";
      addToast(message, "error");
    } finally {
      setGeneratingPdf(null);
    }
  }, [event, client, user, addToast]);

  const handleGenerateShoppingList = useCallback(async () => {
    setShowActionsMenu(false);
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
      (prodIngredients || [])
        .filter((ing: any) => ing.type !== 'equipment')
        .forEach((ing: any) => {
          const key = ing.inventory_id;
          const qty = productQuantities.get(ing.product_id) || 0;
          if (!aggregated[key]) {
            aggregated[key] = { name: ing.ingredient_name || "Insumo", unit: ing.unit || "", quantity: 0 };
          }
          aggregated[key].quantity += (ing.quantity_required || 0) * qty;
        });
      await generateShoppingListPDF(event!, user, Object.values(aggregated));
      trackPdfShared();
    } catch (err) {
      logError("Error generating shopping list PDF", err);
      addToast("Error al generar lista de insumos", "error");
    } finally {
      setGeneratingPdf(null);
    }
  }, [event, products, user, addToast]);

  const handleGenerateChecklist = useCallback(async () => {
    setShowActionsMenu(false);
    try {
      setGeneratingPdf("checklist");
      const productQuantities = new Map<string, number>();
      products.forEach((p: any) => {
        productQuantities.set(p.product_id, p.quantity || 0);
      });
      const productIds = Array.from(productQuantities.keys());
      const prodIngredients = productIds.length > 0
        ? await productService.getIngredientsForProducts(productIds)
        : [];
      const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
      (prodIngredients || [])
        .filter((ing: any) => ing.type !== 'equipment' && ing.bring_to_event)
        .forEach((ing: any) => {
          const key = ing.inventory_id;
          const qty = productQuantities.get(ing.product_id) || 0;
          if (!aggregated[key]) {
            aggregated[key] = { name: ing.ingredient_name || "Insumo", unit: ing.unit || "", quantity: 0 };
          }
          aggregated[key].quantity += (ing.quantity_required || 0) * qty;
        });
      await generateChecklistPDF(event!, user, products, equipment, Object.values(aggregated), extras);
      trackPdfShared();
    } catch (err) {
      logError("Error generating checklist PDF", err);
      addToast("Error al generar checklist", "error");
    } finally {
      setGeneratingPdf(null);
    }
  }, [event, products, equipment, extras, user, addToast]);

  const handleGeneratePaymentReport = useCallback(async () => {
    setShowActionsMenu(false);
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
  }, [event, client, user, payments, addToast]);

  const handleGenerateInvoice = useCallback(async () => {
    setShowActionsMenu(false);
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
  }, [event, client, user, products, extras, addToast]);

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
            <Calendar color={palette.textMuted} size={18} />
            <Text style={styles.infoText}>
              {format(parseISO(event.event_date), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
            </Text>
          </View>
          
          {event.start_time && (
            <View style={styles.infoRow}>
              <Clock color={palette.textMuted} size={18} />
              <Text style={styles.infoText}>
                {event.start_time} - {event.end_time || "Por definir"}
              </Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Users color={palette.textMuted} size={18} />
            <Text style={styles.infoText}>{event.num_people} personas</Text>
          </View>
          
          {event.location && (
            <View style={styles.infoRow}>
              <MapPin color={palette.textMuted} size={18} />
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

        {equipment.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipo Asignado</Text>

            {equipment.map((eq: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{eq.equipment_name || 'Equipo'}</Text>
                  <Text style={styles.itemDetail}>
                    x{eq.quantity}{eq.notes ? ` — ${eq.notes}` : ''}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: palette.textMuted }]}>Sin costo</Text>
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
                <Text style={[styles.totalValue, { color: palette.error }]}>
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
              <View style={[styles.paymentSummaryCard, { backgroundColor: palette.successBg }]}>
                <Text style={styles.paymentSummaryLabel}>Pagado</Text>
                <Text style={[styles.paymentSummaryValue, { color: palette.success }]}>
                  {formatCurrency(totalPaid)}
                </Text>
              </View>
              <View style={[styles.paymentSummaryCard, { backgroundColor: remaining > 0 ? palette.errorBg : palette.successBg }]}>
                <Text style={styles.paymentSummaryLabel}>Saldo</Text>
                <Text style={[styles.paymentSummaryValue, { color: remaining > 0 ? palette.error : palette.success }]}>
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
                      backgroundColor: isFullyPaid ? palette.success : palette.primary,
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
                      <CreditCard color={palette.textMuted} size={14} />
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
                        <Trash2 color={palette.error} size={14} />
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

        <View style={styles.section}>
          <View style={styles.photoSectionHeader}>
            <Text style={styles.sectionTitle}>Fotos</Text>
            {isUploadingPhoto && <ActivityIndicator size="small" color={palette.primary} />}
          </View>
          {eventPhotos.length > 0 || true ? (
            <PhotoGallery
              photos={eventPhotos}
              editable
              onAdd={handleAddPhotos}
              onRemove={handleRemovePhoto}
            />
          ) : null}
          {eventPhotos.length === 0 && !isUploadingPhoto && (
            <Text style={styles.photosEmptyText}>
              Toca "Agregar" para documentar tu evento con fotos.
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryActionBtn]}
            onPress={() => setShowPaymentModal(true)}
          >
            <Plus color={palette.textInverse} size={18} />
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
            <Download color={palette.primary} size={18} />
            <Text style={[styles.actionText, { color: palette.primary }]}>
              Generar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("EventForm", { id })}
          >
            <Edit2 color={palette.primary} size={18} />
            <Text style={[styles.actionText, { color: palette.primary }]}>
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => setShowDelete(true)}
          >
            <Trash2 color={palette.error} size={18} />
            <Text style={[styles.actionText, { color: palette.error }]}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AppBottomSheet
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.modalTitle}>Cambiar Estado</Text>
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.modalOption,
                event.status === status.key && styles.modalOptionActive,
              ]}
              onPress={() => handleStatusChange(status.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.modalOptionText, { flex: 1 }]}>{status.label}</Text>
              {event.status === status.key && (
                <Check color={palette.primary} size={18} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </AppBottomSheet>

      <AppBottomSheet
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.modalTitle}>Registrar Pago</Text>

          <Text style={styles.inputLabel}>Monto</Text>
          <TextInput
            style={styles.modalInput}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            placeholder="0.00"
            placeholderTextColor={palette.textTertiary}
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
            placeholderTextColor={palette.textTertiary}
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
            activeOpacity={0.7}
          >
            {savingPayment ? (
              <ActivityIndicator color={palette.textInverse} />
            ) : (
              <Text style={styles.modalSaveButtonText}>Registrar Pago</Text>
            )}
          </TouchableOpacity>
        </View>
      </AppBottomSheet>

      <AppBottomSheet
        visible={showActionsMenu}
        onClose={() => setShowActionsMenu(false)}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.modalTitle}>Generar Documentos</Text>

          {generatingPdf ? (
            <View style={styles.menuLoadingContainer}>
              <ActivityIndicator color={palette.primary} size="large" />
              <Text style={styles.menuLoadingText}>Generando PDF...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.menuOption} onPress={handleGenerateQuote} activeOpacity={0.7}>
                <FileText color={palette.primary} size={24} />
                <View style={styles.menuOptionInfo}>
                  <Text style={styles.menuOptionTitle}>Cotización</Text>
                  <Text style={styles.menuOptionDesc}>Genera PDF de la cotización</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={handleGenerateContract} activeOpacity={0.7}>
                <FileCheck color={palette.primary} size={24} />
                <View style={styles.menuOptionInfo}>
                  <Text style={styles.menuOptionTitle}>Contrato</Text>
                  <Text style={styles.menuOptionDesc}>Genera PDF del contrato</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={handleGenerateShoppingList} activeOpacity={0.7}>
                <ShoppingCart color={palette.primary} size={24} />
                <View style={styles.menuOptionInfo}>
                  <Text style={styles.menuOptionTitle}>Lista de Insumos</Text>
                  <Text style={styles.menuOptionDesc}>Genera lista de insumos necesarios</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={handleGenerateChecklist} activeOpacity={0.7}>
                <ClipboardList color={palette.primary} size={24} />
                <View style={styles.menuOptionInfo}>
                  <Text style={styles.menuOptionTitle}>Checklist de Carga</Text>
                  <Text style={styles.menuOptionDesc}>Todo lo que llevar al evento</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={handleGeneratePaymentReport} activeOpacity={0.7}>
                <DollarSign color={palette.primary} size={24} />
                <View style={styles.menuOptionInfo}>
                  <Text style={styles.menuOptionTitle}>Reporte de Pagos</Text>
                  <Text style={styles.menuOptionDesc}>Resumen de pagos realizados</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={handleGenerateInvoice} activeOpacity={0.7}>
                <Receipt color={palette.primary} size={24} />
                <View style={styles.menuOptionInfo}>
                  <Text style={styles.menuOptionTitle}>Factura</Text>
                  <Text style={styles.menuOptionDesc}>Genera factura simplificada</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </AppBottomSheet>

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

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.card,
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
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "700",
    color: palette.primary,
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.primary,
    lineHeight: 24,
  },
  headerInfo: {
    flex: 1,
  },
  eventType: {
    ...typography.h3,
    color: palette.text,
  },
  clientName: {
    ...typography.body,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  section: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: palette.text,
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
    color: palette.text,
    flex: 1,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.label,
    color: palette.text,
  },
  itemDetail: {
    ...typography.caption,
    color: palette.textMuted,
  },
  itemTotal: {
    ...typography.label,
    color: palette.text,
  },
  totalCard: {
    backgroundColor: palette.surface,
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
    borderTopColor: palette.separator,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    ...typography.body,
    color: palette.textSecondary,
  },
  totalValue: {
    ...typography.label,
    color: palette.text,
  },
  totalLabelBold: {
    ...typography.h3,
    color: palette.text,
  },
  totalValueBold: {
    ...typography.h3,
    color: palette.primary,
  },
  paymentCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
  },
  paymentTitle: {
    ...typography.label,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  paymentSummary: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentSummaryCard: {
    flex: 1,
    backgroundColor: palette.surfaceAlt,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    alignItems: "center",
  },
  paymentSummaryLabel: {
    ...typography.caption1,
    color: palette.textSecondary,
    marginBottom: 2,
  },
  paymentSummaryValue: {
    ...typography.headline,
    color: palette.text,
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    ...typography.caption1,
    color: palette.textSecondary,
    marginTop: spacing.xxs,
    textAlign: "right",
  },
  paymentsList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    flex: 1,
  },
  paymentDate: {
    ...typography.caption,
    color: palette.textMuted,
  },
  paymentNoteText: {
    ...typography.caption1,
    color: palette.textTertiary,
    marginTop: 2,
  },
  paymentRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paymentAmount: {
    ...typography.label,
    color: palette.success,
  },
  payRemainingBtn: {
    backgroundColor: palette.success,
  },
  notesText: {
    ...typography.body,
    color: palette.text,
  },
  photoSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  photosEmptyText: {
    ...typography.bodySmall,
    color: palette.textTertiary,
    marginTop: spacing.xs,
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
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
  },
  primaryActionBtn: {
    backgroundColor: palette.primary,
  },
  primaryActionText: {
    ...typography.button,
    fontSize: 14,
    color: palette.textInverse,
  },
  deleteBtn: {
    backgroundColor: palette.errorBg,
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
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalTitle: {
    ...typography.h3,
    color: palette.text,
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
    backgroundColor: palette.surface,
  },
  modalOptionText: {
    ...typography.body,
    color: palette.text,
  },
  inputLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: palette.text,
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
    backgroundColor: palette.surface,
  },
  methodButtonActive: {
    backgroundColor: palette.primary,
  },
  methodButtonText: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  methodButtonTextActive: {
    color: palette.textInverse,
  },
  modalTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
    marginBottom: spacing.md,
  },
  modalTotalLabel: {
    ...typography.label,
    color: palette.text,
  },
  modalTotalValue: {
    ...typography.h3,
    color: palette.error,
  },
  modalSaveButton: {
    backgroundColor: palette.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    ...typography.button,
    color: palette.textInverse,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: palette.surface,
    marginBottom: spacing.sm,
  },
  menuOptionInfo: {
    flex: 1,
  },
  menuOptionTitle: {
    ...typography.label,
    color: palette.text,
  },
  menuOptionDesc: {
    ...typography.caption,
    color: palette.textMuted,
  },
  menuLoadingContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  menuLoadingText: {
    ...typography.body,
    color: palette.textSecondary,
  },
});
