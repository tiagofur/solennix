package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class QuickQuoteTransferData(
    val products: List<QuoteTransferProduct>,
    val extras: List<QuoteTransferExtra>,
    @SerialName("discount_type") val discountType: String, // "percent" or "fixed"
    @SerialName("discount_value") val discountValue: Double,
    @SerialName("requires_invoice") val requiresInvoice: Boolean,
    @SerialName("num_people") val numPeople: Int
)

@Serializable
data class QuoteTransferProduct(
    @SerialName("product_id") val productId: String,
    @SerialName("product_name") val productName: String,
    val quantity: Int,
    @SerialName("unit_price") val unitPrice: Double
)

@Serializable
data class QuoteTransferExtra(
    val description: String,
    val cost: Double,
    val price: Double,
    @SerialName("exclude_utility") val excludeUtility: Boolean,
    @SerialName("include_in_checklist") val includeInChecklist: Boolean = true
)

object QuickQuoteDataHolder {
    var pendingData: QuickQuoteTransferData? = null
}
