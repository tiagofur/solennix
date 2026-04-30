import Foundation

enum InventoryStrings {
    private static var isEnglish: Bool { Locale.current.language.languageCode?.identifier == "en" }

    static let title = isEnglish ? "Inventory" : "Inventario"
    static let searchPrompt = isEnglish ? "Search inventory" : "Buscar inventario"
    static let addAccessibility = isEnglish ? "Add inventory item" : "Agregar item de inventario"
    static let deleteTitle = isEnglish ? "Delete item" : "Eliminar item"
    static let deleteAction = isEnglish ? "Delete" : "Eliminar"
    static let cancel = isEnglish ? "Cancel" : "Cancelar"
    static let retry = isEnglish ? "Retry" : "Reintentar"
    static let edit = isEnglish ? "Edit" : "Editar"
    static let adjustStock = isEnglish ? "Adjust Stock" : "Ajustar Stock"
    static let adjust = isEnglish ? "Adjust" : "Ajustar"
    static let viewDetail = isEnglish ? "View Detail" : "Ver Detalle"
    static let errorLoadingTitle = isEnglish ? "Loading error" : "Error al cargar"
    static let emptyTitle = isEnglish ? "No inventory" : "Sin inventario"
    static let emptyMessage = isEnglish ? "Add your first inventory item" : "Agrega tu primer item al inventario"
    static let emptyAction = isEnglish ? "New Item" : "Nuevo Item"
    static let filteredEmptyTitle = isEnglish ? "No results" : "Sin resultados"
    static let lowStockEmptyMessage = isEnglish ? "No low-stock items" : "No hay items con stock bajo"
    static let filteredEmptyMessage = isEnglish ? "No inventory items match the search" : "No se encontraron items que coincidan con la búsqueda"
    static let ingredients = isEnglish ? "Ingredients" : "Ingredientes"
    static let equipment = isEnglish ? "Equipment" : "Equipo"
    static let supplies = isEnglish ? "Supplies" : "Insumos"
    static let sortTitle = isEnglish ? "Sort by" : "Ordenar por"
    static let sortAscending = isEnglish ? "Ascending" : "Ascendente"
    static let sortDescending = isEnglish ? "Descending" : "Descendente"
    static let sortAccessibility = isEnglish ? "Sort inventory" : "Ordenar inventario"
    static let sortName = isEnglish ? "Name" : "Nombre"
    static let sortCurrentStock = isEnglish ? "Current stock" : "Stock actual"
    static let sortMinimumStock = isEnglish ? "Minimum stock" : "Stock mínimo"
    static let sortUnitCost = isEnglish ? "Unit cost" : "Costo unitario"
    static let hideLowStock = isEnglish ? "Hide low stock" : "Ocultar stock bajo"
    static let showLowStock = isEnglish ? "Show low stock" : "Mostrar stock bajo"
    static let loading = isEnglish ? "Loading..." : "Cargando..."
    static let errorTitle = isEnglish ? "Error" : "Error"
    static let itemFallback = isEnglish ? "Item" : "Item"
    static let stockLow = isEnglish ? "Low Stock" : "Stock Bajo"
    static let stockOk = isEnglish ? "Stock OK" : "Stock OK"
    static let minimumShort = isEnglish ? "Minimum" : "Mínimo"
    static let unitCost = isEnglish ? "Unit Cost" : "Costo Unitario"
    static let stockValue = isEnglish ? "Stock Value" : "Valor en Stock"
    static let totalValue = isEnglish ? "total value" : "valor total"
    static let critical7Days = isEnglish ? "Insufficient stock for the next 7 days!" : "¡Stock insuficiente para los próximos 7 días!"
    static let belowMinAfterEvents = isEnglish ? "Stock will fall below the minimum after upcoming events" : "Stock quedará bajo el mínimo tras eventos próximos"
    static let belowMinRecommended = isEnglish ? "Stock is below the recommended minimum" : "Stock por debajo del mínimo recomendado"
    static let enough7Days = isEnglish ? "Enough stock for the next 7 days" : "Stock suficiente para los próximos 7 días"
    static let noDemand7Days = isEnglish ? "No demand in the next 7 days" : "Sin demanda en los próximos 7 días"
    static let noUpcomingEvents = isEnglish ? "No upcoming events" : "Sin eventos próximos"
    static let currentStock = isEnglish ? "Current Stock" : "Stock Actual"
    static let recommendedMinimum = isEnglish ? "Recommended Minimum" : "Mínimo Recomendado"
    static let demandNext7Days = isEnglish ? "Demand next 7 days" : "Demanda próximos 7 días"
    static let demandByDate = isEnglish ? "Demand by Date" : "Demanda por Fecha"
    static let confirmedEvents = isEnglish ? "Confirmed events" : "Eventos confirmados"
    static let noConfirmedEvents = isEnglish ? "No confirmed events use this item." : "Sin eventos confirmados que usen este item."
    static let today = isEnglish ? "Today" : "Hoy"
    static let tomorrow = isEnglish ? "Tomorrow" : "Mañana"
    static let totalDemand = isEnglish ? "Total demand" : "Total demanda"
    static let information = isEnglish ? "Information" : "Información"
    static let costPerUnit = isEnglish ? "Cost per unit" : "Costo por unidad"
    static let totalStockValue = isEnglish ? "Total stock value" : "Valor total en stock"
    static let noUnitCost = isEnglish ? "Unit cost is not defined" : "No se ha definido un costo por unidad"
    static let lastUpdated = isEnglish ? "Last updated" : "Última actualización"
    static let newStock = isEnglish ? "New stock:" : "Nuevo stock:"
    static let save = isEnglish ? "Save" : "Guardar"
    static let ok = "OK"
    static let inventoryResource = isEnglish ? "Inventory" : "Inventario"
    static let editItemTitle = isEnglish ? "Edit Item" : "Editar Item"
    static let newItemTitle = isEnglish ? "New Item" : "Nuevo Item"
    static let informationTitle = isEnglish ? "Information" : "Información"
    static let name = isEnglish ? "Name" : "Nombre"
    static let namePlaceholder = isEnglish ? "Name" : "Nombre"
    static let type = isEnglish ? "Type" : "Tipo"
    static let ingredientType = isEnglish ? "Ingredient" : "Ingrediente"
    static let equipmentType = isEnglish ? "Equipment" : "Equipo"
    static let supplyType = isEnglish ? "Supply" : "Insumo"
    static let stockTitle = isEnglish ? "Stock" : "Stock"
    static let currentStockTitle = isEnglish ? "Current stock" : "Stock actual"
    static let minimumStockTitle = isEnglish ? "Minimum stock" : "Stock mínimo"
    static let unitTitle = isEnglish ? "Unit of Measure" : "Unidad de Medida"
    static let costOptionalTitle = isEnglish ? "Cost (Optional)" : "Costo (Opcional)"
    static let costPlaceholder = isEnglish ? "Cost per unit" : "Costo por unidad"
    static let weightGroup = isEnglish ? "Weight" : "Peso"
    static let volumeGroup = isEnglish ? "Volume" : "Volumen"
    static let countGroup = isEnglish ? "Count" : "Conteo"
    static let validationNameMin = isEnglish ? "Name must be at least 2 characters" : "El nombre debe tener al menos 2 caracteres"
    static let validationStockNegative = isEnglish ? "Stock cannot be negative" : "El stock no puede ser negativo"
    static let validationMinimumNegative = isEnglish ? "Minimum stock cannot be negative" : "El stock mínimo no puede ser negativo"
    static let validationCostNegative = isEnglish ? "Unit cost cannot be negative" : "El costo unitario no puede ser negativo"
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

    static func permanentDeletePrompt(_ name: String) -> String {
        isEnglish
            ? "Are you sure you want to delete \"\(name)\"? This action cannot be undone."
            : "¿Estás seguro de que querés eliminar \"\(name)\"? Esta acción no se puede deshacer."
    }

    static func minLabel(_ value: Int) -> String {
        isEnglish ? "(min: \(value))" : "(min: \(value))"
    }

    static func stockActual(_ stock: Int, unit: String) -> String {
        isEnglish ? "Current stock: \(stock) \(unit)" : "Stock actual: \(stock) \(unit)"
    }

    static func minimumValue(_ value: Int, unit: String) -> String {
        isEnglish ? "\(value) \(unit)" : "\(value) \(unit)"
    }

    static func perUnit(_ unit: String) -> String {
        isEnglish ? "per \(unit)" : "por \(unit)"
    }

    static func quantityWithUnit(_ value: Int, unit: String) -> String {
        isEnglish ? "\(value) \(unit)" : "\(value) \(unit)"
    }

    static func defaultEventName(serviceType: String?) -> String {
        serviceType ?? (isEnglish ? "Event" : "Evento")
    }

    static func eventWithClient(_ clientName: String) -> String {
        isEnglish ? "Event - \(clientName)" : "Evento - \(clientName)"
    }

    static func shortageMessage(demand: Int, stock: Int, missing: Int, unit: String) -> String {
        isEnglish
            ? "You need \(demand) \(unit) in the next 7 days. You have \(stock) \(unit). Missing \(missing) \(unit)."
            : "Necesitas \(demand) \(unit) en los próximos 7 días. Tienes \(stock) \(unit). Faltan \(missing) \(unit)."
    }

    static func lowStockMessage(stock: Int, unit: String, minimum: Int) -> String {
        isEnglish
            ? "Your current stock (\(stock) \(unit)) is below the recommended minimum (\(minimum) \(unit))."
            : "Tu stock actual (\(stock) \(unit)) está por debajo del mínimo recomendado (\(minimum) \(unit))."
    }

    static func inDays(_ days: Int) -> String {
        isEnglish ? "in \(days) days" : "en \(days) días"
    }
}
