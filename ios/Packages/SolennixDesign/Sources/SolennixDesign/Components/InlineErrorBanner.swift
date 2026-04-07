import SwiftUI

/// Banner inline compacto para mostrar errores de carga sin romper la composición
/// del layout. Pensado para colocarse entre el header y el contenido principal
/// (en lugar de un overlay flotando sobre cards vacíos).
///
/// Uso:
/// ```swift
/// if let error = viewModel.errorMessage {
///     InlineErrorBanner(message: error) {
///         Task { await viewModel.refresh() }
///     }
/// }
/// ```
public struct InlineErrorBanner: View {

    private let title: String
    private let message: String
    private let actionTitle: String
    private let action: () -> Void

    public init(
        title: String = "No pudimos cargar los datos",
        message: String,
        actionTitle: String = "Reintentar",
        action: @escaping () -> Void
    ) {
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    public var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "wifi.exclamationmark")
                .font(.title3)
                .foregroundStyle(SolennixColors.error)
                .frame(width: 28, height: 28)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(SolennixColors.text)
                Text(message)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(2)
            }

            Spacer(minLength: Spacing.xs)

            Button(action: action) {
                Text(actionTitle)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(SolennixColors.primary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 6)
                    .background(
                        Capsule().stroke(SolennixColors.primary.opacity(0.4), lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(actionTitle) cargar datos")
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(SolennixColors.errorBg)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(SolennixColors.error.opacity(0.25), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
    }
}

#if DEBUG
#Preview("Light") {
    InlineErrorBanner(message: "Revisá tu conexión a internet e intentá de nuevo.") {}
        .padding()
        .background(SolennixColors.surfaceGrouped)
}

#Preview("Dark") {
    InlineErrorBanner(message: "Revisá tu conexión a internet e intentá de nuevo.") {}
        .padding()
        .background(SolennixColors.surfaceGrouped)
        .preferredColorScheme(.dark)
}
#endif
