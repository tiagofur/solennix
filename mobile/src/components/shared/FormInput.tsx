import React, { useState } from "react";
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
} from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useTheme } from "../../hooks/useTheme";

interface FormInputProps extends RNTextInputProps {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  prefix?: string;
}

const FormInput = React.forwardRef<RNTextInput, FormInputProps>(
  ({ label, error, icon, prefix, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const { isDark } = useTheme();
    const palette = isDark ? colors.dark : colors.light;
    const styles = getStyles(palette);

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.inputWrapper,
            focused && styles.inputFocused,
            error ? styles.inputError : undefined,
            icon ? styles.withIcon : undefined,
          ]}
        >
          {icon && <View style={styles.icon}>{icon}</View>}
          {prefix && <Text style={styles.prefix}>{prefix}</Text>}
          <RNTextInput
            ref={ref}
            style={[
              styles.input,
              icon ? styles.inputWithIcon : undefined,
              prefix ? styles.inputWithPrefix : undefined,
              style,
            ]}
            placeholderTextColor={palette.textTertiary}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

FormInput.displayName = "FormInput";
export default FormInput;

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.footnote,
    fontWeight: "500",
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: spacing.borderRadius.md,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: palette.separator,
  },
  inputError: {
    borderColor: palette.error,
  },
  withIcon: {},
  icon: {
    paddingLeft: spacing.sm + 4,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: palette.text,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithPrefix: {
    paddingLeft: spacing.xs,
  },
  prefix: {
    ...typography.body,
    color: palette.textSecondary,
    paddingLeft: spacing.md,
  },
  errorText: {
    ...typography.caption1,
    color: palette.error,
    marginTop: spacing.xxs,
  },
});
