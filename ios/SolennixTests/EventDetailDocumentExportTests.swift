import XCTest
import SolennixFeatures

final class EventDetailDocumentExportTests: XCTestCase {

    func testOptionsContainExpectedKeysInStableOrder() {
        let keys = EventDetailDocumentExport.options.map(\.key)
        XCTAssertEqual(keys, ["cotizacion", "contrato", "insumos", "equipo", "checklist", "pagos"])
    }

    func testResolveQuoteUsesEventServiceType() {
        let result = EventDetailDocumentExport.resolve(
            for: "cotizacion",
            eventServiceType: "Boda Clasica",
            clientName: "Cliente Ignorado",
            localize: { _, fallback in fallback },
            locale: Locale(identifier: "en_US_POSIX")
        )

        XCTAssertEqual(result?.pdfType, "budget")
        XCTAssertEqual(result?.filename, "Quote_Boda_Clasica.pdf")
    }

    func testResolveContractUsesClientNameWhenPresent() {
        let result = EventDetailDocumentExport.resolve(
            for: "contrato",
            eventServiceType: "Boda Clasica",
            clientName: "Ana / Lopez: MX",
            localize: { _, fallback in fallback },
            locale: Locale(identifier: "en_US_POSIX")
        )

        XCTAssertEqual(result?.pdfType, "contract")
        XCTAssertEqual(result?.filename, "Contract_Ana_-_Lopez-_MX.pdf")
    }

    func testResolveFallsBackToEventServiceTypeWhenClientNameMissing() {
        let result = EventDetailDocumentExport.resolve(
            for: "pagos",
            eventServiceType: "XV Años",
            clientName: "   ",
            localize: { _, fallback in fallback },
            locale: Locale(identifier: "en_US_POSIX")
        )

        XCTAssertEqual(result?.pdfType, "payment-report")
        XCTAssertEqual(result?.filename, "Payments_XV_Años.pdf")
    }

    func testResolveReturnsNilForUnknownKey() {
        let result = EventDetailDocumentExport.resolve(
            for: "unknown",
            eventServiceType: "Evento",
            clientName: nil,
            localize: { _, fallback in fallback },
            locale: Locale(identifier: "en_US_POSIX")
        )

        XCTAssertNil(result)
    }

    func testResolveForEveryDeclaredOptionReturnsFilenameAndType() {
        for option in EventDetailDocumentExport.options {
            let result = EventDetailDocumentExport.resolve(
                for: option.key,
                eventServiceType: "Evento Test",
                clientName: "Cliente Test",
                localize: { _, fallback in fallback },
                locale: Locale(identifier: "en_US_POSIX")
            )

            XCTAssertNotNil(result, "Expected resolve result for key \(option.key)")
            XCTAssertFalse(result?.pdfType.isEmpty ?? true)
            XCTAssertTrue(result?.filename.hasSuffix(".pdf") ?? false)
        }
    }

    func testSanitizedFileComponentReplacesUnsafeCharacters() {
        let sanitized = EventDetailDocumentExport.sanitizedFileComponent("  Evento / VIP: Noche  ")
        XCTAssertEqual(sanitized, "Evento_-_VIP-_Noche")
    }
}
