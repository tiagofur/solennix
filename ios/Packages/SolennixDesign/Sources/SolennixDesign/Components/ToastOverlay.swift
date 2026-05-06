import SwiftUI

// MARK: - Toast Message Model

/// Represents a single toast notification.
public struct ToastMessage: Identifiable, Equatable {
    public let id: UUID
    public let message: String
    public let type: ToastType
    public let actionLabel: String?
    public let action: (() -> Void)?

    public init(id: UUID = UUID(), message: String, type: ToastType, actionLabel: String? = nil, action: (() -> Void)? = nil) {
        self.id = id
        self.message = message
        self.type = type
        self.actionLabel = actionLabel
        self.action = action
    }

    public static func == (lhs: ToastMessage, rhs: ToastMessage) -> Bool {
        lhs.id == rhs.id
    }
}

/// Toast notification type.
public enum ToastType {
    case success
    case error
    case info

    var icon: String {
        switch self {
        case .success: return "checkmark.circle.fill"
        case .error: return "xmark.circle.fill"
        case .info: return "info.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .success: return SolennixColors.success
        case .error: return SolennixColors.error
        case .info: return SolennixColors.info
        }
    }

    var backgroundColor: Color {
        switch self {
        case .success: return SolennixColors.successBg
        case .error: return SolennixColors.errorBg
        case .info: return SolennixColors.infoBg
        }
    }
}

// MARK: - Toast Manager

/// Manages toast messages with auto-dismiss after 3 seconds.
@MainActor
@Observable
public final class ToastManager {
    public var toasts: [ToastMessage] = []

    public init() {}

    @MainActor
    public func show(message: String, type: ToastType) {
        let toast = ToastMessage(message: message, type: type)
        withAnimation(.spring(duration: 0.3)) {
            toasts.append(toast)
        }

        Task {
            try? await Task.sleep(for: .seconds(3))
            withAnimation(.easeOut(duration: 0.25)) {
                toasts.removeAll { $0.id == toast.id }
            }
        }
    }

    /// Show an undo toast with a longer duration and action button.
    /// The `onExpire` closure fires after the grace period if undo is not tapped.
    @MainActor
    public func showUndo(message: String, duration: TimeInterval = 5, onUndo: @escaping () -> Void, onExpire: @escaping () -> Void) {
        let toast = ToastMessage(message: message, type: .info, actionLabel: "Deshacer", action: onUndo)
        withAnimation(.spring(duration: 0.3)) {
            toasts.append(toast)
        }

        Task {
            try? await Task.sleep(for: .seconds(duration))
            let wasPresent = toasts.contains { $0.id == toast.id }
            withAnimation(.easeOut(duration: 0.25)) {
                toasts.removeAll { $0.id == toast.id }
            }
            if wasPresent {
                onExpire()
            }
        }
    }

    /// Dismiss a specific toast (used when undo action is tapped).
    @MainActor
    public func dismiss(_ toast: ToastMessage) {
        withAnimation(.easeOut(duration: 0.25)) {
            toasts.removeAll { $0.id == toast.id }
        }
    }
}

// MARK: - Toast Overlay View

/// Overlay that renders active toast messages at the bottom of the screen.
public struct ToastOverlay: View {
    let toasts: [ToastMessage]

    public init(toasts: [ToastMessage]) {
        self.toasts = toasts
    }

    public var body: some View {
        VStack(spacing: Spacing.sm) {
            Spacer()

            ForEach(toasts) { toast in
                toastRow(toast)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.bottom, Spacing.xxxl)
        .animation(.spring(duration: 0.3), value: toasts)
    }

    private func toastRow(_ toast: ToastMessage) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: toast.type.icon)
                .font(.body)
                .foregroundStyle(toast.type.color)

            Text(toast.message)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.text)
                .lineLimit(2)

            Spacer()

            if let actionLabel = toast.actionLabel, let action = toast.action {
                Button {
                    action()
                    // Dismiss the toast after action
                    withAnimation(.easeOut(duration: 0.25)) {
                        // Parent manages removal
                    }
                } label: {
                    Text(actionLabel)
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.primary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, 14)
        .background(toast.type.backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(toast.type.color.opacity(0.3), lineWidth: 1)
        )
        .shadowMd()
    }
}

// MARK: - View Extension

public extension View {
    /// Adds a toast overlay managed by a `ToastManager`.
    func toastOverlay(_ manager: ToastManager) -> some View {
        self.overlay(alignment: .bottom) {
            ToastOverlay(toasts: manager.toasts)
        }
    }
}

// MARK: - Preview

#Preview("Toast Overlay") {
    struct PreviewWrapper: View {
        @State private var manager = ToastManager()

        var body: some View {
            VStack(spacing: Spacing.md) {
                Button("Success") { manager.show(message: "Evento creado exitosamente", type: .success) }
                Button("Error") { manager.show(message: "No se pudo guardar el evento", type: .error) }
                Button("Info") { manager.show(message: "Tienes 3 eventos esta semana", type: .info) }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(SolennixColors.background)
            .toastOverlay(manager)
        }
    }
    return PreviewWrapper()
}
