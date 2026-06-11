import XCTest
import Security
@testable import SolennixNetwork

final class KeychainHelperTests: XCTestCase {

    private let helper = KeychainHelper()
    private let testKey = "com.solennix.test.keychain.migration"

    override func tearDown() {
        super.tearDown()
        // Clean up both scoped and legacy items after each test.
        helper.delete(for: testKey)
        deleteLegacyItem(for: testKey)
    }

    // MARK: - Save / Read (service-scoped)

    func testSaveAndReadString() {
        XCTAssertTrue(helper.saveString("hello", for: testKey))
        XCTAssertEqual(helper.readString(for: testKey), "hello")
    }

    func testDeleteRemovesItem() {
        helper.saveString("value", for: testKey)
        XCTAssertTrue(helper.delete(for: testKey))
        XCTAssertNil(helper.readString(for: testKey))
    }

    func testOverwriteUpdatesValue() {
        helper.saveString("first", for: testKey)
        helper.saveString("second", for: testKey)
        XCTAssertEqual(helper.readString(for: testKey), "second")
    }

    // MARK: - Migration

    func testLegacyItemIsMigratedOnRead() {
        // Write a legacy item WITHOUT kSecAttrService.
        writeLegacyItem("legacy-token", for: testKey)

        // The scoped read should trigger migration and return the value.
        let value = helper.readString(for: testKey)
        XCTAssertEqual(value, "legacy-token", "Migration should surface the legacy value")

        // After migration the legacy item should be gone.
        XCTAssertNil(readLegacyItem(for: testKey), "Legacy item should be removed after migration")

        // Subsequent reads should use the scoped item.
        XCTAssertEqual(helper.readString(for: testKey), "legacy-token")
    }

    func testNoMigrationWhenScopedItemExists() {
        helper.saveString("scoped", for: testKey)
        writeLegacyItem("legacy", for: testKey)

        // Scoped item wins; legacy item is not touched.
        XCTAssertEqual(helper.readString(for: testKey), "scoped")
    }

    // MARK: - Migration then re-save

    /// Simulates the upgrade race: legacy item is migrated on first read, then the
    /// caller immediately saves a new value. The re-save must not wipe the written item.
    func testMigrationThenResaveReadsCorrectValue() {
        // Seed legacy item.
        writeLegacyItem("legacy-token", for: testKey)

        // First read triggers migration.
        let migrated = helper.readString(for: testKey)
        XCTAssertEqual(migrated, "legacy-token")

        // Immediately re-save a refreshed value (simulates token refresh on upgrade).
        XCTAssertTrue(helper.saveString("refreshed-token", for: testKey))

        // Must read back the refreshed value, not nil.
        XCTAssertEqual(helper.readString(for: testKey), "refreshed-token")

        // Legacy item must be gone after migration.
        XCTAssertNil(readLegacyItem(for: testKey))
    }

    // MARK: - Concurrent read/save safety

    /// Concurrently saves and reads the same key across multiple threads.
    /// No read should return nil once a value has been successfully written.
    func testConcurrentSaveAndReadNeverReturnsNilAfterWrite() {
        // Establish a baseline value.
        helper.saveString("base", for: testKey)

        let iterations = 200
        var nilReadCount = 0
        let lock = NSLock()

        DispatchQueue.concurrentPerform(iterations: iterations) { i in
            if i % 2 == 0 {
                helper.saveString("value-\(i)", for: testKey)
            } else {
                let value = helper.readString(for: testKey)
                if value == nil {
                    lock.lock()
                    nilReadCount += 1
                    lock.unlock()
                }
            }
        }

        XCTAssertEqual(nilReadCount, 0, "No read should return nil while concurrent saves are in flight")
    }

    // MARK: - Helpers

    private func writeLegacyItem(_ value: String, for key: String) {
        guard let data = value.data(using: .utf8) else { return }
        // Delete first to avoid duplicates.
        deleteLegacyItem(for: key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    private func readLegacyItem(for key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    private func deleteLegacyItem(for key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
