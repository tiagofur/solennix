import React, { useCallback, useEffect, useState } from "react";
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
} from "lucide-react-native";
import { EventsStackParamList } from "../../types/navigation";
import { Event, Client, Product } from "../../types/entities";
import { eventService } from "../../services/eventService";
import { clientService } from "../../services/clientService";
import { productService } from "../../services/productService";
import { useToast } from "../../hooks/useToast";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../lib/errorHandler";
import { useStoreReview } from "../../hooks/useStoreReview";
import { LoadingSpinner, UpgradeBanner } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

const STEPS = [
  { id: 1, title: "General" },
  { id: 2, title: "Productos" },
  { id: 3, title: "Extras" },
  { id: 4, title: "Finanzas" },
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

export default function EventFormScreen({ navigation, route }: Props) {
  const { id, clientId } = route.params;
  const isEditing = !!id;
  const addToast = useToast((s) => s.addToast);
  const { user } = useAuth();
  const { canCreateEvent, isBasicPlan, eventsThisMonth, limit } = usePlanLimits();
  const { trackEventCreated } = useStoreReview();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [extras, setExtras] = useState<SelectedExtra[]>([]);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const [formData, setFormData] = useState({
    client_id: clientId || "",
    event_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    service_type: "",
    num_people: 0,
    status: "quoted" as "quoted" | "confirmed" | "completed" | "cancelled",
    discount: 0,
    discount_type: "percent" as "percent" | "fixed",
    tax_rate: 16,
    deposit_percent: 50,
    location: "",
    city: "",
    notes: "",
    requires_invoice: false,
    cancellation_days: 15,
    refund_percent: 0,
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
      const [clientsData, productsData] = await Promise.all([
        clientService.getAll(),
        productService.getAll(),
      ]);
      setClients(clientsData || []);
      setProducts((productsData || []).filter(p => p.is_active));

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
          deposit_percent: event.deposit_percent || 50,
          location: event.location || "",
          city: event.city || "",
          notes: event.notes || "",
          requires_invoice: event.requires_invoice,
          cancellation_days: event.cancellation_days || 15,
          refund_percent: event.refund_percent || 0,
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

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const handleNext = () => {
    if (step < 4) {
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
        extras
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
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.stepIndicator}>
        {STEPS.map((s) => (
          <View key={s.id} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                step === s.id && styles.stepCircleActive,
                step > s.id && styles.stepCircleComplete,
              ]}
            >
              {step > s.id ? (
                <Check color={colors.light.textInverse} size={14} />
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

            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowClientPicker(true)}
            >
              <Text style={styles.selectorLabel}>Cliente</Text>
              <Text style={styles.selectorValue}>
                {selectedClient?.name || "Seleccionar cliente..."}
              </Text>
            </TouchableOpacity>

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
              placeholder="Ej: Banquete, Cocktail, Cena"
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
                <Plus color={colors.light.primary} size={18} />
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
                    <Trash2 color={colors.light.error} size={18} />
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
                <Plus color={colors.light.primary} size={18} />
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
                      <Trash2 color={colors.light.error} size={18} />
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
                  <Text style={[styles.totalLineValue, { color: colors.light.error }]}>
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
              <View style={[styles.totalLine, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.light.separator, paddingTop: spacing.sm }]}>
                <Text style={styles.totalLineLabel}>Anticipo ({formData.deposit_percent}%)</Text>
                <Text style={[styles.totalLineValue, { color: colors.light.primary }]}>
                  {formatCurrency(totals.deposit)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, step === 1 && styles.navButtonDisabled]}
          onPress={handlePrev}
          disabled={step === 1}
        >
          <ChevronLeft color={step === 1 ? colors.light.textMuted : colors.light.primary} size={20} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.light.textInverse} />
          ) : (
            <>
              {step === 4 ? (
                <>
                  <Save color={colors.light.textInverse} size={18} />
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </>
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Siguiente</Text>
                  <ChevronRight color={colors.light.textInverse} size={20} />
                </>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

      {showClientPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Seleccionar Cliente</Text>
            <ScrollView style={styles.pickerList}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.pickerItem,
                    formData.client_id === client.id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, client_id: client.id });
                    setShowClientPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{client.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerClose}
              onPress={() => setShowClientPicker(false)}
            >
              <Text style={styles.pickerCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showProductPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Agregar Producto</Text>
            <ScrollView style={styles.pickerList}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.pickerItem}
                  onPress={() => handleAddProduct(product)}
                >
                  <Text style={styles.pickerItemText}>{product.name}</Text>
                  <Text style={styles.pickerItemPrice}>{formatCurrency(product.base_price)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerClose}
              onPress={() => setShowProductPicker(false)}
            >
              <Text style={styles.pickerCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.light.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.light.surface,
    borderWidth: 2,
    borderColor: colors.light.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepCircleActive: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primary,
  },
  stepCircleComplete: {
    backgroundColor: colors.light.success,
    borderColor: colors.light.success,
  },
  stepNumber: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.light.textMuted,
  },
  stepNumberActive: {
    color: colors.light.textInverse,
  },
  stepTitle: {
    ...typography.caption,
    color: colors.light.textMuted,
  },
  stepTitleActive: {
    color: colors.light.primary,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    backgroundColor: colors.light.card,
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
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  selector: {
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectorLabel: {
    ...typography.caption,
    color: colors.light.textMuted,
    marginBottom: 2,
  },
  selectorValue: {
    ...typography.body,
    color: colors.light.text,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.light.text,
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
    backgroundColor: colors.light.surface,
  },
  statusButtonActive: {
    backgroundColor: colors.light.primary,
  },
  statusButtonText: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  statusButtonTextActive: {
    color: colors.light.textInverse,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.light.primaryLight,
    borderRadius: spacing.borderRadius.md,
  },
  addButtonText: {
    ...typography.caption,
    color: colors.light.primary,
    fontWeight: "600",
  },
  emptyText: {
    ...typography.body,
    color: colors.light.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
    gap: spacing.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...typography.label,
    color: colors.light.text,
  },
  productPrice: {
    ...typography.caption,
    color: colors.light.textMuted,
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
    backgroundColor: colors.light.surface,
    textAlign: "center",
    lineHeight: 26,
    fontSize: 18,
    color: colors.light.text,
  },
  quantityInput: {
    width: 40,
    height: 28,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.light.surface,
    textAlign: "center",
    ...typography.bodySmall,
    color: colors.light.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
  },
  totalLabel: {
    ...typography.label,
    color: colors.light.text,
  },
  totalValue: {
    ...typography.label,
    color: colors.light.text,
  },
  extraCard: {
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  extraInput: {
    backgroundColor: colors.light.background,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.sm,
    ...typography.bodySmall,
    color: colors.light.text,
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
    color: colors.light.textMuted,
    marginBottom: 2,
  },
  extraPriceInput: {
    backgroundColor: colors.light.background,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.xs,
    ...typography.bodySmall,
    color: colors.light.text,
  },
  totalsCard: {
    backgroundColor: colors.light.surface,
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
    borderTopColor: colors.light.separator,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  totalLineLabel: {
    ...typography.body,
    color: colors.light.textSecondary,
  },
  totalLineValue: {
    ...typography.label,
    color: colors.light.text,
  },
  totalLineLabelBold: {
    ...typography.h3,
    color: colors.light.text,
  },
  totalLineValueBold: {
    ...typography.h3,
    color: colors.light.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.light.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
    gap: spacing.sm,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.surface,
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
    backgroundColor: colors.light.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.light.textInverse,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.light.textInverse,
  },
  pickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    backgroundColor: colors.light.card,
    borderTopLeftRadius: spacing.borderRadius.xl,
    borderTopRightRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    maxHeight: "70%",
    ...shadows.lg,
  },
  pickerTitle: {
    ...typography.h3,
    color: colors.light.text,
    marginBottom: spacing.md,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
  },
  pickerItemActive: {
    backgroundColor: colors.light.primaryLight,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  pickerItemText: {
    ...typography.body,
    color: colors.light.text,
  },
  pickerItemPrice: {
    ...typography.caption,
    color: colors.light.textMuted,
  },
  pickerClose: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  pickerCloseText: {
    ...typography.body,
    color: colors.light.primary,
  },
});
