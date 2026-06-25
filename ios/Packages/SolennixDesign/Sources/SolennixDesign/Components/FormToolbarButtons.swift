import SwiftUI

// MARK: - Form Toolbar Buttons

/// Standard Cancel button for form toolbars.
///
/// Discreet `textSecondary` gray so it never competes with the Save button.
/// Use inside `.toolbar { ToolbarItem(placement: .topBarLeading) }`:
/// ```swift
/// ToolbarItem(placement: .topBarLeading) {
///     SolennixCancelButton(action: { dismiss() })
/// }
/// ```
public struct SolennixCancelButton: View {

    let title: String
    let action: () -> Void

    public init(
        title: String = "Cancelar",
        action: @escaping () -> Void
    ) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        Button(title, action: action)
            .foregroundStyle(SolennixColors.textSecondary)
    }
}

/// Standard Save button for form toolbars.
///
/// Gold (`primary`) when the form is valid and ready, muted gray
/// (`textTertiary`) when disabled — so the user always knows the state.
/// Shows a spinner while saving.
///
/// Use inside `.toolbar { ToolbarItem(placement: .topBarTrailing) }`:
/// ```swift
/// ToolbarItem(placement: .topBarTrailing) {
///     SolennixSaveButton(
///         action: { Task { await save() } },
///         isValid: viewModel.isValid,
///         isSaving: viewModel.isSaving
///     )
/// }
/// ```
public struct SolennixSaveButton: View {

    let title: String
    let action: () -> Void
    let isValid: Bool
    let isSaving: Bool

    public init(
        title: String = "Guardar",
        action: @escaping () -> Void,
        isValid: Bool = true,
        isSaving: Bool = false
    ) {
        self.title = title
        self.action = action
        self.isValid = isValid
        self.isSaving = isSaving
    }

    public var body: some View {
        Button(action: action) {
            if isSaving {
                ProgressView()
            } else {
                Text(title)
                    .fontWeight(.semibold)
                    .foregroundStyle(isValid ? SolennixColors.primary : SolennixColors.textTertiary)
            }
        }
        .disabled(!isValid || isSaving)
    }
}

// MARK: - Preview

#Preview("Form Toolbar Buttons") {
    VStack(spacing: Spacing.lg) {
        // Enabled state
        HStack {
            SolennixCancelButton(action: {})
            Spacer()
            SolennixSaveButton(action: {}, isValid: true)
        }

        // Disabled state
        HStack {
            SolennixCancelButton(action: {})
            Spacer()
            SolennixSaveButton(action: {}, isValid: false)
        }

        // Saving state
        HStack {
            SolennixCancelButton(action: {})
            Spacer()
            SolennixSaveButton(action: {}, isValid: true, isSaving: true)
        }
    }
    .padding()
    .background(SolennixColors.background)
}
