import React from "react";
import { TouchableOpacity } from "react-native";
import { Menu } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";

export default function DrawerMenuButton() {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;

  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      activeOpacity={0.7}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ marginLeft: 8 }}
    >
      <Menu size={24} color={palette.text} />
    </TouchableOpacity>
  );
}
