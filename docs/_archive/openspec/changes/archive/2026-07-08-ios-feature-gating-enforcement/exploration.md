# Exploration: iOS Feature Gating Enforcement

This document explores and details the requirements, architectural design options, and implementation plan for enforcing feature gates on the Solennix iOS client. It investigates plan limits, event creation restrictions, custom branding (logo and brand colors) constraints, and the integration of subscription upgrade flows.

---

## 1. Context & Objectives
The Solennix iOS application enforces plan limits (e.g. Free vs. Pro/Business tiers). When a user reaches their plan limits, the app must restrict actions (such as creating new events or applying custom branding settings) and direct them to the **Pricing & Subscription Upgrade** screens.

Our exploration covers:
1. **Event Creation Gating**: Restricting event creation in [EventListView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventListView.swift) when `!planLimitsManager.canCreateEvent`.
2. **Custom Branding Gating**: Locking logo upload and brand color picker in [BusinessSettingsView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/BusinessSettingsView.swift) when `!viewModel.canCustomizeBranding`.
3. **Pricing Sheet Transition**: Wires the `PricingView` modal trigger from locked controls in settings screens.

---

## 2. Codebase Investigation

### A. Plan Limits Management (`PlanLimitsManager.swift`)
The class [PlanLimitsManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Common/ViewModels/PlanLimitsManager.swift) manages the local limit tracking. 
- Key properties:
  - `isBasicPlan`: Checks if user is on the basic/free plan (`user.plan == .basic`).
  - `canCreateEvent`: `!isBasicPlan || eventsThisMonth < Self.freePlanEventLimit` (Limit is 4 events/month).
  - `canCreateClient` (Limit 20), `canCreateProduct` (Limit 15), `canCreateInventoryItem` (Limit 30).
  - `checkLimits()`: Fetches the backend usage states and sets counts.
- Crucially, `planLimitsManager` is registered as an environment object:
  ```swift
  ContentView()
      .environment(planLimitsManager)
  ```
  It can be accessed via `@Environment(PlanLimitsManager.self) private var planLimitsManager` in our views.

### B. Event List & Creation Flow (`EventListView.swift`)
In [EventListView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventListView.swift):
- Event creation is triggered by the `+` toolbar menu and a CTA in the empty state.
- Currently, these navigate directly to `Route.eventForm()`:
  - **Toolbar Menu**:
    ```swift
    NavigationLink(value: Route.eventForm()) {
        Label(tr("events.list.new_event", "Nuevo evento"), systemImage: "calendar.badge.plus")
    }
    ```
  - **First-run Empty State CTA**:
    ```swift
    NavigationLink(value: Route.eventForm()) {
        Text(tr("events.list.empty.first_run_cta", "Crear evento"))
        ...
    }
    ```
- Limits are not checked in `EventListView.swift`’s task load. We must add:
  ```swift
  await planLimitsManager.checkLimits()
  ```

### C. Business Identity Settings (`BusinessSettingsView.swift` & `BusinessSettingsViewModel.swift`)
In [BusinessSettingsViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/ViewModels/BusinessSettingsViewModel.swift):
- Brand settings are parsed from the logged-in User profile (`user.logoUrl`, `user.brandColor`).
- The viewModel has a `canCustomizeContractTemplate` helper:
  ```swift
  public var canCustomizeContractTemplate: Bool {
      user?.plan.isPaid ?? false
  }
  ```
- **Missing Property**: There is currently no `canCustomizeBranding` property in `BusinessSettingsViewModel.swift`. We must add:
  ```swift
  public var canCustomizeBranding: Bool {
      user?.plan.isPaid ?? false
  }
  ```

In [BusinessSettingsView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/BusinessSettingsView.swift):
- The view renders:
  - A `PhotosPicker` to upload/change a logo.
  - A `ColorPicker` to customize the brand accent color.
- Currently, these controls are fully interactive for all plan tiers.

### D. Reference: Contract Defaults Gating (`ContractDefaultsView.swift`)
The [ContractDefaultsView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/ContractDefaultsView.swift) implements gating for template customization:
- It checks `!viewModel.canCustomizeContractTemplate` and renders a warning banner:
  ```swift
  if !viewModel.canCustomizeContractTemplate {
      HStack(spacing: Spacing.sm) {
          Image(systemName: "lock.fill")
              .foregroundStyle(SolennixColors.primary)
          VStack(alignment: .leading, spacing: 2) {
              Text(tr("settings.contract.pro_only", "Función exclusiva del plan Pro"))
              Text(tr("settings.contract.pro_only_hint", "Puedes usar la plantilla predeterminada; personalizarla requiere Pro."))
          }
      }
      .padding(Spacing.sm)
      .background(SolennixColors.primaryLight)
      .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
  }
  ```
- It disables the variable picker and passes `isEditable: viewModel.canCustomizeContractTemplate` to the custom editor.

---

## 3. Comparison of Implementation Approaches

### Approach A: Complete Disabling (Non-interactive)
- **Concept**: Disable the custom controls (`.disabled(!canCustomize)`) and display warning badges.
- **Pros**: Easy to implement.
- **Cons**: Low conversion. Users are blocked but have no interactive context or direct path to upgrade (they have to manually go back to Settings -> Subscription -> Upgrade).

### Approach B: Interactive Gating & Interstitial Modal (Recommended)
- **Concept**: 
  - Disable input pickers for basic plan users.
  - Overlay a semi-transparent lock interface over the restricted controls.
  - On tapping *any* of the gated visual elements, display a sheet containing `PricingView` (modal presentation).
- **Pros**: Outstanding user experience. It educates the user about the Pro capability exactly when they want to use it and provides a 1-tap pathway to purchase.
- **Cons**: Requires managing sheet state (`@State`) and dependency injection for `PricingView` in settings subviews.

---

## 4. Proposed Solution & Architecture

### Step 1: Event Creation Restrictions
Modify [EventListView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventListView.swift):
1. Inject `PlanLimitsManager`:
   ```swift
   @Environment(PlanLimitsManager.self) private var planLimitsManager
   ```
2. Trigger check on load:
   ```swift
   .task {
       ...
       await planLimitsManager.checkLimits()
   }
   ```
3. Dynamically route `NavigationLink` to `Route.pricing` when the user has exceeded their limits:
   - Toolbar button:
     ```swift
     NavigationLink(value: planLimitsManager.canCreateEvent ? Route.eventForm() : Route.pricing) {
         Label(tr("events.list.new_event", "Nuevo evento"), systemImage: "calendar.badge.plus")
     }
     ```
   - Empty state CTA:
     ```swift
     NavigationLink(value: planLimitsManager.canCreateEvent ? Route.eventForm() : Route.pricing) {
         Text(tr("events.list.empty.first_run_cta", "Crear evento"))
         ...
     }
     ```
4. Render the `UpgradeBannerView` in `safeAreaInset` at the top of the event list:
   ```swift
   if !planLimitsManager.canCreateEvent {
       NavigationLink(value: Route.pricing) {
           UpgradeBannerView(
               type: .limitReached,
               resource: tr("events.list.title", "Eventos"),
               currentUsage: planLimitsManager.eventsThisMonth,
               limit: PlanLimitsManager.freePlanEventLimit,
               ctaLabel: tr("products.upgrade_cta", "Ver planes")
           )
       }
       .buttonStyle(.plain)
       .padding(.horizontal, Spacing.md)
       .padding(.top, Spacing.sm)
   }
   ```

### Step 2: Custom Branding Settings Gating
Modify [BusinessSettingsViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/ViewModels/BusinessSettingsViewModel.swift):
```swift
public var canCustomizeBranding: Bool {
    user?.plan.isPaid ?? false
}
```

Modify [BusinessSettingsView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/BusinessSettingsView.swift):
1. Add state to manage the subscription sheet:
   ```swift
   @State private var showPricingSheet = false
   @Environment(\.apiClient) private var apiClient
   @Environment(AuthManager.self) private var authManager
   ```
2. Present `PricingView` at the bottom of `BusinessSettingsView`:
   ```swift
   .sheet(isPresented: $showPricingSheet) {
       NavigationStack {
           PricingView(apiClient: apiClient, authManager: authManager)
       }
   }
   ```
3. Intercept logo upload picker:
   ```swift
   if viewModel.canCustomizeBranding {
       PhotosPicker(selection: $viewModel.selectedPhoto, matching: .images) {
           logoUploadLabel
       }
       .disabled(viewModel.isUploadingLogo)
   } else {
       Button {
           showPricingSheet = true
       } label: {
           logoUploadLabel
               .opacity(0.6)
       }
       .buttonStyle(.plain)
   }
   ```
4. Overlay a lock overlay on the logo preview/placeholder:
   ```swift
   ZStack {
       if let logoUrl = viewModel.logoUrl, let url = APIClient.resolveURL(logoUrl) {
           // AsyncImage
       } else {
           logoPlaceholder
       }
       
       if !viewModel.canCustomizeBranding {
           Color.black.opacity(0.3)
               .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
           Image(systemName: "lock.fill")
               .font(.title2)
               .foregroundStyle(.white)
       }
   }
   .onTapGesture {
       if !viewModel.canCustomizeBranding {
           showPricingSheet = true
       }
   }
   ```
5. Gate the brand color picker:
   ```swift
   if viewModel.canCustomizeBranding {
       ColorPicker(tr("settings.business.brand_color", "Color de marca"), selection: $viewModel.brandColor)
   } else {
       HStack {
           Text(tr("settings.business.brand_color", "Color de marca"))
           Spacer()
           HStack(spacing: Spacing.xs) {
               Image(systemName: "lock.fill")
                   .foregroundStyle(SolennixColors.primary)
               Circle()
                   .fill(viewModel.brandColor)
                   .frame(width: 28, height: 28)
                   .overlay(Circle().stroke(Color.secondary.opacity(0.3), lineWidth: 1))
           }
       }
       .contentShape(Rectangle())
       .onTapGesture {
           showPricingSheet = true
       }
   }
   ```
6. Render an visual upgrade warning banner in the branding settings section:
   ```swift
   if !viewModel.canCustomizeBranding {
       Button {
           showPricingSheet = true
       } label: {
           HStack(spacing: Spacing.sm) {
               Image(systemName: "lock.fill")
                   .foregroundStyle(SolennixColors.primary)
               VStack(alignment: .leading, spacing: 2) {
                   Text(tr("settings.business.branding_pro_only", "Identidad visual Pro"))
                       .font(.subheadline)
                       .fontWeight(.semibold)
                       .foregroundStyle(SolennixColors.text)
                   Text(tr("settings.business.branding_pro_only_hint", "Personalizar el logo y colores en documentos requiere un plan Pro."))
                       .font(.caption)
                       .foregroundStyle(SolennixColors.textSecondary)
               }
               Spacer()
               Image(systemName: "chevron.right")
                   .font(.caption)
                   .foregroundStyle(SolennixColors.textTertiary)
           }
           .padding(Spacing.sm)
           .background(SolennixColors.primary.opacity(0.08))
           .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
       }
       .buttonStyle(.plain)
   }
   ```

---

## 5. Potential Risks & Edge Cases
1. **SwiftUI Gesture Conflict**: In SwiftUI, placing a gesture inside a standard Form cell row or on top of picker buttons requires defining standard buttons or setting `.contentShape(Rectangle())` so that the entire row area captures tap inputs reliably.
2. **State Syncing**: If a user completes their subscription purchase inside the presented `PricingView` sheet, the user model and limits cache must refresh dynamically so that the locked branding views unlock instantly on sheet dismissal. We must ensure `checkLimits()` and user fetching trigger post-purchase or on view appearance.
3. **Environment Propagation**: `AuthManager` and `APIClient` must be correctly configured in the Environment of `BusinessSettingsView` so that `PricingView` initializes with the correct state.

---

## 6. Next Steps
1. Approve this exploration.
2. Transition to `sdd-propose` / `sdd-spec` to lock down test scenarios (e.g. mocking basic vs premium plan users, testing limits validation).
3. Implement the feature gates under `sdd-apply`.
