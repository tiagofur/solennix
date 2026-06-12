import SwiftUI

// MARK: - Keyboard Done Toolbar

/// Adds a "Listo" (Done) button above the keyboard for decimal-pad and
/// number-pad keyboards that have no native dismiss key.
///
/// Apply **once per screen** — at the outermost form container — to avoid
/// duplicate toolbar items from nested view hierarchy.
///
/// ```swift
/// Form { ... }
///     .keyboardDoneToolbar()
/// ```
struct KeyboardDoneToolbarModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button(action: dismissKeyboard) {
                        // "Listo" is the Spanish-first label for this app.
                        // Using a string literal so SwiftUI resolves it as a
                        // LocalizedStringKey — the app bundle can override it
                        // per locale via Localizable.strings if needed.
                        Text("Listo")
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(SolennixColors.primary)
                }
            }
    }

    private func dismissKeyboard() {
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder),
            to: nil, from: nil, for: nil
        )
    }
}

public extension View {
    /// Injects a keyboard toolbar "Listo" button that resigns first responder.
    ///
    /// Apply once at the outermost scrollable container per screen.
    func keyboardDoneToolbar() -> some View {
        modifier(KeyboardDoneToolbarModifier())
    }
}
