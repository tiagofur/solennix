import Foundation
import Sentry

public struct SentryHelper {

    nonisolated(unsafe) public static var isEnabled: Bool = false

    public static func configure(
        dsn: String?,
        environment: String = "development",
        releaseName: String? = nil
    ) {
        guard let dsn, !dsn.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            isEnabled = false
            return
        }

        SentrySDK.start { options in
            options.dsn = dsn
            options.environment = environment
            options.releaseName = releaseName
            options.tracesSampleRate = 0.2
            options.attachScreenshot = true
            options.attachViewHierarchy = true
            options.enableAppHangTracking = true
        }
        isEnabled = true
    }

    public static func capture(error: Error, context: String? = nil) {
        guard isEnabled else { return }

        SentrySDK.capture(error: error) { scope in
            if let context, !context.isEmpty {
                scope.setTag(value: context, key: "context")
            }
        }
    }

    public static func capture(message: String) {
        guard isEnabled else { return }
        SentrySDK.capture(message: message)
    }

    public static func setUser(id: String, email: String? = nil, name: String? = nil) {
        guard isEnabled else { return }

        let user = User()
        user.userId = id
        user.email = email
        user.username = name
        SentrySDK.setUser(user)
    }

    public static func clearUser() {
        guard isEnabled else { return }
        SentrySDK.setUser(nil)
    }
}
