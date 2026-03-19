import CoreSpotlight
import UniformTypeIdentifiers
import SolennixCore

// MARK: - Spotlight Indexer

/// Indexa contenido de la app en Core Spotlight para que los usuarios
/// puedan buscar clientes, eventos y productos desde la búsqueda del sistema.
public enum SpotlightIndexer {

    // MARK: - Identificadores de Dominio

    private static let clientDomain = "com.solennix.client"
    private static let eventDomain = "com.solennix.event"
    private static let productDomain = "com.solennix.product"

    // MARK: - Indexar Clientes

    /// Indexa una lista de clientes en Core Spotlight.
    /// - Parameter clients: Los clientes a indexar.
    public static func indexClients(_ clients: [Client]) {
        let items = clients.map { client -> CSSearchableItem in
            let attributes = CSSearchableItemAttributeSet(contentType: .text)
            attributes.title = client.name
            attributes.contentDescription = buildClientDescription(client)
            attributes.keywords = buildClientKeywords(client)
            attributes.phoneNumbers = [client.phone]

            if let email = client.email {
                attributes.emailAddresses = [email]
            }

            return CSSearchableItem(
                uniqueIdentifier: "solennix.client.\(client.id)",
                domainIdentifier: clientDomain,
                attributeSet: attributes
            )
        }

        indexItems(items)
    }

    // MARK: - Indexar Eventos

    /// Indexa una lista de eventos en Core Spotlight.
    /// - Parameter events: Los eventos a indexar.
    /// - Parameter clientMap: Diccionario de ID de cliente a nombre para enriquecer la descripción.
    public static func indexEvents(_ events: [Event], clientMap: [String: String] = [:]) {
        let items = events.map { event -> CSSearchableItem in
            let attributes = CSSearchableItemAttributeSet(contentType: .text)

            let clientName = clientMap[event.clientId] ?? "Cliente"
            attributes.title = "\(event.serviceType) — \(clientName)"
            attributes.contentDescription = buildEventDescription(event, clientName: clientName)
            attributes.keywords = buildEventKeywords(event, clientName: clientName)

            // Fecha del evento como fecha de contenido
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            formatter.locale = Locale(identifier: "es_MX")
            if let date = formatter.date(from: String(event.eventDate.prefix(10))) {
                attributes.contentCreationDate = date
            }

            if let location = event.location {
                attributes.namedLocation = location
            }

            return CSSearchableItem(
                uniqueIdentifier: "solennix.event.\(event.id)",
                domainIdentifier: eventDomain,
                attributeSet: attributes
            )
        }

        indexItems(items)
    }

    // MARK: - Indexar Productos

    /// Indexa una lista de productos en Core Spotlight.
    /// - Parameter products: Los productos a indexar.
    public static func indexProducts(_ products: [Product]) {
        let items = products.map { product -> CSSearchableItem in
            let attributes = CSSearchableItemAttributeSet(contentType: .text)
            attributes.title = product.name
            attributes.contentDescription = buildProductDescription(product)
            attributes.keywords = buildProductKeywords(product)

            return CSSearchableItem(
                uniqueIdentifier: "solennix.product.\(product.id)",
                domainIdentifier: productDomain,
                attributeSet: attributes
            )
        }

        indexItems(items)
    }

    // MARK: - Eliminar Todo

    /// Elimina todos los elementos indexados de Core Spotlight.
    public static func removeAll() {
        CSSearchableIndex.default().deleteAllSearchableItems { error in
            if let error {
                print("[SpotlightIndexer] Error eliminando índice: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Helpers Privados

    /// Indexa un arreglo de items en Core Spotlight.
    private static func indexItems(_ items: [CSSearchableItem]) {
        guard !items.isEmpty else { return }

        CSSearchableIndex.default().indexSearchableItems(items) { error in
            if let error {
                print("[SpotlightIndexer] Error indexando items: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Descripción de Clientes

    private static func buildClientDescription(_ client: Client) -> String {
        var parts: [String] = []
        parts.append("Tel: \(client.phone)")

        if let email = client.email, !email.isEmpty {
            parts.append("Email: \(email)")
        }
        if let city = client.city, !city.isEmpty {
            parts.append(city)
        }
        if let totalEvents = client.totalEvents, totalEvents > 0 {
            parts.append("\(totalEvents) evento(s)")
        }

        return parts.joined(separator: " · ")
    }

    private static func buildClientKeywords(_ client: Client) -> [String] {
        var keywords = ["cliente", "solennix"]
        keywords.append(contentsOf: client.name.components(separatedBy: " "))
        keywords.append(client.phone)

        if let email = client.email { keywords.append(email) }
        if let city = client.city { keywords.append(city) }

        return keywords
    }

    // MARK: - Descripción de Eventos

    private static func buildEventDescription(_ event: Event, clientName: String) -> String {
        var parts: [String] = []
        parts.append("Cliente: \(clientName)")
        parts.append("Fecha: \(event.eventDate.prefix(10))")
        parts.append("Estado: \(statusLabel(event.status))")
        parts.append("\(event.numPeople) personas")

        if let location = event.location, !location.isEmpty {
            parts.append(location)
        }

        return parts.joined(separator: " · ")
    }

    private static func buildEventKeywords(_ event: Event, clientName: String) -> [String] {
        var keywords = ["evento", "solennix", event.serviceType, statusLabel(event.status)]
        keywords.append(contentsOf: clientName.components(separatedBy: " "))

        if let location = event.location { keywords.append(location) }
        if let city = event.city { keywords.append(city) }

        return keywords
    }

    private static func statusLabel(_ status: EventStatus) -> String {
        switch status {
        case .quoted:    return "Cotizado"
        case .confirmed: return "Confirmado"
        case .completed: return "Completado"
        case .cancelled: return "Cancelado"
        }
    }

    // MARK: - Descripción de Productos

    private static func buildProductDescription(_ product: Product) -> String {
        var parts: [String] = []
        parts.append("Categoría: \(product.category)")

        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "es_MX")
        if let priceString = formatter.string(from: NSNumber(value: product.basePrice)) {
            parts.append("Precio: \(priceString)")
        }

        if !product.isActive {
            parts.append("(Inactivo)")
        }

        return parts.joined(separator: " · ")
    }

    private static func buildProductKeywords(_ product: Product) -> [String] {
        var keywords = ["producto", "solennix", product.name, product.category]
        keywords.append(contentsOf: product.name.components(separatedBy: " "))
        return keywords
    }
}
