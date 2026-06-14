import SwiftUI

/// Custom text field with label, icon, secure toggle, and error state.
public struct SolennixTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var leftIcon: String? = nil
    var isSecure: Bool = false
    var errorMessage: String? = nil
    var textContentType: UITextContentType? = nil
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences

    @FocusState private var isFocused: Bool
    @State private var isSecureVisible: Bool = false

    public init(
        label: String,
        text: Binding<String>,
        placeholder: String = "",
        leftIcon: String? = nil,
        isSecure: Bool = false,
        errorMessage: String? = nil,
        textContentType: UITextContentType? = nil,
        keyboardType: UIKeyboardType = .default,
        autocapitalization: TextInputAutocapitalization = .sentences
    ) {
        self.label = label
        self._text = text
        self.placeholder = placeholder
        self.leftIcon = leftIcon
        self.isSecure = isSecure
        self.errorMessage = errorMessage
        self.textContentType = textContentType
        self.keyboardType = keyboardType
        self.autocapitalization = autocapitalization
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Label
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            // Field container
            HStack(spacing: Spacing.sm) {
                // Left icon
                if let leftIcon {
                    Image(systemName: leftIcon)
                        .font(.body)
                        .foregroundStyle(isFocused ? SolennixColors.primary : SolennixColors.textTertiary)
                        .frame(width: 20)
                }

                // Text input
                if isSecure && !isSecureVisible {
                    SecureField(placeholder, text: $text)
                        .textContentType(textContentType)
                        .focused($isFocused)
                        .foregroundStyle(SolennixColors.text)
                } else {
                    TextField(placeholder, text: $text)
                        .textContentType(textContentType)
                        .keyboardType(keyboardType)
                        .textInputAutocapitalization(autocapitalization)
                        .focused($isFocused)
                        .foregroundStyle(SolennixColors.text)
                }

                // Secure toggle
                if isSecure {
                    Button {
                        isSecureVisible.toggle()
                    } label: {
                        Image(systemName: isSecureVisible ? "eye.slash" : "eye")
                            .font(.body)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(isSecureVisible ? "Ocultar contraseña" : "Mostrar contraseña")
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 14)
            .background(SolennixColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(borderColor, lineWidth: isFocused ? 2 : 1)
            )

            // Error message
            if let errorMessage, !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
            }
        }
    }

    private var borderColor: Color {
        if let errorMessage, !errorMessage.isEmpty {
            return SolennixColors.error
        }
        return isFocused ? SolennixColors.primary : SolennixColors.border
    }
}

// MARK: - Preview

#Preview("Default") {
    VStack(spacing: Spacing.md) {
        SolennixTextField(
            label: "Correo electronico",
            text: .constant(""),
            placeholder: "tu@email.com",
            leftIcon: "envelope",
            textContentType: .emailAddress,
            keyboardType: .emailAddress,
            autocapitalization: .never
        )

        SolennixTextField(
            label: "Contrasena",
            text: .constant("password123"),
            placeholder: "Tu contrasena",
            leftIcon: "lock",
            isSecure: true,
            textContentType: .password
        )

        SolennixTextField(
            label: "Nombre",
            text: .constant(""),
            placeholder: "Tu nombre",
            leftIcon: "person",
            errorMessage: "El nombre es requerido"
        )
    }
    .padding()
    .background(SolennixColors.background)
}
