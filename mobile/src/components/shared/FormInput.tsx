import React from "react";
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
}

const FormInput = React.forwardRef<RNTextInput, FormInputProps>(
  ({ label, error, icon, style, ...props }, ref) => {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.inputWrapper,
            error ? styles.inputError : undefined,
            icon ? styles.withIcon : undefined,
          ]}
        >
          {icon && <View style={styles.icon}>{icon}</View>}
          <RNTextInput
            ref={ref}
            style={[
              styles.input,
              icon ? styles.inputWithIcon : undefined,
              style,
            ]}
            placeholderTextColor={colors.light.textTertiary}
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
    ...typography.label,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: spacing.borderRadius.md,
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
  errorText: {
    ...typography.caption,
    color: colors.light.error,
    marginTop: spacing.xxs,
  },
});
