import SwiftUI
import SolennixDesign

// MARK: - Review Card Container

struct ReviewCardContainer<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(Spacing.md)
            .solennixCard(radius: CornerRadius.lg, border: false)
    }
}
