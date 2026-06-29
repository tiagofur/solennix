package com.creapolis.solennix.feature.products

import android.content.Context
import java.time.format.DateTimeFormatter
import java.util.Locale

object ProductStrings {
    private var context: Context? = null

    fun init(context: Context) {
        this.context = context.applicationContext
    }

    private val isEnglish: Boolean
        get() = Locale.getDefault().language.startsWith("en")

    private fun getString(resId: Int): String {
        return context?.getString(resId) ?: ""
    }

    private fun getString(resId: Int, vararg formatArgs: Any): String {
        return context?.getString(resId, *formatArgs) ?: ""
    }

    val title: String get() = getString(R.string.products_title)
    val detailTitle: String get() = getString(R.string.products_detail_title)
    val formTitle: String get() = getString(R.string.products_form_title)
    val searchPlaceholder: String get() = getString(R.string.products_search_placeholder)
    val sortName: String get() = getString(R.string.products_sort_name)
    val sortPrice: String get() = getString(R.string.products_sort_price)
    val sortCategory: String get() = getString(R.string.products_sort_category)
    val filterAll: String get() = getString(R.string.products_filter_all)
    val menuEdit: String get() = getString(R.string.products_menu_edit)
    val menuDelete: String get() = getString(R.string.products_menu_delete)
    val menuDetails: String get() = getString(R.string.products_menu_details)
    val inactive: String get() = getString(R.string.products_inactive)
    val deleteTitle: String get() = getString(R.string.products_delete_title)
    val deleteMessage: String get() = getString(R.string.products_delete_message)
    val cancel: String get() = getString(R.string.products_cancel)
    val confirmDelete: String get() = getString(R.string.products_confirm_delete)
    val basePrice: String get() = getString(R.string.products_base_price)
    val perUnit: String get() = getString(R.string.products_per_unit)
    val unitCost: String get() = getString(R.string.products_unit_cost)
    val inSupplies: String get() = getString(R.string.products_in_supplies)
    val marginEstimated: String get() = getString(R.string.products_margin_estimated)
    val marginSubtitle: String get() = getString(R.string.products_margin_subtitle)
    val noRecipeLabel: String get() = getString(R.string.products_no_recipe_label)
    val upcomingEvents: String get() = getString(R.string.products_upcoming_events)
    val confirmed: String get() = getString(R.string.products_confirmed)
    val generalInfo: String get() = getString(R.string.products_general_info)
    val category: String get() = getString(R.string.products_category)
    val composition: String get() = getString(R.string.products_composition)
    val compositionTitle: String get() = getString(R.string.products_composition_title)
    val equipmentTitle: String get() = getString(R.string.products_equipment_title)
    val suppliesTitle: String get() = getString(R.string.products_supplies_title)
    val compositionDescription: String get() = getString(R.string.products_composition_description)
    val equipmentDescription: String get() = getString(R.string.products_equipment_description)
    val suppliesDescription: String get() = getString(R.string.products_supplies_description)
    val fixedCostPerEvent: String get() = getString(R.string.products_fixed_cost_per_event)
    val reusableNoCost: String get() = getString(R.string.products_reusable_no_cost)
    val totalUnitCost: String get() = getString(R.string.products_total_unit_cost)
    val totalEventCost: String get() = getString(R.string.products_total_event_cost)
    val ingredientHeader: String get() = getString(R.string.products_ingredient_header)
    val quantityHeader: String get() = getString(R.string.products_quantity_header)
    val estimatedCostHeader: String get() = getString(R.string.products_estimated_cost_header)
    val unknownIngredient: String get() = getString(R.string.products_unknown_ingredient)
    val demandByDate: String get() = getString(R.string.products_demand_by_date)
    val confirmedEvents: String get() = getString(R.string.products_confirmed_events)
    
    fun upcomingEventsCount(count: Int): String = getString(R.string.products_upcoming_events_count, count)
    fun totalSummary(quantity: Int, people: Int): String = getString(R.string.products_total_summary, quantity, people)
    /** Overload accepting a pre-formatted quantity string (used when quantity is Double). */
    fun totalSummary(quantityStr: String, people: Int): String = getString(R.string.products_total_summary_str, quantityStr, people)
    
    val totalDemand: String get() = getString(R.string.products_total_demand)
    
    fun eventCount(count: Int): String {
        val suffix = if (count != 1) "s" else ""
        return getString(R.string.products_event_count, count, suffix)
    }
    
    fun quantityUnits(count: Int): String = getString(R.string.products_quantity_units, count)
    /** Overload accepting a pre-formatted quantity string (used when quantity is Double). */
    fun quantityUnits(quantityStr: String): String = getString(R.string.products_quantity_units_str, quantityStr)
    fun estimatedRevenueShort(value: String): String = getString(R.string.products_estimated_revenue_short, value)
    
    val noUpcomingEvents: String get() = getString(R.string.products_no_upcoming_events)
    val noUpcomingEventsDescription: String get() = getString(R.string.products_no_upcoming_events_description)
    val noImmediateDemand: String get() = getString(R.string.products_no_immediate_demand)
    val highDemandThisWeek: String get() = getString(R.string.products_high_demand_this_week)
    
    fun unitsNext7Days(count: Int): String = getString(R.string.products_units_next_7_days, count)
    /** Overload accepting a pre-formatted quantity string (used when quantity is Double). */
    fun unitsNext7Days(quantityStr: String): String = getString(R.string.products_units_next_7_days_str, quantityStr)
    fun totalRevenueMessage(value: String): String = getString(R.string.products_total_revenue_message, value)

    fun upcomingEventsSummary(units: Int, events: Int): String {
        val suffix = if (events != 1) "s" else ""
        return getString(R.string.products_upcoming_events_summary, units, events, suffix)
    }
    /** Overload accepting a pre-formatted units string (used when quantity is Double). */
    fun upcomingEventsSummary(unitsStr: String, events: Int): String {
        val suffix = if (events != 1) "s" else ""
        return getString(R.string.products_upcoming_events_summary_str, unitsStr, events, suffix)
    }
    
    val noConfirmedEventsIncludingProduct: String get() = getString(R.string.products_no_confirmed_events_including_product)
    val today: String get() = getString(R.string.products_today)
    val tomorrow: String get() = getString(R.string.products_tomorrow)
    
    fun inDays(days: Int): String = getString(R.string.products_in_days, days)
    
    val imageTitle: String get() = getString(R.string.products_image_title)
    val tapToSelectImage: String get() = getString(R.string.products_tap_to_select_image)
    val uploading: String get() = getString(R.string.products_uploading)
    val changeImage: String get() = getString(R.string.products_change_image)
    val selectImage: String get() = getString(R.string.products_select_image)
    val nameRequired: String get() = getString(R.string.products_name_required)
    val categoryRequired: String get() = getString(R.string.products_category_required)
    val priceRequired: String get() = getString(R.string.products_price_required)
    val activeProduct: String get() = getString(R.string.products_active_product)
    val visibleInQuotes: String get() = getString(R.string.products_visible_in_quotes)
    val save: String get() = getString(R.string.products_save)
    val add: String get() = getString(R.string.products_add)
    val noAddedItems: String get() = getString(R.string.products_no_added_items)
    val selectItem: String get() = getString(R.string.products_select_item)
    
    fun itemCost(cost: String, unit: String): String = getString(R.string.products_item_cost, cost, unit)
    
    val quantity: String get() = getString(R.string.products_quantity)
    val estimatedCost: String get() = getString(R.string.products_estimated_cost)
    val associatedTeam: String get() = getString(R.string.products_associated_team)
    val associatedTeamDescription: String get() = getString(R.string.products_associated_team_description)
    val team: String get() = getString(R.string.products_team)
    val noTeam: String get() = getString(R.string.products_no_team)
    
    fun members(count: Int): String = getString(R.string.products_members, count)
    
    val autoAssignTeamMembers: String get() = getString(R.string.products_auto_assign_team_members)
    val pickerTitle: String get() = getString(R.string.products_picker_title)
    val pickerSearchPlaceholder: String get() = getString(R.string.products_picker_search_placeholder)
    
    fun stockLabel(stock: Int, unit: String): String = getString(R.string.products_stock_label, stock, unit)
    fun nearLimitMessage(remaining: Int): String = getString(R.string.products_near_limit_message, remaining)
    
    val deleteCancel: String get() = getString(R.string.products_cancel)
    val deleteConfirm: String get() = getString(R.string.products_confirm_delete)
    fun deleteDescription(name: String): String = getString(R.string.products_delete_message)

    val productDeleted: String get() = getString(R.string.products_product_deleted)
    val deleteFailed: String get() = getString(R.string.products_delete_failed)
    val syncFailed: String get() = getString(R.string.products_sync_failed)
    val fallbackClient: String get() = getString(R.string.products_fallback_client)
    
    fun deleteError(message: String?): String = getString(R.string.products_delete_error, message.orEmpty())
    fun loadDataError(message: String?): String = getString(R.string.products_load_data_error, message.orEmpty())
    fun loadProductError(message: String?): String = getString(R.string.products_load_product_error, message.orEmpty())
    fun saveProductError(message: String?): String = getString(R.string.products_save_product_error, message.orEmpty())
    
    val imageReadError: String get() = getString(R.string.products_image_read_error)
    
    fun imageUploadError(message: String?): String = getString(R.string.products_image_upload_error, message.orEmpty())
    
    val validationNameMin: String get() = getString(R.string.products_validation_name_min)
    val validationCategoryRequired: String get() = getString(R.string.products_validation_category_required)
    val defaultUnit: String get() = getString(R.string.products_default_unit)
    val showInactiveLabel: String get() = getString(R.string.products_show_inactive)
    val filterTitle: String get() = getString(R.string.products_filter_title)
    val sortBy: String get() = getString(R.string.products_sort_by)
    val order: String get() = getString(R.string.products_order)
    val orderAsc: String get() = getString(R.string.products_order_asc)
    val orderDesc: String get() = getString(R.string.products_order_desc)

    // Empty states
    val emptyTitle: String get() = getString(R.string.products_empty_title)
    val emptyMessage: String get() = getString(R.string.products_empty_message)
    val emptyAction: String get() = getString(R.string.products_empty_action)
    val emptySearchTitle: String get() = getString(R.string.products_empty_search_title)
    val emptySearchMessage: String get() = getString(R.string.products_empty_search_message)
    
    fun shortDateFormatter(): DateTimeFormatter =
        if (isEnglish) DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH)
        else DateTimeFormatter.ofPattern("d MMM", Locale.forLanguageTag("es"))
        
    fun longDateFormatter(): DateTimeFormatter =
        if (isEnglish) DateTimeFormatter.ofPattern("MMMM d", Locale.ENGLISH)
        else DateTimeFormatter.ofPattern("d 'de' MMMM", Locale.forLanguageTag("es"))

    val formDiscardTitle: String get() = getString(R.string.products_form_discard_title)
    val formDiscardMessage: String get() = getString(R.string.products_form_discard_message)
    val formDiscardConfirm: String get() = getString(R.string.products_form_discard_confirm)
}
