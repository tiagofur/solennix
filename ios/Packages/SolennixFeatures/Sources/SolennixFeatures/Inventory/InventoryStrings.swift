import Foundation

enum InventoryStrings {
    private static var isEnglish: Bool { FeatureL10n.languageCode == "en" }

    static var title: String { FeatureL10n.text("inventory.title", "Inventario") }
    static var searchPrompt: String { FeatureL10n.text("inventory.search_prompt", "Buscar inventario") }
    static var addAccessibility: String { FeatureL10n.text("inventory.add_accessibility", "Agregar item de inventario") }
    static var deleteTitle: String { FeatureL10n.text("inventory.delete_title", "Eliminar item") }
    static var deleteAction: String { FeatureL10n.text("inventory.delete_action", "Eliminar") }
    static var cancel: String { FeatureL10n.text("inventory.cancel", "Cancelar") }
    static var retry: String { FeatureL10n.text("inventory.retry", "Reintentar") }
    static var edit: String { FeatureL10n.text("inventory.edit", "Editar") }
    static var adjustStock: String { FeatureL10n.text("inventory.adjust_stock", "Ajustar Stock") }
    static var adjust: String { FeatureL10n.text("inventory.adjust", "Ajustar") }
    static var viewDetail: String { FeatureL10n.text("inventory.view_detail", "Ver Detalle") }
    static var errorLoadingTitle: String { FeatureL10n.text("inventory.error_loading_title", "Error al cargar") }
    static var emptyTitle: String { FeatureL10n.text("inventory.empty_title", "Sin inventario") }
    static var emptyMessage: String { FeatureL10n.text("inventory.empty_message", "Agrega tu primer item al inventario") }
    static var emptyAction: String { FeatureL10n.text("inventory.empty_action", "Nuevo Item") }
    static var filteredEmptyTitle: String { FeatureL10n.text("inventory.filtered_empty_title", "Sin resultados") }
    static var lowStockEmptyMessage: String { FeatureL10n.text("inventory.low_stock_empty_message", "No hay items con stock bajo") }
    static var filteredEmptyMessage: String { FeatureL10n.text("inventory.filtered_empty_message", "No se encontraron items que coincidan con la búsqueda") }
    static var ingredients: String { FeatureL10n.text("inventory.ingredients", "Ingredientes") }
    static var equipment: String { FeatureL10n.text("inventory.equipment", "Equipo") }
    static var supplies: String { FeatureL10n.text("inventory.supplies", "Insumos") }
    static var sortTitle: String { FeatureL10n.text("inventory.sort_title", "Ordenar por") }
    static var sortAscending: String { FeatureL10n.text("inventory.sort_ascending", "Ascendente") }
    static var sortDescending: String { FeatureL10n.text("inventory.sort_descending", "Descendente") }
    static var sortAccessibility: String { FeatureL10n.text("inventory.sort_accessibility", "Ordenar inventario") }
    static var sortName: String { FeatureL10n.text("inventory.sort_name", "Nombre") }
    static var sortCurrentStock: String { FeatureL10n.text("inventory.sort_current_stock", "Stock actual") }
    static var sortMinimumStock: String { FeatureL10n.text("inventory.sort_minimum_stock", "Stock mínimo") }
    static var sortUnitCost: String { FeatureL10n.text("inventory.sort_unit_cost", "Costo unitario") }
    static var hideLowStock: String { FeatureL10n.text("inventory.hide_low_stock", "Ocultar stock bajo") }
    static var showLowStock: String { FeatureL10n.text("inventory.show_low_stock", "Mostrar stock bajo") }
    // Fix 10: low-stock toggle a11y value — plural-aware
    static var lowStockToggleInactive: String { FeatureL10n.text("inventory.low_stock_toggle_inactive", "desactivado") }
    static func lowStockToggleActive(_ count: Int) -> String {
        FeatureL10n.plural("inventory.low_stock_toggle_active", "activado, %lld artículos", count: count)
    }
    static var loading: String { FeatureL10n.text("inventory.loading", "Cargando...") }
    static var errorTitle: String { FeatureL10n.text("inventory.error_title", "Error") }
    static var itemFallback: String { FeatureL10n.text("inventory.item_fallback", "Item") }
    static var stockLow: String { FeatureL10n.text("inventory.stock_low", "Stock Bajo") }
    static var stockOk: String { FeatureL10n.text("inventory.stock_ok", "Stock OK") }
    static var minimumShort: String { FeatureL10n.text("inventory.minimum_short", "Mínimo") }
    static var unitCost: String { FeatureL10n.text("inventory.unit_cost", "Costo Unitario") }
    static var stockValue: String { FeatureL10n.text("inventory.stock_value", "Valor en Stock") }
    static var totalValue: String { FeatureL10n.text("inventory.total_value", "valor total") }
    static var critical7Days: String { FeatureL10n.text("inventory.critical_7_days", "¡Stock insuficiente para los próximos 7 días!") }
    static var belowMinAfterEvents: String { FeatureL10n.text("inventory.below_min_after_events", "Stock quedará bajo el mínimo tras eventos próximos") }
    static var belowMinRecommended: String { FeatureL10n.text("inventory.below_min_recommended", "Stock por debajo del mínimo recomendado") }
    static var enough7Days: String { FeatureL10n.text("inventory.enough_7_days", "Stock suficiente para los próximos 7 días") }
    static var noDemand7Days: String { FeatureL10n.text("inventory.no_demand_7_days", "Sin demanda en los próximos 7 días") }
    static var noUpcomingEvents: String { FeatureL10n.text("inventory.no_upcoming_events", "Sin eventos próximos") }
    static var currentStock: String { FeatureL10n.text("inventory.current_stock", "Stock Actual") }
    static var recommendedMinimum: String { FeatureL10n.text("inventory.recommended_minimum", "Mínimo Recomendado") }
    static var demandNext7Days: String { FeatureL10n.text("inventory.demand_next_7_days", "Demanda próximos 7 días") }
    static var demandByDate: String { FeatureL10n.text("inventory.demand_by_date", "Demanda por Fecha") }
    static var confirmedEvents: String { FeatureL10n.text("inventory.confirmed_events", "Eventos confirmados") }
    static var noConfirmedEvents: String { FeatureL10n.text("inventory.no_confirmed_events", "Sin eventos confirmados que usen este item.") }
    static var today: String { FeatureL10n.text("inventory.today", "Hoy") }
    static var tomorrow: String { FeatureL10n.text("inventory.tomorrow", "Mañana") }
    static var totalDemand: String { FeatureL10n.text("inventory.total_demand", "Total demanda") }
    static var information: String { FeatureL10n.text("inventory.information", "Información") }
    static var costPerUnit: String { FeatureL10n.text("inventory.cost_per_unit", "Costo por unidad") }
    static var totalStockValue: String { FeatureL10n.text("inventory.total_stock_value", "Valor total en stock") }
    static var noUnitCost: String { FeatureL10n.text("inventory.no_unit_cost", "No se ha definido un costo por unidad") }
    static var lastUpdated: String { FeatureL10n.text("inventory.last_updated", "Última actualización") }
    static var newStock: String { FeatureL10n.text("inventory.new_stock", "Nuevo stock:") }
    static var save: String { FeatureL10n.text("inventory.save", "Guardar") }
    static var ok: String { FeatureL10n.text("inventory.ok", "OK") }
    static var moreActions: String { FeatureL10n.text("inventory.more_actions", "Más acciones") }
    static var stockHealthTitle: String { FeatureL10n.text("inventory.stock_health_title", "Salud del Stock") }
    static var unitDefault: String { FeatureL10n.text("inventory.unit_default", "piezas") }
    static var inventoryResource: String { FeatureL10n.text("inventory.inventory_resource", "Inventario") }
    static var upgradeCta: String { FeatureL10n.text("inventory.upgrade_cta", "Ver planes") }
    static var editItemTitle: String { FeatureL10n.text("inventory.edit_item_title", "Editar Item") }
    static var newItemTitle: String { FeatureL10n.text("inventory.new_item_title", "Nuevo Item") }
    static var informationTitle: String { FeatureL10n.text("inventory.information_title", "Información") }
    static var name: String { FeatureL10n.text("inventory.name", "Nombre") }
    static var namePlaceholder: String { FeatureL10n.text("inventory.name_placeholder", "Nombre") }
    static var type: String { FeatureL10n.text("inventory.type", "Tipo") }
    static var ingredientType: String { FeatureL10n.text("inventory.ingredient_type", "Ingrediente") }
    static var equipmentType: String { FeatureL10n.text("inventory.equipment_type", "Equipo") }
    static var supplyType: String { FeatureL10n.text("inventory.supply_type", "Insumo") }
    static var stockTitle: String { FeatureL10n.text("inventory.stock_title", "Stock") }
    static var currentStockTitle: String { FeatureL10n.text("inventory.current_stock_title", "Stock actual") }
    static var minimumStockTitle: String { FeatureL10n.text("inventory.minimum_stock_title", "Stock mínimo") }
    static var unitTitle: String { FeatureL10n.text("inventory.unit_title", "Unidad de Medida") }
    static var costOptionalTitle: String { FeatureL10n.text("inventory.cost_optional_title", "Costo (Opcional)") }
    static var costPlaceholder: String { FeatureL10n.text("inventory.cost_placeholder", "Costo por unidad") }
    static var weightGroup: String { FeatureL10n.text("inventory.weight_group", "Peso") }
    static var volumeGroup: String { FeatureL10n.text("inventory.volume_group", "Volumen") }
    static var countGroup: String { FeatureL10n.text("inventory.count_group", "Conteo") }
    static var validationNameMin: String { FeatureL10n.text("inventory.validation_name_min", "El nombre debe tener al menos 2 caracteres") }
    static var validationStockNegative: String { FeatureL10n.text("inventory.validation_stock_negative", "El stock no puede ser negativo") }
    static var validationMinimumNegative: String { FeatureL10n.text("inventory.validation_minimum_negative", "El stock mínimo no puede ser negativo") }
    static var validationCostNegative: String { FeatureL10n.text("inventory.validation_cost_negative", "El costo unitario no puede ser negativo") }
    static var unexpectedError: String { FeatureL10n.text("inventory.unexpected_error", "Ocurrió un error inesperado.") }
    static var unexpectedRetryError: String { FeatureL10n.text("inventory.unexpected_retry_error", "Ocurrió un error inesperado. Intenta de nuevo.") }

    static func deletedMessage(_ name: String) -> String {
        FeatureL10n.format("inventory.deleted_message", "%@ eliminado", name)
    }

    static func deletePrompt(_ name: String) -> String {
        FeatureL10n.format("inventory.delete_prompt", "Se eliminará \"%@\". Podrás deshacer durante unos segundos.", name)
    }

    static func permanentDeletePrompt(_ name: String) -> String {
        FeatureL10n.format("inventory.permanent_delete_prompt", "¿Estás seguro de que quieres eliminar \"%@\"? Esta acción no se puede deshacer.", name)
    }

    static func minLabel(_ value: Int) -> String {
        FeatureL10n.format("inventory.min_label", "(min: %lld)", value)
    }

    static func stockActual(_ stock: Int, unit: String) -> String {
        FeatureL10n.format("inventory.stock_actual", "Stock actual: %lld %@", stock, unit)
    }

    static func minimumValue(_ value: Int, unit: String) -> String {
        FeatureL10n.format("inventory.minimum_value", "%lld %@", value, unit)
    }

    static func perUnit(_ unit: String) -> String {
        FeatureL10n.format("inventory.per_unit", "por %@", unit)
    }

    static func quantityWithUnit(_ value: Int, unit: String) -> String {
        FeatureL10n.format("inventory.quantity_with_unit", "%lld %@", value, unit)
    }

    static func defaultEventName(serviceType: String?) -> String {
        if let type = serviceType {
            return FeatureL10n.format("inventory.default_event_name", "%@", type)
        }
        return isEnglish ? "Event" : "Evento"
    }

    static func eventWithClient(_ clientName: String) -> String {
        FeatureL10n.format("inventory.event_with_client", "Evento - %@", clientName)
    }

    static func shortageMessage(demand: Int, stock: Int, missing: Int, unit: String) -> String {
        FeatureL10n.format(
            "inventory.shortage_message",
            "Necesitas %lld %@ en los próximos 7 días. Tienes %lld %@. Faltan %lld %@.",
            demand, unit, stock, unit, missing, unit
        )
    }

    static func lowStockMessage(stock: Int, unit: String, minimum: Int) -> String {
        FeatureL10n.format(
            "inventory.low_stock_message",
            "Tu stock actual (%lld %@) está por debajo del mínimo recomendado (%lld %@).",
            stock, unit, minimum, unit
        )
    }

    static func inDays(_ days: Int) -> String {
        FeatureL10n.plural("inventory.in_days", "en %lld días", count: days)
    }

    static func stockStatusA11y(stock: String, unit: String, isLow: Bool, minimum: Int?) -> String {
        var label = FeatureL10n.format("inventory.stock_status_a11y_base", "Stock: %@ %@", stock, unit)
        if isLow, let min = minimum {
            label += ". " + FeatureL10n.format("inventory.stock_status_a11y_low", "bajo el mínimo de %lld", min)
        }
        return label
    }

    // MARK: - Scope filter (issue #551)

    static var scopeAll: String { FeatureL10n.text("inventory.scope_all", "Todos") }
    static var scopeIngredient: String { FeatureL10n.text("inventory.scope_ingredient", "Ingredientes") }
    static var scopeEquipment: String { FeatureL10n.text("inventory.scope_equipment", "Equipo") }
    static var scopeSupply: String { FeatureL10n.text("inventory.scope_supply", "Insumos") }
    static var scopeFilterAccessibility: String { FeatureL10n.text("inventory.scope_filter_accessibility", "Filtrar por tipo") }

    static var scopeEmptyIngredient: String { FeatureL10n.text("inventory.scope_empty_ingredient", "Sin ingredientes") }
    static var scopeEmptyEquipment: String { FeatureL10n.text("inventory.scope_empty_equipment", "Sin equipo") }
    static var scopeEmptySupply: String { FeatureL10n.text("inventory.scope_empty_supply", "Sin insumos") }
    static var scopeEmptyIngredientMessage: String { FeatureL10n.text("inventory.scope_empty_ingredient_message", "No hay ingredientes en el inventario") }
    static var scopeEmptyEquipmentMessage: String { FeatureL10n.text("inventory.scope_empty_equipment_message", "No hay equipo en el inventario") }
    static var scopeEmptySupplyMessage: String { FeatureL10n.text("inventory.scope_empty_supply_message", "No hay insumos en el inventario") }

    static func demandRowA11y(name: String, quantity: String, unit: String, diffDays: Int, isInsufficient: Bool) -> String {
        var label = FeatureL10n.format("inventory.demand_row_a11y", "%@: %@ %@", name, quantity, unit)
        if diffDays == 0 {
            label += ". \(FeatureL10n.text("inventory.today", "Hoy"))"
        } else if diffDays == 1 {
            label += ". \(FeatureL10n.text("inventory.tomorrow", "Mañana"))"
        } else if diffDays > 1 && diffDays <= 7 {
            label += ". " + FeatureL10n.plural("inventory.in_days", "en %lld días", count: diffDays)
        }
        if isInsufficient {
            label += ". \(FeatureL10n.text("inventory.stock_insufficient_a11y", "Stock insuficiente"))"
        }
        return label
    }
}
