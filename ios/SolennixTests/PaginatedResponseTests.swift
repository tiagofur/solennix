import XCTest
import Foundation
import SolennixCore

final class PaginatedResponseTests: XCTestCase {

    private struct Item: Decodable, Equatable {
        let id: Int
    }

    func testDecodesFullEnvelopeWithoutFallbacks() throws {
        let json = """
        {
          "data": [{"id": 1}, {"id": 2}],
          "total": 20,
          "page": 2,
          "limit": 10,
          "total_pages": 2
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Item>.self, from: json)

        XCTAssertEqual(response.data, [Item(id: 1), Item(id: 2)])
        XCTAssertEqual(response.total, 20)
        XCTAssertEqual(response.page, 2)
        XCTAssertEqual(response.limit, 10)
        XCTAssertEqual(response.totalPages, 2)
    }

    func testInfersMissingEnvelopeFieldsFromData() throws {
        let json = """
        {
          "data": [{"id": 1}, {"id": 2}, {"id": 3}]
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Item>.self, from: json)

        XCTAssertEqual(response.total, 3)
        XCTAssertEqual(response.page, 1)
        XCTAssertEqual(response.limit, 3)
        XCTAssertEqual(response.totalPages, 1)
    }

    func testComputesTotalPagesWhenMissingUsingCeilDivision() throws {
        let json = """
        {
          "data": [{"id": 1}, {"id": 2}],
          "total": 5,
          "limit": 2
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Item>.self, from: json)

        XCTAssertEqual(response.page, 1)
        XCTAssertEqual(response.totalPages, 3)
    }

    func testUsesServerTotalPagesWhenProvided() throws {
        let json = """
        {
          "data": [{"id": 1}, {"id": 2}],
          "total": 5,
          "limit": 2,
          "total_pages": 99
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Item>.self, from: json)

        XCTAssertEqual(response.totalPages, 99)
    }

    func testInvalidPageAndLimitAreClampedToSafeMinimums() throws {
        let json = """
        {
          "data": [{"id": 1}, {"id": 2}],
          "total": 5,
          "page": 0,
          "limit": 0
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Item>.self, from: json)

        XCTAssertEqual(response.page, 1)
        XCTAssertEqual(response.limit, 1)
        XCTAssertEqual(response.totalPages, 5)
    }

    func testEmptyDataFallsBackToSafeMinimumLimitAndPages() throws {
        let json = """
        {
          "data": []
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Item>.self, from: json)

        XCTAssertEqual(response.total, 0)
        XCTAssertEqual(response.page, 1)
        XCTAssertEqual(response.limit, 1)
        XCTAssertEqual(response.totalPages, 1)
    }

    func testMissingDataFieldThrowsDecodingError() {
        let json = """
        {
          "total": 10,
          "page": 1,
          "limit": 5
        }
        """.data(using: .utf8)!

        XCTAssertThrowsError(try JSONDecoder().decode(PaginatedResponse<Item>.self, from: json))
    }
}
