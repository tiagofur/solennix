import SwiftUI

/// A ViewModifier that wraps `.confirmationDialog` for destructive action confirmation.
public struct ConfirmDialogModifier: ViewModifier {
    @Binding var isPresented: Bool
    let title: String
    let message: String
    let destructiveTitle: String
    let onConfirm: () -> Void

    public func body(content: Content) -> some View {
        content
            .confirmationDialog(title, isPresented: $isPresented, titleVisibility: .visible) {
                Button(destructiveTitle, role: .destructive) {
                    onConfirm()
                }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text(message)
            }
    }
}

// MARK: - View Extension

public extension View {
    /// Presents a destructive confirmation dialog.
    func confirmDialog(
        isPresented: Binding<Bool>,
        title: String,
        message: String,
        destructiveTitle: String,
        onConfirm: @escaping () -> Void
    ) -> some View {
        self.modifier(
            ConfirmDialogModifier(
                isPresented: isPresented,
                title: title,
                message: message,
                destructiveTitle: destructiveTitle,
                onConfirm: onConfirm
            )
        )
    }
}

// MARK: - Preview

#Preview("Confirm Dialog") {
    struct PreviewWrapper: View {
        @State private var showDialog = false

        var body: some View {
            Button("Eliminar Evento") {
                showDialog = true
            }
            .buttonStyle(.borderedProminent)
            .tint(SolennixColors.error)
            .confirmDialog(
                isPresented: $showDialog,
                title: "Eliminar Evento",
                message: "Esta accion no se puede deshacer. Se eliminaran todos los datos asociados.",
                destructiveTitle: "Eliminar"
            ) {
                // No-op preview handler.
            }
        }
    }
    return PreviewWrapper()
}
