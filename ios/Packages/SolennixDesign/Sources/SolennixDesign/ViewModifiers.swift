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
                        // "Done" toolbar label. Resolved as an explicit
                        // LocalizedStringKey against the app catalog
                        // (common.action.done) so it localizes per locale.
                        Text(LocalizedStringKey("common.action.done"))
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

// MARK: - Adaptive Searchable (pushed list screens)

public extension View {
    /// Search affordance for list screens pushed onto a NavigationStack.
    ///
    /// - iOS 26+: default placement (system bottom-aligned field) with the
    ///   minimized magnifier behavior — identical to the rest of the app's
    ///   Apple-style search treatment.
    /// - iOS 17–25: `navigationBarDrawer(displayMode: .always)` so the field
    ///   is always visible; the default placement on pushed screens hides the
    ///   field until the user pulls down, which makes search undiscoverable.
    @ViewBuilder
    func solennixSearchable(text: Binding<String>, prompt: String) -> some View {
        if #available(iOS 26.0, *) {
            self.searchable(text: text, prompt: prompt)
                .searchToolbarBehavior(.minimize)
        } else {
            self.searchable(text: text, placement: .navigationBarDrawer(displayMode: .always), prompt: prompt)
        }
    }
}

// MARK: - Toolbar Spacer Note
// ToolbarSpacer (iOS 26) is a ToolbarContent type, not a View — it cannot be
// wrapped in a ViewModifier. Use #available(iOS 26.0, *) inline at each call
// site within a .toolbar { } block.

// MARK: - Solennix List / Form Theming

public extension View {

    /// Applies the Solennix card background to a Form/List row.
    ///
    /// Apply to each row inside a `Section`:
    /// ```swift
    /// Form {
    ///     Section {
    ///         TextField("Name", text: $name).solennixRow()
    ///         Picker("Type", selection: $type) { ... }.solennixRow()
    ///     }
    /// }
    /// .solennixListStyle()
    /// ```
    ///
    /// Apply to each row inside a `Section`:
    /// ```swift
    /// Form {
    ///     Section {
    ///         TextField("Name", text: $name).solennixRow()
    ///         Picker("Type", selection: $type) { ... }.solennixRow()
    ///     }
    /// }
    /// .solennixListStyle()
    /// ```
    func solennixRow() -> some View {
        self.listRowBackground(SolennixColors.card)
    }

    /// Applies the Solennix page background, hides the system scroll background,
    /// and sets the primary tint — apply once to the `Form` or `List`.
    func solennixListStyle() -> some View {
        self
            .scrollContentBackground(.hidden)
            .background(SolennixColors.surfaceGrouped)
            .tint(SolennixColors.primary)
    }

    /// Standard Solennix card for standalone content in `ScrollView`s and
    /// detail screens. Consolidates the `.background + .clipShape + .overlay
    /// + .shadow` pattern that was duplicated 80+ times across the app.
    ///
    /// Apply **after** `.padding()`:
    /// ```swift
    /// VStack { ... }
    ///     .padding(Spacing.md)
    ///     .solennixCard()
    /// ```
    ///
    /// - Parameters:
    ///   - radius: Corner radius. Defaults to `.card` (24pt).
    ///   - shadow: Soft elevation shadow. Defaults to `true`.
    ///   - border: Hairline border in `SolennixColors.border`. Defaults to `true`.
    func solennixCard(
        radius: CGFloat = CornerRadius.card,
        shadow: Bool = true,
        border: Bool = true
    ) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return self
            .background(SolennixColors.card)
            .clipShape(shape)
            .overlay(
                Group {
                    if border {
                        shape.stroke(SolennixColors.border, lineWidth: 1)
                    }
                }
            )
            .modifier(SolennixShadowModifier(enabled: shadow))
    }
}

/// Conditional wrapper for `.shadowSm()` so `.solennixCard(shadow: false)`
/// is a clean no-op without branching the view tree.
private struct SolennixShadowModifier: ViewModifier {
    let enabled: Bool

    func body(content: Content) -> some View {
        if enabled {
            content.shadowSm()
        } else {
            content
        }
    }
}

// MARK: - View-Scoped Task Cancellation (issue #817)

/// Tracks the last fire-and-forget `Task` started from a button/action and
/// cancels it when the view disappears, preventing stale mutations and orphan
/// toasts on a screen the user already left.
///
/// Use the ``View/viewScopedTask(scoped:)`` view modifier to wire cancellation.
/// Call `start { await ... }` from any button/confirm action instead of writing
/// `Task { await ... }` directly.
///
/// ```swift
/// @State private var scoped: ViewScopedTask?
///
/// var body: some View {
///     Form { ... }
///         .viewScopedTask(scoped: $scoped)
///         .toolbar {
///             ToolbarItem {
///                 Button("Save") {
///                     scoped?.start {
///                         if await viewModel.save() { dismiss() }
///                     }
///                 }
///             }
///         }
/// }
/// ```
@MainActor
public final class ViewScopedTask {
    fileprivate var current: Task<Void, Never>?

    /// Starts `operation`, cancelling any previously running scoped task first.
    /// The task is also cancelled automatically when the view disappears.
    public func start(_ operation: @escaping @Sendable () async -> Void) {
        current?.cancel()
        current = Task(operation: operation)
    }

    fileprivate func cancel() {
        current?.cancel()
        current = nil
    }
}

/// ViewModifier backing ``View/viewScopedTask(scoped:)``. Holds the
/// `ViewScopedTask` in `@State` and cancels it on disappear.
struct ViewScopedTaskModifier: ViewModifier {
    @Binding var scoped: ViewScopedTask?

    func body(content: Content) -> some View {
        content
            .onAppear {
                if scoped == nil { scoped = ViewScopedTask() }
            }
            .onDisappear {
                scoped?.cancel()
            }
    }
}

public extension View {
    /// Wires view-lifetime cancellation for fire-and-forget tasks started from
    /// buttons or confirm actions (issue #817).
    ///
    /// Assign to a `@State private var scoped: ViewScopedTask?` and call
    /// `scoped?.start { await ... }` instead of `Task { await ... }`. The task
    /// is cancelled when the view disappears.
    func viewScopedTask(scoped: Binding<ViewScopedTask?>) -> some View {
        modifier(ViewScopedTaskModifier(scoped: scoped))
    }
}

