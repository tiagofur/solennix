import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

// MARK: - Quick Client Sheet

public struct QuickClientSheet: View {

    let apiClient: APIClient
    let onCreated: (Client) -> Void

    @State private var name: String = ""
    @State private var phone: String = ""
    @State private var email: String = ""
    @State private var isSaving: Bool = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    public init(apiClient: APIClient, onCreated: @escaping (Client) -> Void) {
        self.apiClient = apiClient
        self.onCreated = onCreated
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                // Header
                VStack(spacing: Spacing.xs) {
                    Image(systemName: "person.badge.plus")
                        .font(.largeTitle)
                        .foregroundStyle(SolennixColors.primary)

                    Text(tr("clients.quick.title", "Nuevo Cliente"))
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Text(tr("clients.quick.subtitle", "Crea un cliente rapidamente"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .padding(.top, Spacing.md)

                // Fields
                VStack(spacing: Spacing.md) {
                    SolennixTextField(
                        label: tr("clients.form.name", "Nombre"),
                        text: $name,
                        placeholder: tr("clients.quick.name_placeholder", "Nombre del cliente"),
                        leftIcon: "person",
                        errorMessage: !name.isEmpty && name.trimmingCharacters(in: .whitespacesAndNewlines).count < 2
                            ? tr("clients.quick.name_error", "Minimo 2 caracteres") : nil,
                        textContentType: .name,
                        autocapitalization: .words
                    )

                    SolennixTextField(
                        label: tr("clients.quick.phone_label", "Telefono"),
                        text: $phone,
                        placeholder: tr("clients.quick.phone_placeholder", "10 digitos"),
                        leftIcon: "phone",
                        errorMessage: !phone.isEmpty && phone.filter({ $0.isNumber }).count < 10
                            ? tr("clients.quick.phone_error", "Minimo 10 digitos") : nil,
                        textContentType: .telephoneNumber,
                        keyboardType: .phonePad
                    )

                    SolennixTextField(
                        label: tr("clients.quick.email_label", "Email (opcional)"),
                        text: $email,
                        placeholder: tr("clients.quick.email_placeholder", "correo@ejemplo.com"),
                        leftIcon: "envelope",
                        textContentType: .emailAddress,
                        keyboardType: .emailAddress,
                        autocapitalization: .never
                    )
                }

                // Error message
                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Spacer()

                // Create button
                PremiumButton(
                    title: tr("clients.quick.create", "Crear Cliente"),
                    isLoading: isSaving,
                    isDisabled: !isFormValid
                ) {
                    Task {
                        await createClient()
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.md)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(tr("common.cancel", "Cancelar")) {
                        dismiss()
                    }
                    .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Validation

    private var isFormValid: Bool {
        name.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
        && phone.filter({ $0.isNumber }).count >= 10
    }

    // MARK: - Create Client

    @MainActor
    private func createClient() async {
        guard isFormValid else { return }

        isSaving = true
        errorMessage = nil

        var body: [String: String] = [
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "phone": phone.trimmingCharacters(in: .whitespacesAndNewlines),
        ]

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedEmail.isEmpty {
            body["email"] = trimmedEmail
        }

        do {
            let client: Client = try await apiClient.post(Endpoint.clients, body: body)
            onCreated(client)
            dismiss()
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Ocurrio un error inesperado."
            } else {
                errorMessage = "Ocurrio un error inesperado. Intenta de nuevo."
            }
        }

        isSaving = false
    }
}

// MARK: - Preview

#Preview("Quick Client Sheet") {
    QuickClientSheet(apiClient: APIClient()) { _ in
        // No-op preview handler.
    }
}
