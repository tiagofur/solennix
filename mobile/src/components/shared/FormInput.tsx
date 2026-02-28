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

interface FormInputProps extends RNTextInputProps {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  prefix?: string;
}

const FormInput = React.forwardRef<RNTextInput, FormInputProps>(
  ({ label, error, icon, prefix, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

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
            placeholderTextColor={colors.light.textTertiary}
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

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.footnote,
    fontWeight: "500",
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: spacing.borderRadius.md,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.light.separator,
  },
  inputError: {
    borderColor: colors.light.error,
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
    color: colors.light.text,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithPrefix: {
    paddingLeft: spacing.xs,
  },
  prefix: {
    ...typography.body,
    color: colors.light.textSecondary,
    paddingLeft: spacing.md,
  },
  errorText: {
    ...typography.caption1,
    color: colors.light.error,
    marginTop: spacing.xxs,
  },
});
