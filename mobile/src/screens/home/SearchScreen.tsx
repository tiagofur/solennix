import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  Search,
  X,
  Users,
  Calendar,
  Package,
  Warehouse,
  ChevronRight,
} from "lucide-react-native";
import {
  searchService,
  SearchResult,
  SearchResults,
} from "../../services/searchService";
import { logError } from "../../lib/errorHandler";
import { EmptyState } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";


type SectionData = {
  key: string;
  title: string;
  icon: React.ReactNode;
  data: SearchResult[];
};

const sectionConfig: Record<
  string,
  { title: string; icon: (c: string) => React.ReactNode }
> = {
  client: {
    title: "Clientes",
    icon: (c) => <Users color={c} size={16} />,
  },
  event: {
    title: "Eventos",
    icon: (c) => <Calendar color={c} size={16} />,
  },
  product: {
    title: "Productos",
    icon: (c) => <Package color={c} size={16} />,
  },
  inventory: {
    title: "Inventario",
    icon: (c) => <Warehouse color={c} size={16} />,
  },
};

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults(null);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchService.searchAll(q);
        setResults(data);
        setSearched(true);
      } catch (err) {
        logError("Search error", err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Build section list data
  const sections: SectionData[] = results
    ? (["client", "event", "product", "inventory"] as const)
        .filter((key) => results[key].length > 0)
        .map((key) => ({
          key,
          title: sectionConfig[key].title,
          icon: sectionConfig[key].icon(colors.light.primary),
          data: results[key],
        }))
    : [];

  const totalResults = sections.reduce((sum, s) => sum + s.data.length, 0);

  const handleResultPress = useCallback(
    (item: SearchResult) => {
      // Navigate based on type
      switch (item.type) {
        case "client":
          (navigation as any).navigate("TabsScreen", {
            screen: "ClientTab",
            params: { screen: "ClientDetail", params: { id: item.id } },
          });
          break;
        case "event":
          (navigation as any).navigate("TabsScreen", {
            screen: "HomeTab",
            params: { screen: "EventDetail", params: { id: item.id } },
          });
          break;
        case "product":
          (navigation as any).navigate("ProductStack", {
            screen: "ProductForm",
            params: { id: item.id },
          });
          break;
        case "inventory":
          (navigation as any).navigate("InventoryStack", {
            screen: "InventoryForm",
            params: { id: item.id },
          });
          break;
      }
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <TouchableOpacity
        style={styles.resultRow}
        activeOpacity={0.7}
        onPress={() => handleResultPress(item)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.resultSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        {item.meta ? (
          <Text style={styles.resultMeta} numberOfLines={1}>
            {item.meta}
          </Text>
        ) : null}
        <ChevronRight color={colors.light.textMuted} size={16} />
      </TouchableOpacity>
    ),
    [handleResultPress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={styles.sectionHeader}>
        {section.icon}
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>({section.data.length})</Text>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search color={colors.light.textMuted} size={18} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Buscar clientes, eventos, productos..."
            placeholderTextColor={colors.light.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <X color={colors.light.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.light.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      )}

      {/* Results */}
      {!loading && searched && totalResults > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader as any}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* No results */}
      {!loading && searched && totalResults === 0 && (
        <EmptyState
          icon={<Search color={colors.light.textMuted} size={48} />}
          title="Sin resultados"
          description={`No se encontró nada para "${query}"`}
        />
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <View style={styles.emptyHint}>
          <Search color={colors.light.textMuted} size={40} />
          <Text style={styles.hintText}>
            Busca clientes, eventos, productos o inventario
          </Text>
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.light.text,
    padding: 0,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.light.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.light.background,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.light.text,
    fontSize: 14,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.light.textMuted,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  resultTitle: {
    ...typography.label,
    color: colors.light.text,
    fontSize: 14,
  },
  resultSubtitle: {
    ...typography.caption,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  resultMeta: {
    ...typography.caption,
    color: colors.light.textMuted,
    maxWidth: 90,
    textAlign: "right",
  },
  emptyHint: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    opacity: 0.5,
  },
  hintText: {
    ...typography.body,
    color: colors.light.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
  },
});
