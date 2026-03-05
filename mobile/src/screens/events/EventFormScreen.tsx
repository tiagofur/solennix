import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Save,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Users,
  DollarSign,
  Package,
  Plus,
  Trash2,
  Search,
  UserPlus,
  Wrench,
  AlertTriangle,
  Lightbulb,
} from "lucide-react-native";
import { Image } from "expo-image";
import { EventsStackParamList } from "../../types/navigation";
import { Event, Client, Product, InventoryItem, EquipmentConflict } from "../../types/entities";
import { eventService } from "../../services/eventService";
import { clientService } from "../../services/clientService";
import { productService } from "../../services/productService";
import { inventoryService } from "../../services/inventoryService";
import { useToast } from "../../hooks/useToast";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../lib/errorHandler";
import { useStoreReview } from "../../hooks/useStoreReview";
import { useTheme } from "../../hooks/useTheme";
import { LoadingSpinner, UpgradeBanner, AppBottomSheet, Avatar, QuickClientSheet } from "../../components/shared";
import { uploadService } from "../../services/uploadService";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

const STEPS = [
  { id: 1, title: "General" },
  { id: 2, title: "Productos" },
  { id: 3, title: "Extras" },
  { id: 4, title: "Equipo" },
  { id: 5, title: "Finanzas" },
];

const eventSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  event_date: z.string().min(1, "Selecciona una fecha"),
  service_type: z.string().min(2, "Tipo de servicio requerido"),
  num_people: z.number().min(1, "Mínimo 1 persona"),
  status: z.enum(["quoted", "confirmed", "completed", "cancelled"]),
});

type EventFormData = z.infer<typeof eventSchema>;

type Props = NativeStackScreenProps<EventsStackParamList, "EventForm">;

type SelectedProduct = {
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount: number;
};

type SelectedExtra = {
  description: string;
  cost: number;
  price: number;
};

type SelectedEquipmentItem = {
  inventory_id: string;
  quantity: number;
  notes: string;
};

export default function EventFormScreen({ navigation, route }: Props) {
  const { id, clientId, eventDate } = route.params;
  const isEditing = !!id;
  const addToast = useToast((s) => s.addToast);
  const { user } = useAuth();
  const { canCreateEvent, isBasicPlan, eventsThisMonth, limit } = usePlanLimits();
  const { trackEventCreated } = useStoreReview();
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const tabBarHeight = useBottomTabBarHeight();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [extras, setExtras] = useState<SelectedExtra[]>([]);
  const [equipmentInventory, setEquipmentInventory] = useState<InventoryItem[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipmentItem[]>([]);
  const [equipmentConflicts, setEquipmentConflicts] = useState<EquipmentConflict[]>([]);
  const [equipmentSuggestions, setEquipmentSuggestions] = useState<InventoryItem[]>([]);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const lower = clientSearch.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(lower));
  }, [clients, clientSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const lower = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lower));
  }, [products, productSearch]);

  const [formData, setFormData] = useState({
    client_id: clientId || "",
    event_date: eventDate || new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    service_type: "",
    num_people: 0,
    status: "quoted" as "quoted" | "confirmed" | "completed" | "cancelled",
    discount: 0,
    discount_type: "percent" as "percent" | "fixed",
    tax_rate: 16,
    deposit_percent: user?.default_deposit_percent ?? 50,
    location: "",
    city: "",
    notes: "",
    requires_invoice: false,
    cancellation_days: user?.default_cancellation_days ?? 15,
    refund_percent: user?.default_refund_percent ?? 0,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      client_id: "",
      event_date: "",
      service_type: "",
      num_people: 1,
      status: "quoted",
    },
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [clientsData, productsData, inventoryData] = await Promise.all([
        clientService.getAll(),
        productService.getAll(),
        inventoryService.getAll(),
      ]);
      setClients(clientsData || []);
      setProducts((productsData || []).filter(p => p.is_active));
      setEquipmentInventory((inventoryData || []).filter((i: any) => i.type === 'equipment'));

      if (id) {
        const event = await eventService.getById(id);
        setFormData({
          client_id: event.client_id,
          event_date: event.event_date,
          start_time: event.start_time || "",
          end_time: event.end_time || "",
          service_type: event.service_type,
          num_people: event.num_people,
          status: event.status,
          discount: event.discount,
          discount_type: "percent",
          tax_rate: event.tax_rate,
          deposit_percent: event.deposit_percent ?? (user?.default_deposit_percent ?? 50),
          location: event.location || "",
          city: event.city || "",
          notes: event.notes || "",
          requires_invoice: event.requires_invoice,
          cancellation_days: event.cancellation_days ?? (user?.default_cancellation_days ?? 15),
          refund_percent: event.refund_percent ?? (user?.default_refund_percent ?? 0),
        });

        const eventProducts = await eventService.getProducts(id);
        if (eventProducts) {
          setSelectedProducts(
            eventProducts.map((p: any) => ({
              product_id: p.product_id,
              product: productsData?.find(pr => pr.id === p.product_id),
              quantity: p.quantity,
              unit_price: p.unit_price,
              discount: p.discount,
            }))
          );
        }

        const eventExtras = await eventService.getExtras(id);
        if (eventExtras) {
          setExtras(
            eventExtras.map((e: any) => ({
              description: e.description,
              cost: e.cost,
              price: e.price,
            }))
          );
        }

        const eventEquipment = await eventService.getEquipment(id);
        if (eventEquipment) {
          setSelectedEquipment(
            eventEquipment.map((eq: any) => ({
              inventory_id: eq.inventory_id,
              quantity: eq.quantity,
              notes: eq.notes || '',
            }))
          );
        }
      }
      if (!id) {
        setFormData((prev) => ({
          ...prev,
          deposit_percent: user?.default_deposit_percent ?? 50,
          cancellation_days: user?.default_cancellation_days ?? 15,
          refund_percent: user?.default_refund_percent ?? 0,
        }));
      }
    } catch (err) {
      logError("Error loading data", err);
      addToast("Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = (product: Product) => {
    const exists = selectedProducts.find(p => p.product_id === product.id);
    if (exists) {
      setSelectedProducts(
        selectedProducts.map(p =>
          p.product_id === product.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          product_id: product.id,
          product,
          quantity: 1,
          unit_price: product.base_price,
          discount: 0,
        },
      ]);
    }
    setShowProductPicker(false);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleProductQuantityChange = (index: number, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map((p, i) =>
        i === index ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    );
  };

  const handleAddExtra = () => {
    setExtras([...extras, { description: "", cost: 0, price: 0 }]);
  };

  const handleRemoveExtra = (index: number) => {
    setExtras(extras.filter((_, i) => i !== index));
  };

  const handleExtraChange = (index: number, field: keyof SelectedExtra, value: string | number) => {
    setExtras(
      extras.map((e, i) =>
        i === index ? { ...e, [field]: value } : e
      )
    );
  };

  const calculateTotals = () => {
    const productsSubtotal = selectedProducts.reduce((sum, p) => {
      const lineTotal = p.quantity * p.unit_price * (1 - p.discount / 100);
      return sum + lineTotal;
    }, 0);

    const extrasSubtotal = extras.reduce((sum, e) => sum + e.price, 0);

    const subtotal = productsSubtotal + extrasSubtotal;
    const discountAmount = formData.discount_type === "percent"
      ? subtotal * (formData.discount / 100)
      : formData.discount;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (formData.tax_rate / 100);
    const total = afterDiscount + taxAmount;
    const deposit = total * (formData.deposit_percent / 100);

    return {
      productsSubtotal,
      extrasSubtotal,
      subtotal,
      discountAmount,
      afterDiscount,
      taxAmount,
      total,
      deposit,
    };
  };

  const totals = calculateTotals();

  // Auto-suggest equipment when products change
  useEffect(() => {
    const productIds = selectedProducts.map(p => p.product_id).filter(Boolean);
    if (productIds.length === 0) {
      setEquipmentSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const suggestions = await eventService.getEquipmentSuggestions(productIds);
        setEquipmentSuggestions(suggestions || []);
      } catch {
        // Silently ignore
      }
    };
    fetchSuggestions();
  }, [selectedProducts]);

  // Check equipment conflicts (debounced)
  useEffect(() => {
    const selectedIds = selectedEquipment.map(eq => eq.inventory_id).filter(Boolean);
    if (selectedIds.length === 0 || !formData.event_date) {
      setEquipmentConflicts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const conflicts = await eventService.checkEquipmentConflicts({
          event_date: formData.event_date,
          start_time: formData.start_time || undefined,
          end_time: formData.end_time || undefined,
          inventory_ids: selectedIds,
          exclude_event_id: id || undefined,
        });
        setEquipmentConflicts(conflicts || []);
      } catch {
        // Silently ignore
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedEquipment, formData.event_date, formData.start_time, formData.end_time, id]);

  const handleAddEquipmentItem = (item: InventoryItem) => {
    if (!selectedEquipment.some(eq => eq.inventory_id === item.id)) {
      setSelectedEquipment(prev => [...prev, { inventory_id: item.id, quantity: 1, notes: '' }]);
    }
    setShowEquipmentPicker(false);
  };

  const handleRemoveEquipment = (index: number) => {
    setSelectedEquipment(prev => prev.filter((_, i) => i !== index));
  };

  const filteredEquipment = useMemo(() => {
    return equipmentInventory.filter(
      e => !selectedEquipment.some(se => se.inventory_id === e.id)
    );
  }, [equipmentInventory, selectedEquipment]);

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSave = async () => {
    if (!formData.client_id) {
      addToast("Selecciona un cliente", "error");
      return;
    }
    if (!formData.service_type) {
      addToast("Agrega el tipo de servicio", "error");
      return;
    }
    if (formData.num_people < 1) {
      addToast("Mínimo 1 persona", "error");
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        user_id: user?.id || "",
        client_id: formData.client_id,
        event_date: formData.event_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        service_type: formData.service_type,
        num_people: formData.num_people,
        status: formData.status,
        discount: formData.discount,
        requires_invoice: formData.requires_invoice,
        tax_rate: formData.tax_rate,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        location: formData.location || null,
        city: formData.city || null,
        deposit_percent: formData.deposit_percent,
        cancellation_days: formData.cancellation_days,
        refund_percent: formData.refund_percent,
        notes: formData.notes || null,
        photos: null,
      };

      let eventId = id;

      if (isEditing) {
        await eventService.update(id, eventData);
      } else {
        const newEvent = await eventService.create(eventData);
        eventId = newEvent.id;
      }

      await eventService.updateItems(
        eventId!,
        selectedProducts.map(p => ({
          productId: p.product_id,
          quantity: p.quantity,
          unitPrice: p.unit_price,
          discount: p.discount,
        })),
        extras,
        selectedEquipment
          .filter(eq => eq.inventory_id)
          .map(eq => ({
            inventoryId: eq.inventory_id,
            quantity: eq.quantity,
            notes: eq.notes || undefined,
          })),
      );

      addToast(isEditing ? "Evento actualizado" : "Evento creado", "success");
      if (!isEditing) trackEventCreated();
      navigation.goBack();
    } catch (err: any) {
      const errorMessage = err?.message || "Error al guardar evento";
      addToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const selectedClient = clients.find(c => c.id === formData.client_id);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.stepIndicator}>
        {STEPS.map((s, index) => (
          <React.Fragment key={s.id}>
            {index > 0 && (
              <View style={styles.stepLineWrapper}>
                <View
                  style={[
                    styles.stepLine,
                    step > s.id - 1
                      ? styles.stepLineComplete
                      : styles.stepLinePending,
                  ]}
                />
              </View>
            )}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  step === s.id && styles.stepCircleActive,
                  step > s.id && styles.stepCircleComplete,
                ]}
              >
                {step > s.id ? (
                  <Check color={palette.textInverse} size={14} />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      (step === s.id || step > s.id) && styles.stepNumberActive,
                    ]}
                  >
                    {s.id}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  step === s.id && styles.stepTitleActive,
                ]}
              >
                {s.title}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información General</Text>

            <View style={styles.clientRow}>
              <TouchableOpacity
                style={[styles.selector, { flex: 1, marginBottom: 0 }]}
                onPress={() => setShowClientPicker(true)}
              >
                <Text style={styles.selectorLabel}>Cliente</Text>
                <Text style={styles.selectorValue}>
                  {selectedClient?.name || "Seleccionar cliente..."}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickClientBtn}
                onPress={() => setShowQuickClient(true)}
                activeOpacity={0.7}
              >
                <UserPlus color={palette.textInverse} size={18} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.selectorLabel}>Fecha del Evento</Text>
              <Text style={styles.selectorValue}>
                {formData.event_date
                  ? format(new Date(formData.event_date), "d 'de' MMMM 'de' yyyy", { locale: es })
                  : "Seleccionar fecha..."}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(formData.event_date)}
                mode="date"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setFormData({ ...formData, event_date: date.toISOString().split("T")[0] });
                  }
                }}
              />
            )}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Hora inicio</Text>
                <TextInput
                  style={styles.input}
                  value={formData.start_time}
                  onChangeText={(v) => setFormData({ ...formData, start_time: v })}
                  placeholder="14:00"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Hora fin</Text>
                <TextInput
                  style={styles.input}
                  value={formData.end_time}
                  onChangeText={(v) => setFormData({ ...formData, end_time: v })}
                  placeholder="18:00"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Tipo de Servicio</Text>
            <TextInput
              style={styles.input}
              value={formData.service_type}
              onChangeText={(v) => setFormData({ ...formData, service_type: v })}
              placeholder="Ej: Decoración, Banquete, Fotografía"
            />

            <Text style={styles.inputLabel}>Número de Personas</Text>
            <TextInput
              style={styles.input}
              value={formData.num_people.toString()}
              onChangeText={(v) => setFormData({ ...formData, num_people: parseInt(v) || 0 })}
              keyboardType="number-pad"
              placeholder="0"
            />

            <Text style={styles.inputLabel}>Estado</Text>
            <View style={styles.statusButtons}>
              {(["quoted", "confirmed", "completed", "cancelled"] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    formData.status === status && styles.statusButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, status })}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.status === status && styles.statusButtonTextActive,
                    ]}
                  >
                    {status === "quoted" ? "Cotizado" :
                     status === "confirmed" ? "Confirmado" :
                     status === "completed" ? "Completado" : "Cancelado"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Lugar</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(v) => setFormData({ ...formData, location: v })}
              placeholder="Dirección del evento"
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Productos</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowProductPicker(true)}
              >
                <Plus color={palette.primary} size={18} />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {selectedProducts.length === 0 ? (
              <Text style={styles.emptyText}>
                Agrega productos al evento.
              </Text>
            ) : (
              selectedProducts.map((p, index) => (
                <View key={index} style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{p.product?.name}</Text>
                    <Text style={styles.productPrice}>
                      {formatCurrency(p.unit_price)} c/u
                    </Text>
                  </View>
                  <View style={styles.productQuantity}>
                    <TouchableOpacity
                      onPress={() => handleProductQuantityChange(index, p.quantity - 1)}
                    >
                      <Text style={styles.quantityBtn}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      value={p.quantity.toString()}
                      onChangeText={(v) => handleProductQuantityChange(index, parseInt(v) || 1)}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      onPress={() => handleProductQuantityChange(index, p.quantity + 1)}
                    >
                      <Text style={styles.quantityBtn}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveProduct(index)}>
                    <Trash2 color={palette.error} size={18} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {selectedProducts.length > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal productos</Text>
                <Text style={styles.totalValue}>{formatCurrency(totals.productsSubtotal)}</Text>
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Extras</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddExtra}>
                <Plus color={palette.primary} size={18} />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {extras.length === 0 ? (
              <Text style={styles.emptyText}>
                Agrega servicios extra si es necesario.
              </Text>
            ) : (
              extras.map((extra, index) => (
                <View key={index} style={styles.extraCard}>
                  <TextInput
                    style={styles.extraInput}
                    value={extra.description}
                    onChangeText={(v) => handleExtraChange(index, "description", v)}
                    placeholder="Descripción del extra"
                  />
                  <View style={styles.extraRow}>
                    <View style={styles.extraHalf}>
                      <Text style={styles.extraLabel}>Costo</Text>
                      <TextInput
                        style={styles.extraInput}
                        value={extra.cost.toString()}
                        onChangeText={(v) => handleExtraChange(index, "cost", parseFloat(v) || 0)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.extraHalf}>
                      <Text style={styles.extraLabel}>Precio</Text>
                      <TextInput
                        style={styles.extraPriceInput}
                        value={extra.price.toString()}
                        onChangeText={(v) => handleExtraChange(index, "price", parseFloat(v) || 0)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveExtra(index)}>
                      <Trash2 color={palette.error} size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {extras.length > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal extras</Text>
                <Text style={styles.totalValue}>{formatCurrency(totals.extrasSubtotal)}</Text>
              </View>
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipo</Text>
            <Text style={{ ...typography.caption, color: palette.textMuted, marginBottom: spacing.md }}>
              Asigna equipos reutilizables. No afecta costos del evento.
            </Text>

            {/* Conflict warnings */}
            {equipmentConflicts.length > 0 && (
              <View style={{ backgroundColor: palette.warningBackground || '#FEF3C7', borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: palette.warning || '#F59E0B' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <AlertTriangle color={palette.warning || '#F59E0B'} size={16} />
                  <Text style={{ ...typography.caption, color: palette.warning || '#F59E0B', fontWeight: '600', marginLeft: spacing.xs }}>
                    Conflictos detectados
                  </Text>
                </View>
                {equipmentConflicts.map((c, i) => (
                  <Text key={i} style={{ ...typography.caption, color: palette.warning || '#D97706', marginLeft: spacing.lg }}>
                    {c.equipment_name} — {c.service_type}
                    {c.start_time && c.end_time ? `, ${c.start_time.slice(0, 5)}-${c.end_time.slice(0, 5)}` : ''}
                    {c.client_name ? ` (${c.client_name})` : ''}
                  </Text>
                ))}
              </View>
            )}

            {/* Suggestions */}
            {equipmentSuggestions.filter(s => !selectedEquipment.some(eq => eq.inventory_id === s.id)).length > 0 && (
              <View style={{ backgroundColor: palette.infoBackground || '#EFF6FF', borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: palette.info || '#3B82F6' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Lightbulb color={palette.info || '#3B82F6'} size={16} />
                  <Text style={{ ...typography.caption, color: palette.info || '#3B82F6', fontWeight: '600', marginLeft: spacing.xs }}>
                    Sugerido por tus productos
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {equipmentSuggestions
                    .filter(s => !selectedEquipment.some(eq => eq.inventory_id === s.id))
                    .map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.info || '#DBEAFE', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8 }}
                        onPress={() => handleAddEquipmentItem(s)}
                      >
                        <Plus color={palette.info || '#3B82F6'} size={14} />
                        <Text style={{ ...typography.caption, color: palette.info || '#2563EB', marginLeft: 4 }}>{s.ingredient_name}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}

            {/* Selected equipment */}
            {selectedEquipment.map((eq, i) => {
              const item = equipmentInventory.find(e => e.id === eq.inventory_id);
              return (
                <View key={i} style={[styles.productRow, { marginBottom: spacing.sm }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item?.ingredient_name || 'Equipo'}</Text>
                    <Text style={{ ...typography.caption, color: palette.textMuted }}>
                      Sin costo - Activo reutilizable
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                      <Text style={{ ...typography.caption, color: palette.textSecondary, marginRight: spacing.xs }}>Cant:</Text>
                      <TextInput
                        style={[styles.input, { width: 60, paddingVertical: spacing.xs, textAlign: 'center' }]}
                        value={eq.quantity.toString()}
                        onChangeText={(v) => {
                          const next = [...selectedEquipment];
                          next[i] = { ...next[i], quantity: Math.max(1, parseInt(v) || 1) };
                          setSelectedEquipment(next);
                        }}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveEquipment(i)}>
                    <Trash2 color={palette.error} size={18} />
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowEquipmentPicker(true)}
            >
              <Plus color={palette.primary} size={18} />
              <Text style={styles.addButtonText}>Agregar Equipo</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finanzas</Text>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Descuento (%)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.discount.toString()}
                  onChangeText={(v) => setFormData({ ...formData, discount: parseFloat(v) || 0 })}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>IVA (%)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.tax_rate.toString()}
                  onChangeText={(v) => setFormData({ ...formData, tax_rate: parseFloat(v) || 0 })}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Anticipo (%)</Text>
            <TextInput
              style={styles.input}
              value={formData.deposit_percent.toString()}
              onChangeText={(v) => setFormData({ ...formData, deposit_percent: parseFloat(v) || 0 })}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(v) => setFormData({ ...formData, notes: v })}
              placeholder="Notas adicionales..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.totalsCard}>
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>Subtotal</Text>
                <Text style={styles.totalLineValue}>{formatCurrency(totals.subtotal)}</Text>
              </View>
              {formData.discount > 0 && (
                <View style={styles.totalLine}>
                  <Text style={styles.totalLineLabel}>Descuento</Text>
                  <Text style={[styles.totalLineValue, { color: palette.error }]}>
                    -{formatCurrency(totals.discountAmount)}
                  </Text>
                </View>
              )}
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>IVA ({formData.tax_rate}%)</Text>
                <Text style={styles.totalLineValue}>{formatCurrency(totals.taxAmount)}</Text>
              </View>
              <View style={[styles.totalLine, styles.totalLineBold]}>
                <Text style={styles.totalLineLabelBold}>Total</Text>
                <Text style={styles.totalLineValueBold}>{formatCurrency(totals.total)}</Text>
              </View>
              <View style={[styles.totalLine, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.separator, paddingTop: spacing.sm }]}>
                <Text style={styles.totalLineLabel}>Anticipo ({formData.deposit_percent}%)</Text>
                <Text style={[styles.totalLineValue, { color: palette.primary }]}>
                  {formatCurrency(totals.deposit)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: tabBarHeight + spacing.sm }]}>
        <TouchableOpacity
          style={[styles.navButton, step === 1 && styles.navButtonDisabled]}
          onPress={handlePrev}
          disabled={step === 1}
        >
          <ChevronLeft color={step === 1 ? palette.textMuted : palette.primary} size={20} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={palette.textInverse} />
          ) : (
            <>
              {step === 5 ? (
                <>
                  <Save color={palette.textInverse} size={18} />
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </>
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Siguiente</Text>
                  <ChevronRight color={palette.textInverse} size={20} />
                </>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

      <AppBottomSheet
        visible={showClientPicker}
        onClose={() => { setShowClientPicker(false); setClientSearch(""); }}
        enableDynamicSizing={false}
        snapPoints={['60%']}
        scrollable
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Seleccionar Cliente</Text>
          <View style={styles.searchBox}>
            <Search color={palette.textMuted} size={16} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cliente..."
              placeholderTextColor={palette.textMuted}
              value={clientSearch}
              onChangeText={setClientSearch}
              autoCapitalize="none"
            />
          </View>
        </View>
        {filteredClients.map((client) => (
          <TouchableOpacity
            key={client.id}
            style={[
              styles.sheetItem,
              formData.client_id === client.id && styles.sheetItemActive,
            ]}
            onPress={() => {
              setFormData({ ...formData, client_id: client.id });
              setShowClientPicker(false);
              setClientSearch("");
            }}
            activeOpacity={0.7}
          >
            <Avatar name={client.name} photoUrl={client.photo_url} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetItemText}>{client.name}</Text>
              {client.phone && (
                <Text style={styles.sheetItemSubtext}>{client.phone}</Text>
              )}
            </View>
            {formData.client_id === client.id && (
              <Check color={palette.primary} size={18} />
            )}
          </TouchableOpacity>
        ))}
      </AppBottomSheet>

      <QuickClientSheet
        visible={showQuickClient}
        onClose={() => setShowQuickClient(false)}
        userId={user?.id || ""}
        onClientCreated={(newClient) => {
          setClients((prev) => [newClient, ...prev]);
          setFormData({ ...formData, client_id: newClient.id });
          setShowQuickClient(false);
        }}
      />

      <AppBottomSheet
        visible={showProductPicker}
        onClose={() => { setShowProductPicker(false); setProductSearch(""); }}
        enableDynamicSizing={false}
        snapPoints={['60%']}
        scrollable
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Agregar Producto</Text>
          <View style={styles.searchBox}>
            <Search color={palette.textMuted} size={16} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor={palette.textMuted}
              value={productSearch}
              onChangeText={setProductSearch}
              autoCapitalize="none"
            />
          </View>
        </View>
        {filteredProducts.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.sheetItem}
            onPress={() => {
              handleAddProduct(product);
              setProductSearch("");
            }}
            activeOpacity={0.7}
          >
            {product.image_url ? (
              <Image
                source={{ uri: uploadService.getFullUrl(product.image_url) ?? undefined }}
                style={styles.sheetProductImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.sheetProductIcon}>
                <Package color={palette.primary} size={18} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetItemText}>{product.name}</Text>
              <Text style={styles.sheetItemSubtext}>{product.category}</Text>
            </View>
            <Text style={styles.sheetItemPrice}>{formatCurrency(product.base_price)}</Text>
          </TouchableOpacity>
        ))}
      </AppBottomSheet>

      {/* Equipment Picker */}
      <AppBottomSheet
        visible={showEquipmentPicker}
        onClose={() => setShowEquipmentPicker(false)}
        enableDynamicSizing={false}
        snapPoints={['60%']}
        scrollable
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Agregar Equipo</Text>
        </View>
        {filteredEquipment.length === 0 ? (
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <Text style={{ ...typography.body, color: palette.textMuted }}>
              No hay equipo disponible
            </Text>
          </View>
        ) : (
          filteredEquipment.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.sheetItem}
              onPress={() => handleAddEquipmentItem(item)}
              activeOpacity={0.7}
            >
              <View style={styles.sheetProductIcon}>
                <Wrench color={palette.primary} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemText}>{item.ingredient_name}</Text>
                <Text style={styles.sheetItemSubtext}>{item.current_stock} {item.unit} disponible(s)</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  stepItem: {
    alignItems: "center",
  },
  stepLineWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 14,
  },
  stepLine: {
    height: 2,
    borderRadius: 1,
  },
  stepLineComplete: {
    backgroundColor: palette.success,
  },
  stepLinePending: {
    backgroundColor: palette.border,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepCircleActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  stepCircleComplete: {
    backgroundColor: palette.success,
    borderColor: palette.success,
  },
  stepNumber: {
    ...typography.caption,
    fontWeight: "700",
    color: palette.textMuted,
  },
  stepNumberActive: {
    color: palette.textInverse,
  },
  stepTitle: {
    ...typography.caption,
    color: palette.textMuted,
  },
  stepTitleActive: {
    color: palette.primary,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  clientRow: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickClientBtn: {
    backgroundColor: palette.primary,
    borderRadius: spacing.borderRadius.md,
    width: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  selector: {
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectorLabel: {
    ...typography.caption,
    color: palette.textMuted,
    marginBottom: 2,
  },
  selectorValue: {
    ...typography.body,
    color: palette.text,
  },
  inputLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: palette.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  statusButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: palette.surface,
  },
  statusButtonActive: {
    backgroundColor: palette.primary,
  },
  statusButtonText: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  statusButtonTextActive: {
    color: palette.textInverse,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: palette.primaryLight,
    borderRadius: spacing.borderRadius.md,
  },
  addButtonText: {
    ...typography.caption,
    color: palette.primary,
    fontWeight: "600",
  },
  emptyText: {
    ...typography.body,
    color: palette.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
    gap: spacing.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...typography.label,
    color: palette.text,
  },
  productPrice: {
    ...typography.caption,
    color: palette.textMuted,
  },
  productQuantity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.surface,
    textAlign: "center",
    lineHeight: 26,
    fontSize: 18,
    color: palette.text,
  },
  quantityInput: {
    width: 40,
    height: 28,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: palette.surface,
    textAlign: "center",
    ...typography.bodySmall,
    color: palette.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
  },
  totalLabel: {
    ...typography.label,
    color: palette.text,
  },
  totalValue: {
    ...typography.label,
    color: palette.text,
  },
  extraCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  extraInput: {
    backgroundColor: palette.background,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.sm,
    ...typography.bodySmall,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  extraRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  extraHalf: {
    flex: 1,
  },
  extraLabel: {
    ...typography.caption,
    color: palette.textMuted,
    marginBottom: 2,
  },
  extraPriceInput: {
    backgroundColor: palette.background,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.xs,
    ...typography.bodySmall,
    color: palette.text,
  },
  totalsCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
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
  totalLineLabel: {
    ...typography.body,
    color: palette.textSecondary,
  },
  totalLineValue: {
    ...typography.label,
    color: palette.text,
  },
  totalLineLabelBold: {
    ...typography.h3,
    color: palette.text,
  },
  totalLineValueBold: {
    ...typography.h3,
    color: palette.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: palette.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
    gap: spacing.sm,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: palette.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    color: palette.textInverse,
  },
  nextButtonText: {
    ...typography.button,
    color: palette.textInverse,
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.h3,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.text,
    paddingVertical: spacing.sm,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  sheetItemActive: {
    backgroundColor: palette.primaryLight,
  },
  sheetItemText: {
    ...typography.body,
    color: palette.text,
  },
  sheetItemSubtext: {
    ...typography.caption,
    color: palette.textMuted,
  },
  sheetItemPrice: {
    ...typography.label,
    color: palette.primary,
  },
  sheetProductImage: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
  },
  sheetProductIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
});
