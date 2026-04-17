package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Platform where the user originally subscribed.
 *
 * The user-facing `badge` and `cancelInstructions` strings are kept on the
 * enum ONLY as a fallback when talking to an older backend that does not yet
 * return the server-authored `source_badge` / `cancel_instructions` fields.
 * Once the backend is deployed with those fields, the client renders them
 * verbatim so the 3 platforms stay in sync without per-client drift.
 */
@Serializable
enum class SubscriptionProvider {
    @SerialName("stripe") STRIPE,
    @SerialName("apple") APPLE,
    @SerialName("google") GOOGLE;

    /** Fallback label in Spanish — only used if backend omitted `source_badge`. */
    val fallbackBadge: String
        get() = when (this) {
            STRIPE -> "Suscrito vía Web"
            APPLE -> "Suscrito vía App Store"
            GOOGLE -> "Suscrito vía Google Play"
        }

    /** Fallback cancel instructions — only used if backend omitted the field. */
    val fallbackCancelInstructions: String
        get() = when (this) {
            STRIPE -> "Tu suscripción fue realizada desde la web. Para cancelarla, ingresá a solennix.com > Configuración > Suscripción."
            APPLE -> "Tu suscripción fue realizada desde iOS. Para cancelarla, abrí Configuración > tu Apple ID > Suscripciones en tu iPhone o iPad."
            GOOGLE -> "Tu suscripción fue realizada desde Android. Para cancelarla, abrí Google Play Store > Pagos y suscripciones."
        }

    /** Whether this provider matches the current platform (Android). */
    val isCurrentPlatform: Boolean
        get() = this == GOOGLE
}

/**
 * Subscription details from backend.
 *
 * `sourceBadge` and `cancelInstructions` are server-authored (backend
 * Fase 2). They are nullable on the client to stay forward-compatible with
 * older backend deployments; when missing, UI falls back to the enum.
 */
@Serializable
data class SubscriptionInfo(
    val status: String,
    val provider: SubscriptionProvider,
    @SerialName("source_badge") val sourceBadge: String? = null,
    @SerialName("cancel_instructions") val cancelInstructions: String? = null,
    @SerialName("current_period_end") val currentPeriodEnd: String? = null,
    @SerialName("cancel_at_period_end") val cancelAtPeriodEnd: Boolean = false,
    // Pricing — currently populated only for Stripe-originated subs. Apple and
    // Google users see their price natively in the respective stores.
    @SerialName("amount_cents") val amountCents: Int? = null,
    val currency: String? = null,
    @SerialName("billing_interval") val billingInterval: String? = null,
)

/**
 * Response from GET /api/subscriptions/status.
 */
@Serializable
data class SubscriptionStatusResponse(
    val plan: String,
    @SerialName("has_stripe_account") val hasStripeAccount: Boolean = false,
    val subscription: SubscriptionInfo? = null
)
