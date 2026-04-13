package com.creapolis.solennix.ui.navigation

import kotlinx.serialization.Serializable

@Serializable
sealed class Route {
    @Serializable data class EventDetail(val id: String) : Route()
    @Serializable data class EventForm(val id: String? = null, val clientId: String? = null) : Route()
    @Serializable data class EventChecklist(val id: String) : Route()
    @Serializable data class ClientDetail(val id: String) : Route()
    @Serializable data class ClientForm(val id: String? = null) : Route()
    @Serializable data class QuickQuote(val clientId: String? = null) : Route()
    @Serializable data class ProductDetail(val id: String) : Route()
    @Serializable data class ProductForm(val id: String? = null) : Route()
    @Serializable data class InventoryDetail(val id: String) : Route()
    @Serializable data class InventoryForm(val id: String? = null) : Route()
    @Serializable data object Onboarding : Route()
    @Serializable data object EditProfile : Route()
    @Serializable data object ChangePassword : Route()
    @Serializable data object BusinessSettings : Route()
    @Serializable data object ContractDefaults : Route()
    @Serializable data object Pricing : Route()
    @Serializable data object About : Route()
    @Serializable data object Privacy : Route()
    @Serializable data object Terms : Route()
    @Serializable data object EventFormLinks : Route()
}
