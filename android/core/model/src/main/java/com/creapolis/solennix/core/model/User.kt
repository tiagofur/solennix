package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    val name: String,
    @SerialName("business_name") val businessName: String? = null,
    @SerialName("logo_url") val logoUrl: String? = null,
    @SerialName("brand_color") val brandColor: String? = null,
    @SerialName("show_business_name_in_pdf") val showBusinessNameInPdf: Boolean? = null,
    @SerialName("default_deposit_percent") val defaultDepositPercent: Double? = null,
    @SerialName("default_cancellation_days") val defaultCancellationDays: Double? = null,
    @SerialName("default_refund_percent") val defaultRefundPercent: Double? = null,
    @SerialName("contract_template") val contractTemplate: String? = null,
    val plan: Plan = Plan.BASIC,
    @SerialName("stripe_customer_id") val stripeCustomerId: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
enum class Plan {
    @SerialName("basic") BASIC,
    @SerialName("pro") PRO,
    @SerialName("premium") PREMIUM
}
