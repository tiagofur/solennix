import Foundation

enum ProductStrings {
    static var title: String { FeatureL10n.text("products.title", "Productos") }
    static var searchPrompt: String { FeatureL10n.text("products.search_prompt", "Buscar productos") }
    static var categoryAll: String { FeatureL10n.text("products.category_all", "Todos") }
    static var categoryFilterAccessibility: String { FeatureL10n.text("products.category_filter_accessibility", "Filtrar por categoría") }
    static var addProductAccessibility: String { FeatureL10n.text("products.add_product_accessibility", "Agregar producto") }
    static var deleteTitle: String { FeatureL10n.text("products.delete_title", "Eliminar producto") }
    static var deleteAction: String { FeatureL10n.text("products.delete_action", "Eliminar") }
    static var cancel: String { FeatureL10n.text("products.cancel", "Cancelar") }
    static var retry: String { FeatureL10n.text("products.retry", "Reintentar") }
    static var edit: String { FeatureL10n.text("products.edit", "Editar") }
    static var viewDetail: String { FeatureL10n.text("products.view_detail", "Ver Detalle") }
    static var inactive: String { FeatureL10n.text("products.inactive", "Inactivo") }
    static var errorLoadingTitle: String { FeatureL10n.text("products.error_loading_title", "Error al cargar") }
    static var emptyTitle: String { FeatureL10n.text("products.empty_title", "Sin productos") }
    static var emptyMessage: String { FeatureL10n.text("products.empty_message", "Agrega tu primer producto al catálogo") }
    static var emptyAction: String { FeatureL10n.text("products.empty_action", "Nuevo Producto") }
    static var filteredEmptyTitle: String { FeatureL10n.text("products.filtered_empty_title", "Sin resultados") }
    static var filteredEmptyMessage: String { FeatureL10n.text("products.filtered_empty_message", "No se encontraron productos que coincidan con los filtros aplicados") }
    static var sortTitle: String { FeatureL10n.text("products.sort_title", "Ordenar por") }
    static var sortAscending: String { FeatureL10n.text("products.sort_ascending", "Ascendente") }
    static var sortDescending: String { FeatureL10n.text("products.sort_descending", "Descendente") }
    static var sortAccessibility: String { FeatureL10n.text("products.sort_accessibility", "Ordenar productos") }
    static var upgradeCta: String { FeatureL10n.text("products.upgrade_cta", "Ver planes") }
    static var sortName: String { FeatureL10n.text("products.sort_name", "Nombre") }
    static var sortPrice: String { FeatureL10n.text("products.sort_price", "Precio") }
    static var sortCategory: String { FeatureL10n.text("products.sort_category", "Categoría") }
    static var loading: String { FeatureL10n.text("products.loading", "Cargando...") }
    static var errorTitle: String { FeatureL10n.text("products.error_title", "Error") }
    static var notFoundTitle: String { FeatureL10n.text("products.not_found_title", "Producto no encontrado") }
    static var notFoundMessage: String { FeatureL10n.text("products.not_found_message", "No se pudo cargar la información del producto.") }
    static var compositionTitle: String { FeatureL10n.text("products.composition_title", "Composición / Insumos") }
    static var suppliesTitle: String { FeatureL10n.text("products.supplies_title", "Insumos por Evento") }
    static var equipmentTitle: String { FeatureL10n.text("products.equipment_title", "Equipo Necesario") }
    static var totalUnitCost: String { FeatureL10n.text("products.total_unit_cost", "Costo Total por Unidad") }
    static var costPerEvent: String { FeatureL10n.text("products.cost_per_event", "Costo por Evento") }
    static var fixedCostPerEvent: String { FeatureL10n.text("products.fixed_cost_per_event", "Costo fijo por evento") }
    static var reusableNoCost: String { FeatureL10n.text("products.reusable_no_cost", "Sin costo - Reutilizable") }
    static var basePrice: String { FeatureL10n.text("products.base_price", "Precio Base") }
    static var perUnit: String { FeatureL10n.text("products.per_unit", "por unidad") }
    static var unitCost: String { FeatureL10n.text("products.unit_cost", "Costo / Unidad") }
    static var inSupplies: String { FeatureL10n.text("products.in_supplies", "en insumos") }
    static var marginEstimated: String { FeatureL10n.text("products.margin_estimated", "Margen Est.") }
    static var profitEstimated: String { FeatureL10n.text("products.profit_estimated", "utilidad estimada") }
    static var upcomingEvents: String { FeatureL10n.text("products.upcoming_events", "Próx. Eventos") }
    static var confirmed: String { FeatureL10n.text("products.confirmed", "confirmados") }
    static var noUpcomingEvents: String { FeatureL10n.text("products.no_upcoming_events", "Sin eventos próximos") }
    static var noImmediateDemand: String { FeatureL10n.text("products.no_immediate_demand", "Sin demanda inmediata") }
    static var highDemandWeek: String { FeatureL10n.text("products.high_demand_week", "Alta demanda esta semana.") }
    static var noConfirmedEvents: String { FeatureL10n.text("products.no_confirmed_events", "No hay eventos confirmados que incluyan este producto.") }
    static var generalInfo: String { FeatureL10n.text("products.general_info", "INFORMACIÓN GENERAL") }
    static var category: String { FeatureL10n.text("products.category", "Categoría") }
    static var composition: String { FeatureL10n.text("products.composition", "Composición") }
    static var ingredientHeader: String { FeatureL10n.text("products.ingredient_header", "INSUMO") }
    static var quantityHeader: String { FeatureL10n.text("products.quantity_header", "CANTIDAD") }
    static var estimatedCostHeader: String { FeatureL10n.text("products.estimated_cost_header", "COSTO EST.") }
    static var unknownItem: String { FeatureL10n.text("products.unknown_item", "Insumo") }
    static var editProductTitle: String { FeatureL10n.text("products.edit_product_title", "Editar Producto") }
    static var newProductTitle: String { FeatureL10n.text("products.new_product_title", "Nuevo Producto") }
    static var alertErrorTitle: String { FeatureL10n.text("products.alert_error_title", "Error") }
    static var ok: String { FeatureL10n.text("products.ok", "OK") }
    static var compositionDescription: String { FeatureL10n.text("products.composition_description", "Solo insumos generan costo al producto.") }
    static var equipmentDescription: String { FeatureL10n.text("products.equipment_description", "Activos reutilizables. No se incluyen en el costo.") }
    static var suppliesDescription: String { FeatureL10n.text("products.supplies_description", "Costo fijo por evento (ej. aceite, gas).") }
    static var associatedTeam: String { FeatureL10n.text("products.associated_team", "Equipo asociado") }
    static var associatedTeamDescription: String { FeatureL10n.text("products.associated_team_description", "Cuando agregues este producto a un evento, se asignan automáticamente los miembros del equipo como personal.") }
    static var noTeam: String { FeatureL10n.text("products.no_team", "Sin equipo") }
    static var addTeamsHint: String { FeatureL10n.text("products.add_teams_hint", "Agrega equipos desde Personal para venderlos como servicio.") }
    static var addPhoto: String { FeatureL10n.text("products.add_photo", "Agregar foto") }
    static var productInfo: String { FeatureL10n.text("products.product_info", "Información del Producto") }
    static var name: String { FeatureL10n.text("products.name", "Nombre") }
    static var namePlaceholder: String { FeatureL10n.text("products.name_placeholder", "Ej: Paquete Premium") }
    static var selectCategory: String { FeatureL10n.text("products.select_category", "Seleccionar categoría...") }
    static var activeProduct: String { FeatureL10n.text("products.active_product", "Producto Activo") }
    static var visibleInQuotes: String { FeatureL10n.text("products.visible_in_quotes", "Visible en cotizaciones") }
    static var existingCategories: String { FeatureL10n.text("products.existing_categories", "Categorías Existentes") }
    static var newCategory: String { FeatureL10n.text("products.new_category", "Nueva Categoría") }
    static var newCategoryPlaceholder: String { FeatureL10n.text("products.new_category_placeholder", "Nueva categoría...") }
    static var selectCategoryTitle: String { FeatureL10n.text("products.select_category_title", "Seleccionar Categoría") }
    static var close: String { FeatureL10n.text("products.close", "Cerrar") }
    static var save: String { FeatureL10n.text("products.save", "Guardar") }
    static var add: String { FeatureL10n.text("products.add", "Agregar") }
    static var noItemsAdded: String { FeatureL10n.text("products.no_items_added", "No hay elementos agregados") }
    static var selectItem: String { FeatureL10n.text("products.select_item", "Seleccionar item...") }
    static var stock: String { FeatureL10n.text("products.stock", "Stock") }
    static var quantity: String { FeatureL10n.text("products.quantity", "Cantidad") }
    static var estimatedCostShort: String { FeatureL10n.text("products.estimated_cost_short", "Costo est.") }
    static var searchItemPrompt: String { FeatureL10n.text("products.search_item_prompt", "Buscar item...") }
    static var selectItemTitle: String { FeatureL10n.text("products.select_item_title", "Seleccionar Item") }
    static var unitFallback: String { FeatureL10n.text("products.unit_fallback", "und") }
    static var demandByDate: String { FeatureL10n.text("products.demand_by_date", "Demanda por Fecha") }
    static var confirmedEvents: String { FeatureL10n.text("products.confirmed_events", "Eventos confirmados") }
    static var today: String { FeatureL10n.text("products.today", "Hoy") }
    static var tomorrow: String { FeatureL10n.text("products.tomorrow", "Mañana") }
    static var totalDemandUpper: String { FeatureL10n.text("products.total_demand_upper", "TOTAL DEMANDA") }
    static var noUpcomingEventsDescription: String { FeatureL10n.text("products.no_upcoming_events_description", "Este producto no está incluido en ningún evento próximo") }
    static var imageLoadError: String { FeatureL10n.text("products.image_load_error", "Error al cargar la imagen") }
    static var validationNameMin: String { FeatureL10n.text("products.validation_name_min", "El nombre debe tener al menos 2 caracteres") }
    static var validationCategoryRequired: String { FeatureL10n.text("products.validation_category_required", "La categoría es requerida") }
    static var unexpectedError: String { FeatureL10n.text("products.unexpected_error", "Ocurrió un error inesperado.") }
    static var unexpectedRetryError: String { FeatureL10n.text("products.unexpected_retry_error", "Ocurrió un error inesperado. Intenta de nuevo.") }

    static func deletedMessage(_ name: String) -> String {
        FeatureL10n.format("products.deleted_message", "%@ eliminado", name)
    }

    static func deletePrompt(_ name: String) -> String {
        FeatureL10n.format("products.delete_prompt", "Se eliminará \"%@\". Podrás deshacer durante unos segundos.", name)
    }

    static func unitsNext7Days(_ count: Int) -> String {
        FeatureL10n.format("products.units_next_7_days", "%lld unidades en los próximos 7 días", count)
    }

    static func revenueMessage(_ amount: String) -> String {
        FeatureL10n.format("products.revenue_message", "Alta demanda esta semana. Ingreso estimado total: %@", amount)
    }

    static func demandSummary(units: Int, events: Int) -> String {
        let key: String
        let fallback: String
        if units == 1 && events == 1 {
            key = "products.demand_summary.one_one"
            fallback = "%lld unidad en %lld evento próximo"
        } else if units == 1 {
            key = "products.demand_summary.one_other"
            fallback = "%lld unidad en %lld eventos próximos"
        } else if events == 1 {
            key = "products.demand_summary.other_one"
            fallback = "%lld unidades en %lld evento próximo"
        } else {
            key = "products.demand_summary.other_other"
            fallback = "%lld unidades en %lld eventos próximos"
        }
        
        let template = FeatureL10n.text(key, fallback)
        return String(format: template, locale: FeatureL10n.locale, units, events)
    }

    static func stockWithUnit(_ stock: Int, unit: String) -> String {
        FeatureL10n.format("products.stock_with_unit", "Stock: %lld %@", stock, unit)
    }

    static func costPerUnit(_ amount: String, unit: String) -> String {
        FeatureL10n.format("products.cost_per_unit", "· %@/%@", amount, unit)
    }

    static func upcomingEventsCount(_ count: Int) -> String {
        FeatureL10n.format("products.upcoming_events_count", "Próximos %lld eventos", count)
    }

    static func quantityForPeople(quantity: Int, people: Int) -> String {
        FeatureL10n.format("products.quantity_for_people", "Total: %lld unidades para %lld personas", quantity, people)
    }

    static func inDays(_ days: Int) -> String {
        FeatureL10n.format("products.in_days", "en %lld días", days)
    }

    static func quantityUnits(_ quantity: Int) -> String {
        FeatureL10n.format("products.quantity_units", "%lld uds", quantity)
    }

    static func eventCount(_ count: Int) -> String {
        let key = count == 1 ? "products.event_count_one" : "products.event_count_other"
        let fallback = count == 1 ? "%lld evento" : "%lld eventos"
        return FeatureL10n.format(key, fallback, count)
    }

    static var moreActions: String { FeatureL10n.text("products.detail.action.more", "Acciones del producto") }
    static var noRecipe: String { FeatureL10n.text("products.no_recipe", "Sin receta") }
    static var chartAxisDate: String { FeatureL10n.text("products.chart.axis_date", "Fecha") }
    static var chartAxisQuantity: String { FeatureL10n.text("products.chart.axis_quantity", "Cantidad") }

    static func chartA11yLabel(_ count: Int) -> String {
        FeatureL10n.format("products.chart.a11y_label", "Demanda: %lld eventos próximos", count)
    }

    static func removeIngredient(_ name: String) -> String {
        FeatureL10n.format("products.remove_ingredient", "Eliminar %@", name)
    }

    static func estimatedAmount(_ amount: String) -> String {
        FeatureL10n.format("products.estimated_amount", "%@ est.", amount)
    }

    static func compositionSummary(ingredients: Int, supplies: Int, equipment: Int) -> String {
        var parts: [String] = []
        
        let ingKey = ingredients == 1 ? "products.composition_summary.ingredients_one" : "products.composition_summary.ingredients_other"
        let ingDefault = ingredients == 1 ? "%lld insumo" : "%lld insumos"
        parts.append(FeatureL10n.format(ingKey, ingDefault, ingredients))
        
        if supplies > 0 {
            let supKey = supplies == 1 ? "products.composition_summary.supplies_one" : "products.composition_summary.supplies_other"
            let supDefault = supplies == 1 ? "%lld insumo por evento" : "%lld insumos por evento"
            parts.append(FeatureL10n.format(supKey, supDefault, supplies))
        }
        
        if equipment > 0 {
            let eqKey = equipment == 1 ? "products.composition_summary.equipment_one" : "products.composition_summary.equipment_other"
            let eqDefault = equipment == 1 ? "%lld equipo" : "%lld equipo(s)"
            parts.append(FeatureL10n.format(eqKey, eqDefault, equipment))
        }
        
        return parts.joined(separator: ", ")
    }
}
