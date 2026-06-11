import Foundation
import Security

/// A helper for securely storing and retrieving data from the iOS Keychain.
///
/// Uses `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` to ensure tokens
/// are only available when the device is unlocked and are never backed up
/// or migrated to other devices.
///
/// All items are scoped to the service identifier `com.solennix.app`
/// so they are isolated from other apps sharing the same keychain partition.
///
/// Migration: on the first read after an app update, items stored WITHOUT
/// a service attribute are migrated transparently so existing sessions are
/// preserved. The migration is one-shot and lazy per key.
public final class KeychainHelper: Sendable {

    public static let standard = KeychainHelper()

    // MARK: - Keychain Keys

    public enum Keys {
        public static let accessToken = "com.solennix.app.accessToken"
        public static let refreshToken = "com.solennix.app.refreshToken"
        public static let biometricUnlockEnabled = "com.solennix.app.biometricUnlockEnabled"
    }

    // MARK: - Constants

    private static let service = "com.solennix.app"

    // MARK: - Init

    public init() {}

    // MARK: - Core Operations

    /// Save raw data to the Keychain for the given key.
    @discardableResult
    public func save(_ data: Data, for key: String) -> Bool {
        // Delete any existing item first to avoid duplicates (covers both legacy
        // items without a service attribute and current items with one).
        deleteLegacy(for: key)
        delete(for: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    /// Read raw data from the Keychain for the given key.
    ///
    /// On a cache miss with the service-scoped query, attempts a legacy
    /// (no-service) read and migrates the value to the scoped item on success.
    public func read(for key: String) -> Data? {
        // Primary lookup: scoped query.
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecSuccess, let data = result as? Data {
            return data
        }

        // Fallback: legacy item without service attribute (pre-migration installs).
        return migrateIfNeeded(for: key)
    }

    /// Delete an item from the Keychain for the given key (service-scoped).
    @discardableResult
    public func delete(for key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    // MARK: - String Convenience

    /// Save a string value to the Keychain.
    @discardableResult
    public func saveString(_ value: String, for key: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        return save(data, for: key)
    }

    /// Read a string value from the Keychain.
    public func readString(for key: String) -> String? {
        guard let data = read(for: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: - Migration

    /// Read a legacy item (stored without `kSecAttrService`) and migrate it
    /// to a service-scoped item. Returns the migrated data on success.
    private func migrateIfNeeded(for key: String) -> Data? {
        let legacyQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(legacyQuery as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else { return nil }

        // Write under the service-scoped key and remove the legacy item.
        if save(data, for: key) {
            deleteLegacy(for: key)
        }
        return data
    }

    /// Delete an item that has NO service attribute (legacy items).
    @discardableResult
    private func deleteLegacy(for key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
