import Foundation

enum ProductStrings {
    private static var isEnglish: Bool { Locale.current.language.languageCode?.identifier == "en" }

    static let title = isEnglish ? "Products" : "Productos"
    static let searchPrompt = isEnglish ? "Search products" : "Buscar productos"
    static let addProductAccessibility = isEnglish ? "Add product" : "Agregar producto"
    static let deleteTitle = isEnglish ? "Delete product" : "Eliminar producto"
    static let deleteAction = isEnglish ? "Delete" : "Eliminar"
    static let cancel = isEnglish ? "Cancel" : "Cancelar"
    static let retry = isEnglish ? "Retry" : "Reintentar"
    static let edit = isEnglish ? "Edit" : "Editar"
    static let viewDetail = isEnglish ? "View Detail" : "Ver Detalle"
    static let inactive = isEnglish ? "Inactive" : "Inactivo"
    static let errorLoadingTitle = isEnglish ? "Loading error" : "Error al cargar"
    static let emptyTitle = isEnglish ? "No products" : "Sin productos"
    static let emptyMessage = isEnglish ? "Add your first product to the catalog" : "Agrega tu primer producto al catálogo"
    static let emptyAction = isEnglish ? "New Product" : "Nuevo Producto"
    static let filteredEmptyTitle = isEnglish ? "No results" : "Sin resultados"
    static let filteredEmptyMessage = isEnglish ? "No products match the active filters" : "No se encontraron productos que coincidan con los filtros aplicados"
    static let sortTitle = isEnglish ? "Sort by" : "Ordenar por"
    static let sortAscending = isEnglish ? "Ascending" : "Ascendente"
    static let sortDescending = isEnglish ? "Descending" : "Descendente"
    static let sortAccessibility = isEnglish ? "Sort products" : "Ordenar productos"
    static let sortName = isEnglish ? "Name" : "Nombre"
    static let sortPrice = isEnglish ? "Price" : "Precio"
    static let sortCategory = isEnglish ? "Category" : "Categoría"
    static let loading = isEnglish ? "Loading..." : "Cargando..."
    static let errorTitle = isEnglish ? "Error" : "Error"
    static let notFoundTitle = isEnglish ? "Product not found" : "Producto no encontrado"
    static let notFoundMessage = isEnglish ? "Could not load product information." : "No se pudo cargar la información del producto."
    static let compositionTitle = isEnglish ? "Composition / Ingredients" : "Composición / Insumos"
    static let suppliesTitle = isEnglish ? "Supplies per Event" : "Insumos por Evento"
    static let equipmentTitle = isEnglish ? "Required Equipment" : "Equipo Necesario"
    static let totalUnitCost = isEnglish ? "Total Unit Cost" : "Costo Total por Unidad"
    static let costPerEvent = isEnglish ? "Cost per Event" : "Costo por Evento"
    static let fixedCostPerEvent = isEnglish ? "Fixed cost per event" : "Costo fijo por evento"
    static let reusableNoCost = isEnglish ? "No cost - Reusable" : "Sin costo - Reutilizable"
    static let basePrice = isEnglish ? "Base Price" : "Precio Base"
    static let perUnit = isEnglish ? "per unit" : "por unidad"
    static let unitCost = isEnglish ? "Cost / Unit" : "Costo / Unidad"
    static let inSupplies = isEnglish ? "in supplies" : "en insumos"
    static let marginEstimated = isEnglish ? "Estimated Margin" : "Margen Est."
    static let profitEstimated = isEnglish ? "estimated profit" : "utilidad estimada"
    static let upcomingEvents = isEnglish ? "Upcoming Events" : "Próx. Eventos"
    static let confirmed = isEnglish ? "confirmed" : "confirmados"
    static let noUpcomingEvents = isEnglish ? "No upcoming events" : "Sin eventos próximos"
    static let noImmediateDemand = isEnglish ? "No immediate demand" : "Sin demanda inmediata"
    static let highDemandWeek = isEnglish ? "High demand this week." : "Alta demanda esta semana."
    static let noConfirmedEvents = isEnglish ? "There are no confirmed events including this product." : "No hay eventos confirmados que incluyan este producto."
    static let generalInfo = isEnglish ? "GENERAL INFORMATION" : "INFORMACIÓN GENERAL"
    static let category = isEnglish ? "Category" : "Categoría"
    static let composition = isEnglish ? "Composition" : "Composición"
    static let ingredientHeader = isEnglish ? "ITEM" : "INSUMO"
    static let quantityHeader = isEnglish ? "QUANTITY" : "CANTIDAD"
    static let estimatedCostHeader = isEnglish ? "EST. COST" : "COSTO EST."
    static let unknownItem = isEnglish ? "Item" : "Insumo"
    static let editProductTitle = isEnglish ? "Edit Product" : "Editar Producto"
    static let newProductTitle = isEnglish ? "New Product" : "Nuevo Producto"
    static let alertErrorTitle = isEnglish ? "Error" : "Error"
    static let ok = "OK"
    static let compositionDescription = isEnglish ? "Only ingredients add cost to the product." : "Solo insumos generan costo al producto."
    static let equipmentDescription = isEnglish ? "Reusable assets. They are not included in cost." : "Activos reutilizables. No se incluyen en el costo."
    static let suppliesDescription = isEnglish ? "Fixed cost per event (e.g. oil, gas)." : "Costo fijo por evento (ej. aceite, gas)."
    static let associatedTeam = isEnglish ? "Associated team" : "Equipo asociado"
    static let associatedTeamDescription = isEnglish ? "When you add this product to an event, team members are automatically assigned as staff." : "Cuando agregues este producto a un evento, se asignan automáticamente los miembros del equipo como personal."
    static let noTeam = isEnglish ? "No team" : "Sin equipo"
    static let addTeamsHint = isEnglish ? "Add teams from Staff to sell them as a service." : "Agrega equipos desde Personal para venderlos como servicio."
    static let addPhoto = isEnglish ? "Add photo" : "Agregar foto"
    static let productInfo = isEnglish ? "Product Information" : "Información del Producto"
    static let name = isEnglish ? "Name" : "Nombre"
    static let namePlaceholder = isEnglish ? "Ex: Premium Package" : "Ej: Paquete Premium"
    static let selectCategory = isEnglish ? "Select category..." : "Seleccionar categoría..."
    static let activeProduct = isEnglish ? "Active Product" : "Producto Activo"
    static let visibleInQuotes = isEnglish ? "Visible in quotes" : "Visible en cotizaciones"
    static let existingCategories = isEnglish ? "Existing Categories" : "Categorías Existentes"
    static let newCategory = isEnglish ? "New Category" : "Nueva Categoría"
    static let newCategoryPlaceholder = isEnglish ? "New category..." : "Nueva categoría..."
    static let selectCategoryTitle = isEnglish ? "Select Category" : "Seleccionar Categoría"
    static let close = isEnglish ? "Close" : "Cerrar"
    static let save = isEnglish ? "Save" : "Guardar"
    static let add = isEnglish ? "Add" : "Agregar"
    static let noItemsAdded = isEnglish ? "No items added" : "No hay elementos agregados"
    static let selectItem = isEnglish ? "Select item..." : "Seleccionar item..."
    static let stock = isEnglish ? "Stock" : "Stock"
    static let quantity = isEnglish ? "Quantity" : "Cantidad"
    static let estimatedCostShort = isEnglish ? "Est. cost" : "Costo est."
    static let searchItemPrompt = isEnglish ? "Search item..." : "Buscar item..."
    static let selectItemTitle = isEnglish ? "Select Item" : "Seleccionar Item"
    static let unitFallback = isEnglish ? "unit" : "und"
    static let demandByDate = isEnglish ? "Demand by Date" : "Demanda por Fecha"
    static let confirmedEvents = isEnglish ? "Confirmed events" : "Eventos confirmados"
    static let today = isEnglish ? "Today" : "Hoy"
    static let tomorrow = isEnglish ? "Tomorrow" : "Mañana"
    static let totalDemandUpper = isEnglish ? "TOTAL DEMAND" : "TOTAL DEMANDA"
    static let noUpcomingEventsDescription = isEnglish ? "This product is not included in any upcoming event" : "Este producto no está incluido en ningún evento próximo"
    static let imageLoadError = isEnglish ? "Error loading image" : "Error al cargar la imagen"
    static let validationNameMin = isEnglish ? "Name must be at least 2 characters" : "El nombre debe tener al menos 2 caracteres"
    static let validationCategoryRequired = isEnglish ? "Category is required" : "La categoría es requerida"
    static let unexpectedError = isEnglish ? "An unexpected error occurred." : "Ocurrió un error inesperado."
    static let unexpectedRetryError = isEnglish ? "An unexpected error occurred. Please try again." : "Ocurrió un error inesperado. Intenta de nuevo."

    static func deletedMessage(_ name: String) -> String {
        isEnglish ? "\(name) deleted" : "\(name) eliminado"
    }

    static func deletePrompt(_ name: String) -> String {
        isEnglish
            ? "Are you sure you want to delete \"\(name)\"? You can undo for a few seconds."
            : "Se eliminará \"\(name)\". Podrás deshacer durante unos segundos."
    }

    static func unitsNext7Days(_ count: Int) -> String {
        isEnglish ? "\(count) units in the next 7 days" : "\(count) unidades en los próximos 7 días"
    }

    static func revenueMessage(_ amount: String) -> String {
        isEnglish ? "High demand this week. Estimated total revenue: \(amount)" : "Alta demanda esta semana. Ingreso estimado total: \(amount)"
    }

    static func demandSummary(units: Int, events: Int) -> String {
        isEnglish
            ? "\(units) units across \(events) upcoming event\(events == 1 ? "" : "s")."
            : "\(units) unidades en \(events) evento\(events == 1 ? "" : "s") próximos."
    }

    static func stockWithUnit(_ stock: Int, unit: String) -> String {
        isEnglish ? "Stock: \(stock) \(unit)" : "Stock: \(stock) \(unit)"
    }

    static func costPerUnit(_ amount: String, unit: String) -> String {
        isEnglish ? "· \(amount)/\(unit)" : "· \(amount)/\(unit)"
    }

    static func upcomingEventsCount(_ count: Int) -> String {
        isEnglish ? "Upcoming \(count) events" : "Próximos \(count) eventos"
    }

    static func quantityForPeople(quantity: Int, people: Int) -> String {
        isEnglish ? "Total: \(quantity) units for \(people) people" : "Total: \(quantity) unidades para \(people) personas"
    }

    static func inDays(_ days: Int) -> String {
        isEnglish ? "in \(days) days" : "en \(days) días"
    }

    static func quantityUnits(_ quantity: Int) -> String {
        isEnglish ? "\(quantity) units" : "\(quantity) uds"
    }

    static func eventCount(_ count: Int) -> String {
        isEnglish ? "\(count) event\(count == 1 ? "" : "s")" : "\(count) evento\(count == 1 ? "" : "s")"
    }

    static func estimatedAmount(_ amount: String) -> String {
        isEnglish ? "\(amount) est." : "\(amount) est."
    }

    static func compositionSummary(ingredients: Int, supplies: Int, equipment: Int) -> String {
        var parts = [isEnglish ? "\(ingredients) ingredients" : "\(ingredients) insumos"]
        if supplies > 0 { parts.append(isEnglish ? "\(supplies) supplies per event" : "\(supplies) insumos por evento") }
        if equipment > 0 { parts.append(isEnglish ? "\(equipment) equipment" : "\(equipment) equipo(s)") }
        return parts.joined(separator: ", ")
    }
}
