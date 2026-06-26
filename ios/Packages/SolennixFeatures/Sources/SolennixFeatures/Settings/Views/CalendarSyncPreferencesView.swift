import SwiftUI
import UIKit
import SolennixDesign
import SolennixNetwork

// MARK: - Calendar Sync Preferences View

/// Settings screen for the write-only EventKit system-calendar sync (task 5.2).
///
/// It replicates the `NotificationPreferencesView` pattern (`preferenceToggle` row
/// builder, `.tint(SolennixColors.primary)`, `.solennixRow()`, `.solennixListStyle()`,
/// and the ViewModel `togglePreference`/`inFlightKeys` contract) to host:
///   • the **master sync toggle** — bound to `viewModel.togglePreference(\.syncEnabled)`
///     and the EventKit permission re-prompt surface (ADR-6);
///   • the **binary destination selector** ("Solennix" default | "Personal") wired to
///     `viewModel.setDestination(_:)` (ADR-3/ADR-4);
///   • the **write-only unidirectional warning**, shown only when the destination is
///     `.personal` (driven by `viewModel.showsWriteOnlyWarning`);
///   • the **graceful-degradation "open system Settings"** row, shown when permission
///     is denied/restricted (ADR-6).
///
/// Per the repo's ADR-8 seam philosophy, the destination selector and the warning are
/// extracted as pure, ViewModel-free seams (`CalendarSyncDestinationPicker`,
/// `CalendarSyncWriteOnlyWarning`) so they are snapshot + binding-wire testable, while
/// the master toggle reuses the private `preferenceToggle` helper verbatim from
/// `NotificationPreferencesView`.
public struct CalendarSyncPreferencesView: View {

    @State private var viewModel: CalendarSyncPreferencesViewModel

    // MARK: - Init (production — mirrors NotificationPreferencesView)

    /// Production wiring from an `APIClient`. The ViewModel builds its own shared
    /// `EventKitSyncService` + repository tied to `defaults` (see
    /// `CalendarSyncPreferencesViewModel.init(apiClient:defaults:)`).
    public init(apiClient: APIClient, defaults: UserDefaults = .standard) {
        _viewModel = State(initialValue: CalendarSyncPreferencesViewModel(apiClient: apiClient, defaults: defaults))
    }

    // MARK: - Init (test / preview)

    /// Full-control entry: inject a pre-configured ViewModel so snapshots can pin a
    /// deterministic render state (e.g. `.personal`) without firing EventKit
    /// permission flows or migrations.
    init(viewModel: CalendarSyncPreferencesViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        settingsForm
            .navigationTitle(tr("settings.calendar_sync.title", "Sincronizar con el calendario"))
            .navigationBarTitleDisplayMode(.inline)
            .solennixListStyle()
    }

    // MARK: - Content

    private var settingsForm: some View {
        Form {
            // Master sync toggle — also the EventKit permission re-prompt surface (ADR-6).
            Section {
                preferenceToggle(
                    tr("settings.calendar_sync.master_toggle", "Sincronizar con el calendario del sistema"),
                    description: tr(
                        "settings.calendar_sync.master_toggle_hint",
                        "Copia tus eventos a la app Calendario de Apple."
                    ),
                    icon: "calendar.badge.plus",
                    keyPath: \.syncEnabled,
                    id: "calendarSyncEnabled"
                )
            } header: {
                Text(tr("settings.calendar_sync.sync_section", "Sincronización"))
            } footer: {
                Text(tr(
                    "settings.calendar_sync.master_toggle_footer",
                    "Los cambios que hagas en Solennix se copian al calendario. Las ediciones en Apple Calendar no se reflejan en Solennix."
                ))
            }

            // Binary destination selector (ADR-3 / ADR-4). Kept visible so the choice
            // is discoverable; selecting a destination drives `setDestination`.
            Section {
                CalendarSyncDestinationPicker(selection: destinationBinding)
                    .solennixRow()
            } header: {
                Text(tr("settings.calendar_sync.destination_section", "Calendario de destino"))
            }

            // Write-only unidirectional transparency warning — ONLY on `.personal`.
            if viewModel.showsWriteOnlyWarning {
                Section {
                    CalendarSyncWriteOnlyWarning()
                        .solennixRow()
                }
            }

            // Destination migration in flight (ADR-4 progress surface).
            if viewModel.isMigrating {
                Section {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(tr(
                            "settings.calendar_sync.migrating",
                            "Moviendo eventos al nuevo calendario…"
                        ))
                        .font(.subheadline)
                        ProgressView(value: viewModel.migrationProgress)
                    }
                    .solennixRow()
                }
            }

            // Migration error — ask the user to re-choose a destination (ADR-3).
            if let migrationError = viewModel.migrationError {
                Section {
                    Text(migrationError)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                        .solennixRow()
                }
            }

            // Permission denied/restricted → guide to system Settings (ADR-6).
            if viewModel.shouldGuideToSettings {
                Section {
                    Button(action: openSystemSettings) {
                        Label {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text(tr(
                                    "settings.calendar_sync.open_settings",
                                    "Abrir ajustes del sistema"
                                ))
                                Text(tr(
                                    "settings.calendar_sync.open_settings_hint",
                                    "Concede acceso a Calendario desde Ajustes para activar la sincronización."
                                ))
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textTertiary)
                            }
                        } icon: {
                            Image(systemName: "gear")
                        }
                    }
                    .tint(SolennixColors.primary)
                    .solennixRow()
                }
            }
        }
    }

    // MARK: - Toggle Row (mirrors NotificationPreferencesView.preferenceToggle)

    private func preferenceToggle(
        _ title: String,
        description: String,
        icon: String,
        keyPath: ReferenceWritableKeyPath<CalendarSyncPreferencesViewModel, Bool>,
        id: String
    ) -> some View {
        Toggle(isOn: Binding(
            get: { viewModel[keyPath: keyPath] },
            set: { _ in
                Task { await viewModel.togglePreference(keyPath, id: id) }
            }
        )) {
            Label {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            } icon: {
                Image(systemName: icon)
            }
        }
        .tint(SolennixColors.primary)
        .disabled(viewModel.inFlightKeys.contains(id))
        .solennixRow()
    }

    // MARK: - Destination binding (writes through setDestination)

    /// The selector's selection binding reads `viewModel.destination` and, on a new
    /// choice, drives the migration boundary `viewModel.setDestination(_:)`. The
    /// pure `CalendarSyncDestinationPicker` seam only writes through this binding.
    private var destinationBinding: Binding<SyncDestination> {
        Binding(
            get: { viewModel.destination },
            set: { newValue in
                Task { await viewModel.setDestination(newValue) }
            }
        )
    }

    // MARK: - System Settings deep-link (ADR-6 graceful degradation)

    private func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

// MARK: - Destination selector seam (ADR-8: pure, ViewModel-free)

/// Binary destination selector: "Solennix" (default — the dedicated app-managed
/// calendar) | "Personal" (the user's default system calendar). A pure
/// `Binding<SyncDestination>` seam so it is snapshot + binding-wire testable,
/// mirroring `EventosViewModeToggle` (task 4.2). `CalendarSyncPreferencesView`
/// builds the binding so a selection drives `viewModel.setDestination(_:)`.
struct CalendarSyncDestinationPicker: View {
    @Binding var selection: SyncDestination

    var body: some View {
        Picker(selection: $selection) {
            ForEach(SyncDestination.allCases, id: \.self) { destination in
                Text(label(for: destination)).tag(destination)
            }
        } label: {
            EmptyView()
        }
        .pickerStyle(.segmented)
    }

    private func label(for destination: SyncDestination) -> String {
        switch destination {
        case .solennix:
            return FeatureL10n.text("settings.calendar_sync.destination.solennix", "Solennix")
        case .personal:
            return FeatureL10n.text("settings.calendar_sync.destination.personal", "Personal")
        }
    }
}

// MARK: - Write-only warning seam (ADR-8: pure, ViewModel-free)

/// Unidirectional write-only transparency warning shown when the destination is
/// `.personal`. Solennix → Apple Calendar is strictly one-way: system-side edits
/// do NOT flow back into Solennix. Pure so it is snapshot-testable; the View shows
/// it conditionally on `viewModel.showsWriteOnlyWarning`.
struct CalendarSyncWriteOnlyWarning: View {
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(SolennixColors.warning)
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(FeatureL10n.text(
                    "settings.calendar_sync.warning.title",
                    "Solo escritura (un solo sentido)"
                ))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SolennixColors.warning)
                Text(FeatureL10n.text(
                    "settings.calendar_sync.warning.body",
                    "Tus eventos se copian a tu calendario personal, pero los cambios que hagas en Apple Calendar no volverán a Solennix."
                ))
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .padding(Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.warningBg)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}

// MARK: - Preview

#Preview("Calendar Sync Preferences") {
    NavigationStack {
        CalendarSyncPreferencesView(apiClient: APIClient())
    }
}
