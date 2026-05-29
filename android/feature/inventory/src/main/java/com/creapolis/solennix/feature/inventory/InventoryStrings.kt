package com.creapolis.solennix.feature.inventory

import android.content.Context
import java.util.Locale

object InventoryStrings {
    private var context: Context? = null

    fun init(context: Context) {
        this.context = context.applicationContext
    }

    private fun getString(resId: Int): String {
        return context?.getString(resId) ?: ""
    }

    private fun getString(resId: Int, vararg formatArgs: Any): String {
        return context?.getString(resId, *formatArgs) ?: ""
    }

    private fun getStringArray(resId: Int): List<String> {
        return context?.resources?.getStringArray(resId)?.toList() ?: emptyList()
    }

    val title: String get() = getString(R.string.inventory_title)
    val detailTitle: String get() = getString(R.string.inventory_detail_title)
    val formTitle: String get() = getString(R.string.inventory_form_title)
    val adjustStock: String get() = getString(R.string.inventory_adjust_stock)
    
    fun currentStockWithUnit(name: String, stock: Double, unit: String): String = 
        getString(R.string.inventory_current_stock_with_unit, name, formatNumber(stock), unit)
        
    val quantityAdjustHint: String get() = getString(R.string.inventory_quantity_adjust_hint)
    val confirm: String get() = getString(R.string.inventory_confirm)
    val lowStock: String get() = getString(R.string.inventory_low_stock)
    val searchPlaceholder: String get() = getString(R.string.inventory_search_placeholder)
    val sortName: String get() = getString(R.string.inventory_sort_name)
    val sortStock: String get() = getString(R.string.inventory_sort_stock)
    val sortMinimum: String get() = getString(R.string.inventory_sort_minimum)
    val sortCost: String get() = getString(R.string.inventory_sort_cost)
    val emptyFiltered: String get() = getString(R.string.inventory_empty_filtered)
    val emptyInventory: String get() = getString(R.string.inventory_empty_inventory)
    val ingredients: String get() = getString(R.string.inventory_ingredients)
    val supplies: String get() = getString(R.string.inventory_supplies)
    val equipment: String get() = getString(R.string.inventory_equipment)
    
    fun stockLabel(stock: Double, unit: String): String = 
        getString(R.string.inventory_stock_label, formatNumber(stock), unit)
        
    val lowBadge: String get() = getString(R.string.inventory_low_badge)
    val viewDetails: String get() = getString(R.string.inventory_view_details)
    val menuEdit: String get() = getString(R.string.inventory_menu_edit)
    val menuDelete: String get() = getString(R.string.inventory_menu_delete)
    val menuAdjustStock: String get() = getString(R.string.inventory_menu_adjust_stock)
    val deleteItemTitle: String get() = getString(R.string.inventory_delete_item_title)
    val deleteItemMessage: String get() = getString(R.string.inventory_delete_item_message)
    val detailTypeEquipment: String get() = getString(R.string.inventory_detail_type_equipment)
    val detailTypeSupply: String get() = getString(R.string.inventory_detail_type_supply)
    val detailTypeIngredient: String get() = getString(R.string.inventory_detail_type_ingredient)
    val currentStock: String get() = getString(R.string.inventory_current_stock)
    val belowMinimum: String get() = getString(R.string.inventory_below_minimum)
    val minimumStock: String get() = getString(R.string.inventory_minimum_stock)
    val unitCost: String get() = getString(R.string.inventory_unit_cost)
    
    fun perUnit(unit: String): String = getString(R.string.inventory_per_unit, unit)
    
    val stockValue: String get() = getString(R.string.inventory_stock_value)
    val totalValue: String get() = getString(R.string.inventory_total_value)
    val critical7Days: String get() = getString(R.string.inventory_critical_7days)
    val belowMinAfterEvents: String get() = getString(R.string.inventory_below_min_after_events)
    val belowMinRecommended: String get() = getString(R.string.inventory_below_min_recommended)
    val enough7Days: String get() = getString(R.string.inventory_enough_7days)
    val noDemand7Days: String get() = getString(R.string.inventory_no_demand_7days)
    val noUpcomingEvents: String get() = getString(R.string.inventory_no_upcoming_events)
    
    fun shortageMessage(demand: Double, stock: Double, shortage: Double, unit: String): String = 
        getString(R.string.inventory_shortage_message, formatNumber(demand), formatNumber(stock), formatNumber(shortage), unit)
        
    fun lowStockMessage(stock: Double, minimum: Double, unit: String): String = 
        getString(R.string.inventory_low_stock_message, formatNumber(stock), formatNumber(minimum), unit)
        
    fun currentStockMessage(stock: Double, unit: String): String = 
        getString(R.string.inventory_current_stock_message, formatNumber(stock), unit)
        
    val recommendedMinimum: String get() = getString(R.string.inventory_recommended_minimum)
    val demandNext7Days: String get() = getString(R.string.inventory_demand_next_7_days)
    val demandByDate: String get() = getString(R.string.inventory_demand_by_date)
    val confirmedEvents: String get() = getString(R.string.inventory_confirmed_events)
    val noConfirmedEventsUsingItem: String get() = getString(R.string.inventory_no_confirmed_events_using_item)
    val today: String get() = getString(R.string.inventory_today)
    val tomorrow: String get() = getString(R.string.inventory_tomorrow)
    
    fun inDays(days: Int): String = getString(R.string.inventory_in_days, days)
    
    val totalDemand: String get() = getString(R.string.inventory_total_demand)
    val newStock: String get() = getString(R.string.inventory_new_stock)
    val cancel: String get() = getString(R.string.inventory_cancel)
    val save: String get() = getString(R.string.inventory_save)
    
    fun nearLimitMessage(remaining: Int): String = getString(R.string.inventory_near_limit_message, remaining)
    fun limitReached(total: Int): String = getString(R.string.inventory_limit_reached, total)
    
    fun loadItemError(message: String?): String = getString(R.string.inventory_load_item_error, message.orEmpty())
    fun saveItemError(message: String?): String = getString(R.string.inventory_save_item_error, message.orEmpty())
    
    val itemDeleted: String get() = getString(R.string.inventory_item_deleted)
    val deleteItemFailed: String get() = getString(R.string.inventory_delete_item_failed)
    val syncInventoryFailed: String get() = getString(R.string.inventory_sync_inventory_failed)
    
    fun adjustStockFailed(name: String): String = getString(R.string.inventory_adjust_stock_failed, name)
    
    val fallbackEvent: String get() = getString(R.string.inventory_fallback_event)
    
    fun adjustStockError(message: String?): String = getString(R.string.inventory_adjust_stock_error, message.orEmpty())
    fun deleteError(message: String?): String = getString(R.string.inventory_delete_error, message.orEmpty())
    
    val itemNameRequired: String get() = getString(R.string.inventory_item_name_required)
    val typeRequired: String get() = getString(R.string.inventory_type_required)
    val ingredientType: String get() = getString(R.string.inventory_ingredient_type)
    val equipmentType: String get() = getString(R.string.inventory_equipment_type)
    val supplyType: String get() = getString(R.string.inventory_supply_type)
    val stockCurrentRequired: String get() = getString(R.string.inventory_stock_current_required)
    val stockMinimumRequired: String get() = getString(R.string.inventory_stock_minimum_required)
    val unitRequired: String get() = getString(R.string.inventory_unit_required)
    val unitCostOptional: String get() = getString(R.string.inventory_unit_cost_optional)
    val validationNameMin: String get() = getString(R.string.inventory_validation_name_min)
    val validationStockNegative: String get() = getString(R.string.inventory_validation_stock_negative)
    val validationMinimumNegative: String get() = getString(R.string.inventory_validation_minimum_negative)
    val validationUnitCostNegative: String get() = getString(R.string.inventory_validation_unit_cost_negative)
    
    fun commonUnits(): List<String> = getStringArray(R.array.inventory_common_units)

    private fun formatNumber(value: Double): String =
        if (value == value.toLong().toDouble()) value.toLong().toString() else String.format(Locale.US, "%.1f", value)
}
