import XCTest
import Foundation
import SolennixCore

final class AnyCodableTests: XCTestCase {

    func testInitFromAnyMapsPrimitiveTypes() {
        XCTAssertEqual(AnyCodable(true).value, .bool(true))
        XCTAssertEqual(AnyCodable(42).value, .int(42))
        XCTAssertEqual(AnyCodable(3.14).value, .double(3.14))
        XCTAssertEqual(AnyCodable("hola").value, .string("hola"))
        XCTAssertEqual(AnyCodable(nil).value, .null)
    }

    func testInitFromAnyMapsCollectionsRecursively() {
        let value: [String: Any?] = [
            "name": "Ana",
            "enabled": true,
            "count": 2,
            "nested": ["score": 9.5],
            "items": ["a", 1, nil]
        ]

        let wrapped = AnyCodable(value).value

        guard case .object(let object) = wrapped else {
            XCTFail("Expected object")
            return
        }

        XCTAssertEqual(object["name"], .string("Ana"))
        XCTAssertEqual(object["enabled"], .bool(true))
        XCTAssertEqual(object["count"], .int(2))

        if case .object(let nested)? = object["nested"] {
            XCTAssertEqual(nested["score"], .double(9.5))
        } else {
            XCTFail("Expected nested object")
        }

        if case .array(let items)? = object["items"] {
            XCTAssertEqual(items.count, 3)
            XCTAssertEqual(items[0], .string("a"))
            XCTAssertEqual(items[1], .int(1))
            XCTAssertEqual(items[2], .null)
        } else {
            XCTFail("Expected array")
        }
    }

    func testUnsupportedTypeFallsBackToNull() {
        XCTAssertEqual(AnyCodable(Date()).value, .null)
    }

    func testDecodingNestedJSONProducesExpectedValueTree() throws {
        let json = """
        {
          "name": "test",
          "enabled": true,
          "value": 10,
          "ratio": 2.5,
          "list": [1, "two", null],
          "meta": { "ok": false }
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode([String: AnyCodable].self, from: json)

        XCTAssertEqual(decoded["name"]?.value, .string("test"))
        XCTAssertEqual(decoded["enabled"]?.value, .bool(true))
        XCTAssertEqual(decoded["value"]?.value, .int(10))
        XCTAssertEqual(decoded["ratio"]?.value, .double(2.5))

        if case .array(let list)? = decoded["list"]?.value {
            XCTAssertEqual(list, [.int(1), .string("two"), .null])
        } else {
            XCTFail("Expected list array")
        }

        if case .object(let meta)? = decoded["meta"]?.value {
            XCTAssertEqual(meta["ok"], .bool(false))
        } else {
            XCTFail("Expected meta object")
        }
    }

    func testEncodingRoundTripPreservesAnyCodableValue() throws {
        let original: [String: AnyCodable] = [
            "payload": AnyCodable([
                "name": "evento",
                "amount": 1500.0,
                "tags": ["vip", "wedding"]
            ] as [String: Any?]),
            "flag": AnyCodable(true)
        ]

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode([String: AnyCodable].self, from: data)

        XCTAssertEqual(decoded["flag"]?.value, .bool(true))
        guard case .object(let payload)? = decoded["payload"]?.value else {
            XCTFail("Expected payload object")
            return
        }
        XCTAssertEqual(payload["name"], .string("evento"))
        if let amount = payload["amount"] {
            switch amount {
            case .int(let value):
                XCTAssertEqual(value, 1500)
            case .double(let value):
                XCTAssertEqual(value, 1500.0, accuracy: 0.0001)
            default:
                XCTFail("Expected numeric amount")
            }
        } else {
            XCTFail("Expected amount field")
        }
        XCTAssertEqual(payload["tags"], .array([.string("vip"), .string("wedding")]))
    }

    func testNotificationNameConstantsAreStable() {
        XCTAssertEqual(Notification.Name.solennixPaymentRegistered.rawValue, "solennix.payment.registered")
        XCTAssertEqual(Notification.Name.solennixPaymentDeleted.rawValue, "solennix.payment.deleted")
        XCTAssertEqual(Notification.Name.solennixEventUpdated.rawValue, "solennix.event.updated")
    }
}
