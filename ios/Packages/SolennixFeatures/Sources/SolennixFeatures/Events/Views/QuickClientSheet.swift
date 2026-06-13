import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

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

                    Text("Nuevo Cliente")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Text("Crea un cliente rapidamente")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .padding(.top, Spacing.md)

                // Fields
                VStack(spacing: Spacing.md) {
                    SolennixTextField(
                        label: "Nombre",
                        text: $name,
                        placeholder: "Nombre del cliente",
                        leftIcon: "person",
                        errorMessage: !name.isEmpty && name.trimmingCharacters(in: .whitespacesAndNewlines).count < 2
                            ? "Minimo 2 caracteres" : nil,
                        textContentType: .name,
                        autocapitalization: .words
                    )

                    SolennixTextField(
                        label: "Telefono",
                        text: $phone,
                        placeholder: "10 digitos",
                        leftIcon: "phone",
                        errorMessage: !phone.isEmpty && phone.filter({ $0.isNumber }).count < 10
                            ? "Minimo 10 digitos" : nil,
                        textContentType: .telephoneNumber,
                        keyboardType: .phonePad
                    )

                    SolennixTextField(
                        label: "Email (opcional)",
                        text: $email,
                        placeholder: "correo@ejemplo.com",
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
                    title: "Crear Cliente",
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
                    Button("Cancelar") {
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
    QuickClientSheet(apiClient: APIClient()) { client in
        print("Created: \(client.name)")
    }
}
