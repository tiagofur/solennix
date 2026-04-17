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
    // Notification preferences
    @SerialName("email_payment_receipt") val emailPaymentReceipt: Boolean? = null,
    @SerialName("email_event_reminder") val emailEventReminder: Boolean? = null,
    @SerialName("email_subscription_updates") val emailSubscriptionUpdates: Boolean? = null,
    @SerialName("email_weekly_summary") val emailWeeklySummary: Boolean? = null,
    @SerialName("email_marketing") val emailMarketing: Boolean? = null,
    @SerialName("push_enabled") val pushEnabled: Boolean? = null,
    @SerialName("push_event_reminder") val pushEventReminder: Boolean? = null,
    @SerialName("push_payment_received") val pushPaymentReceived: Boolean? = null,
    val plan: Plan = Plan.BASIC,
    @SerialName("stripe_customer_id") val stripeCustomerId: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

/**
 * User subscription plan.
 *
 * Backend / Stripe / RevenueCat only sell `basic | pro | business`. The
 * `PREMIUM` case is kept strictly as a legacy fallback for pre-existing DB
 * rows (migration 040 allows `premium` for backward compat; migration 037
 * reset most of them to basic). It must never surface in new UI copy —
 * treat it as a paid tier alias of `PRO`.
 *
 * This mirrors the iOS `Plan` enum at
 * `ios/Packages/SolennixCore/Sources/SolennixCore/Models/User.swift`.
 */
@Serializable
enum class Plan {
    @SerialName("basic") BASIC,
    @SerialName("pro") PRO,
    @SerialName("business") BUSINESS,
    @SerialName("premium") PREMIUM // legacy — treat as paid tier
}
