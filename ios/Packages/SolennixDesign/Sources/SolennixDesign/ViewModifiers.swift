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

// MARK: - Scroll Edge Effect (iOS 26)

public extension View {
    /// Applies `.scrollEdgeEffectStyle(.soft, for: .top)` on iOS 26+ only.
    ///
    /// On earlier OS versions this is a no-op, so the call site stays clean
    /// without per-callsite `#available` guards.
    func softScrollEdgeEffectIfAvailable() -> some View {
        if #available(iOS 26.0, *) {
            return AnyView(self.scrollEdgeEffectStyle(.soft, for: .top))
        } else {
            return AnyView(self)
        }
    }
}

// MARK: - Sheet Glass Scroll Background (iOS 26)

public extension View {
    /// Hides the `Form`/`List` scroll content background on iOS 26+ so the
    /// automatic Liquid Glass sheet background shows through.
    ///
    /// On iOS 17–25 this is a no-op — hiding the background on those versions
    /// exposes the plain sheet material, which breaks the visual design.
    func sheetFormBackground() -> some View {
        if #available(iOS 26.0, *) {
            return AnyView(self.scrollContentBackground(.hidden))
        } else {
            return AnyView(self)
        }
    }
}

// MARK: - Search Toolbar Minimize (iOS 26)

public extension View {
    /// Applies `.searchToolbarBehavior(.minimize)` on iOS 26+ only.
    ///
    /// When minimized, the search field collapses to a compact magnifier button
    /// in the toolbar and expands on tap — matching the system pattern used in
    /// tab-full apps (Maps, Music). On iOS 17–25 this is a no-op.
    ///
    /// Apply **immediately after** `.searchable` within the same NavigationStack.
    @ViewBuilder
    func searchMinimizedIfAvailable() -> some View {
        if #available(iOS 26.0, *) {
            self.searchToolbarBehavior(.minimize)
        } else {
            self
        }
    }
}

// MARK: - Toolbar Spacer Note
// ToolbarSpacer (iOS 26) is a ToolbarContent type, not a View — it cannot be
// wrapped in a ViewModifier. Use #available(iOS 26.0, *) inline at each call
// site within a .toolbar { } block.
