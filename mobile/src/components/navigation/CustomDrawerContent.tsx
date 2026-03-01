import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import {
  Home,
  CalendarDays,
  Users,
  Package,
  Boxes,
  Search,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { colors, ThemeColors } from "../../theme/colors";

interface DrawerItemProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isActive?: boolean;
  palette: ThemeColors;
}

function DrawerItem({ label, icon, onPress, isActive, palette }: DrawerItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.drawerItem,
        isActive && { backgroundColor: palette.primaryLight },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.drawerItemIcon}>{icon}</View>
      <Text
        style={[
          styles.drawerItemLabel,
          { color: isActive ? palette.primary : palette.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, palette }: { title: string; palette: ThemeColors }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color: palette.textTertiary }]}>
        {title}
      </Text>
    </View>
  );
}

function Divider({ palette }: { palette: ThemeColors }) {
  return <View style={[styles.divider, { backgroundColor: palette.separator }]} />;
}

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, signOut } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const { navigation, state } = props;

  const activeRoute = state.routes[state.index]?.name;
  const iconSize = 20;

  const navigateToTab = (tabName: string) => {
    navigation.navigate("TabsScreen", { screen: tabName });
    navigation.closeDrawer();
  };

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName);
    navigation.closeDrawer();
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const planLabel = user?.plan === "pro" ? "PRO" : "BASIC";
  const planColor = user?.plan === "pro" ? palette.primary : palette.textTertiary;

  return (
    <View style={[styles.container, { backgroundColor: palette.card }]}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User header */}
        <View style={[styles.header, { borderBottomColor: palette.separator }]}>
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            <Text style={[styles.avatarText, { color: palette.textInverse }]}>{initial}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.userName, { color: palette.text }]} numberOfLines={1}>
              {user?.name || "Usuario"}
            </Text>
            <Text style={[styles.userEmail, { color: palette.textSecondary }]} numberOfLines={1}>
              {user?.email || ""}
            </Text>
            <View style={[styles.planBadge, { borderColor: planColor }]}>
              <Text style={[styles.planBadgeText, { color: planColor }]}>
                {planLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Principal section */}
        <SectionHeader title="PRINCIPAL" palette={palette} />
        <DrawerItem
          label="Inicio"
          icon={<Home size={iconSize} color={activeRoute === "TabsScreen" ? palette.primary : palette.textSecondary} />}
          onPress={() => navigateToTab("HomeTab")}
          isActive={activeRoute === "TabsScreen"}
          palette={palette}
        />
        <DrawerItem
          label="Calendario"
          icon={<CalendarDays size={iconSize} color={palette.textSecondary} />}
          onPress={() => navigateToTab("CalendarTab")}
          palette={palette}
        />
        <DrawerItem
          label="Clientes"
          icon={<Users size={iconSize} color={palette.textSecondary} />}
          onPress={() => navigateToTab("ClientTab")}
          palette={palette}
        />

        <Divider palette={palette} />

        {/* Catalogo section */}
        <SectionHeader title="CATÁLOGO" palette={palette} />
        <DrawerItem
          label="Productos"
          icon={<Package size={iconSize} color={activeRoute === "ProductStack" ? palette.primary : palette.textSecondary} />}
          onPress={() => navigateToScreen("ProductStack")}
          isActive={activeRoute === "ProductStack"}
          palette={palette}
        />
        <DrawerItem
          label="Inventario"
          icon={<Boxes size={iconSize} color={activeRoute === "InventoryStack" ? palette.primary : palette.textSecondary} />}
          onPress={() => navigateToScreen("InventoryStack")}
          isActive={activeRoute === "InventoryStack"}
          palette={palette}
        />

        <Divider palette={palette} />

        {/* Herramientas section */}
        <SectionHeader title="HERRAMIENTAS" palette={palette} />
        <DrawerItem
          label="Búsqueda"
          icon={<Search size={iconSize} color={activeRoute === "SearchScreen" ? palette.primary : palette.textSecondary} />}
          onPress={() => navigateToScreen("SearchScreen")}
          isActive={activeRoute === "SearchScreen"}
          palette={palette}
        />
        <DrawerItem
          label="Configuración"
          icon={<Settings size={iconSize} color={activeRoute === "SettingsStack" ? palette.primary : palette.textSecondary} />}
          onPress={() => navigateToScreen("SettingsStack")}
          isActive={activeRoute === "SettingsStack"}
          palette={palette}
        />
        <DrawerItem
          label="Planes"
          icon={<CreditCard size={iconSize} color={palette.textSecondary} />}
          onPress={() => {
            navigation.navigate("SettingsStack", { screen: "Pricing" });
            navigation.closeDrawer();
          }}
          palette={palette}
        />
      </DrawerContentScrollView>

      {/* Sign out button at bottom */}
      <View style={[styles.footer, { borderTopColor: palette.separator }]}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={signOut}
          activeOpacity={0.7}
        >
          <LogOut size={iconSize} color={palette.error} />
          <Text style={[styles.signOutText, { color: palette.error }]}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  planBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 6,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  drawerItemIcon: {
    width: 28,
    alignItems: "center",
  },
  drawerItemLabel: {
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 12,
  },
});
