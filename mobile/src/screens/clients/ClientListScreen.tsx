import React, { useCallback, useEffect, useMemo, useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Users,
} from "lucide-react-native";
import { ClientStackParamList } from "../../types/navigation";
import { Client } from "../../types/entities";
import { clientService } from "../../services/clientService";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import {
  EmptyState,
  ConfirmDialog,
  UpgradeBanner,
  Avatar,
  SkeletonList,
  SwipeableRow,
  SortSelector,
} from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<ClientStackParamList, "ClientList">;

export default function ClientListScreen({ navigation }: Props) {
  const { canCreateClient, isBasicPlan, clientsCount, clientLimit } =
    usePlanLimits();
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [sortKey, setSortKey] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const clientSortOptions = useMemo(() => [
    { key: "updated_at", label: "Fecha de actualización" },
    { key: "name", label: "Nombre" },
    { key: "total_events", label: "Total de eventos" },
    { key: "total_spent", label: "Total gastado" },
    { key: "created_at", label: "Fecha de creación" },
  ], []);

  const loadClients = useCallback(async () => {
    try {
      const data = await clientService.getAll();
      setClients(data || []);
    } catch (err) {
      logError("Error loading clients", err);
      addToast("Error al cargar clientes", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadClients();
    }, [loadClients]),
  );

  useEffect(() => {
    let filtered = clients;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q),
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "total_events":
          cmp = (a.total_events ?? 0) - (b.total_events ?? 0);
          break;
        case "total_spent":
          cmp = (a.total_spent ?? 0) - (b.total_spent ?? 0);
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "updated_at":
        default:
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    setFilteredClients(sorted);
  }, [search, clients, sortKey, sortOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  }, [loadClients]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await clientService.delete(deleteTarget.id);
      addToast("Cliente eliminado", "success");
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    } catch (err) {
      logError("Error deleting client", err);
      addToast("Error al eliminar cliente", "error");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, addToast]);

  const handleNew = useCallback(() => {
    if (!canCreateClient) {
      Alert.alert(
        "Límite alcanzado",
        `Has alcanzado el límite de ${clientLimit} clientes en el plan básico.`,
      );
      return;
    }
    navigation.navigate("ClientForm", {});
  }, [canCreateClient, clientLimit, navigation]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatCurrency = (n: number | null) =>
    n != null
      ? `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`
      : "$0";

  const renderClient = useCallback(
    ({ item, index }: { item: Client; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
      <SwipeableRow
        onEdit={() => navigation.navigate("ClientForm", { id: item.id })}
        onDelete={() => setDeleteTarget(item)}
      >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("ClientDetail", { id: item.id })}
      >
        <Avatar name={item.name} photoUrl={item.photo_url} size={44} />
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {(item.city || item.address) && (
            <View style={styles.cardRow}>
              <View style={styles.infoChip}>
                <MapPin color={palette.textTertiary} size={11} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.city || item.address}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.cardRow}>
            {item.phone ? (
              <View style={styles.infoChip}>
                <Phone color={palette.textTertiary} size={12} />
                <Text style={styles.infoText}>{item.phone}</Text>
              </View>
            ) : null}
            {item.email ? (
              <View style={styles.infoChip}>
                <Mail color={palette.textTertiary} size={12} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.statText}>
              {item.total_events ?? 0} eventos
            </Text>
            <Text style={styles.dotSep}>·</Text>
            <Text style={styles.statText}>
              {formatCurrency(item.total_spent)}
            </Text>
          </View>
        </View>
        <ChevronRight color={palette.textTertiary} size={20} />
      </TouchableOpacity>
      </SwipeableRow>
      </Animated.View>
    ),
    [navigation],
  );

  if (loading && clients.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <SkeletonList count={6} showAvatar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { flex: 1 }]}>
            <Search color={palette.textTertiary} size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar clientes..."
              placeholderTextColor={palette.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>
          <SortSelector
            options={clientSortOptions}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={(key, order) => { setSortKey(key); setSortOrder(order); }}
          />
        </View>
      </View>

      {isBasicPlan && !canCreateClient && (
        <View
          style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}
        >
          <UpgradeBanner
            type="limit-reached"
            currentUsage={clientsCount}
            limit={clientLimit}
          />
        </View>
      )}

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={
          filteredClients.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? null : search.trim() ? (
            <EmptyState
              title="Sin resultados"
              description={`No se encontraron clientes con "${search}"`}
            />
          ) : (
            <EmptyState
              icon={<Users color={palette.textTertiary} size={48} />}
              title="Sin clientes"
              description="Agrega tu primer cliente para empezar."
              actionLabel="Nuevo Cliente"
              onAction={handleNew}
            />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={handleNew}
      >
        <Plus color={palette.textInverse} size={28} />
      </TouchableOpacity>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar cliente"
        description={`¿Eliminar a "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 38,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.text,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  emptyContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: palette.textInverse,
    fontWeight: "700",
    fontSize: 16,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    ...typography.headline,
    fontSize: 15,
    color: palette.text,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  infoText: {
    ...typography.caption1,
    color: palette.textSecondary,
    maxWidth: 130,
  },
  statText: {
    ...typography.caption1,
    color: palette.textTertiary,
  },
  dotSep: {
    ...typography.caption1,
    color: palette.textTertiary,
  },
  fab: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.fab,
  },
});
