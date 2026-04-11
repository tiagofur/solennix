import Foundation

// MARK: - Legal URLs

/// Canonical URLs for legal documents. Single source of truth — mobile, web
/// and backend must all point to these. Updating the published documents does
/// NOT require an app release.
public enum LegalURL {

    /// Terms of Use (EULA) — https://creapolis.dev/terms-of-use/
    public static let terms = URL(string: "https://creapolis.dev/terms-of-use/")!

    /// Privacy Policy — https://creapolis.dev/privacy-policy/
    public static let privacy = URL(string: "https://creapolis.dev/privacy-policy/")!
}
