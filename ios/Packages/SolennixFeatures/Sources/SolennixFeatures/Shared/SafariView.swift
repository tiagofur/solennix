import SwiftUI
import SafariServices
import SolennixDesign

// MARK: - Identifiable URL Wrapper

/// Wraps a `URL` to make it `Identifiable` so it can be used with
/// `.sheet(item:)` bindings.
public struct IdentifiableURL: Identifiable, Hashable {
    public let id: URL
    public var url: URL { id }

    public init(_ url: URL) {
        self.id = url
    }
}

// MARK: - Safari View

/// In-app Safari sheet for showing external web content (Terms, Privacy, etc.)
/// without leaving the app. Preferred over pushing a custom WKWebView or using
/// `openURL`, because `SFSafariViewController` is Apple-native, keeps cookies
/// isolated, and is the App Store-recommended pattern for legal documents.
public struct SafariView: UIViewControllerRepresentable {

    public let url: URL

    public init(url: URL) {
        self.url = url
    }

    public func makeUIViewController(context: Context) -> SFSafariViewController {
        let config = SFSafariViewController.Configuration()
        config.entersReaderIfAvailable = false
        config.barCollapsingEnabled = true

        let vc = SFSafariViewController(url: url, configuration: config)
        vc.preferredControlTintColor = UIColor(SolennixColors.primary)
        vc.dismissButtonStyle = .close
        return vc
    }

    public func updateUIViewController(_ controller: SFSafariViewController, context: Context) {
        // No-op: SFSafariViewController owns its own state.
    }
}
