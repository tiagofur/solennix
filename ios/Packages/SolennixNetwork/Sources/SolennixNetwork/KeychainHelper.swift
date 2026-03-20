import Foundation
import Security

/// A helper for securely storing and retrieving data from the iOS Keychain.
///
/// Uses `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` to ensure tokens
/// are only available when the device is unlocked and are never backed up
/// or migrated to other devices.
public final class KeychainHelper: Sendable {

    public static let standard = KeychainHelper()

    // MARK: - Keychain Keys

    public enum Keys {
        public static let accessToken = "com.solennix.app.accessToken"
        public static let refreshToken = "com.solennix.app.refreshToken"
    }

    // MARK: - Init

    public init() {}

    // MARK: - Core Operations

    /// Save raw data to the Keychain for the given key.
    @discardableResult
    public func save(_ data: Data, for key: String) -> Bool {
        // Delete any existing item first to avoid duplicates
        delete(for: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    /// Read raw data from the Keychain for the given key.
    public func read(for key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    /// Delete an item from the Keychain for the given key.
    @discardableResult
    public func delete(for key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
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
}
