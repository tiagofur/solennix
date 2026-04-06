package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Platform where the user originally subscribed.
 */
@Serializable
enum class SubscriptionProvider {
    @SerialName("stripe") STRIPE,
    @SerialName("apple") APPLE,
    @SerialName("google") GOOGLE;

    /** User-facing label in Spanish. */
    val badge: String
        get() = when (this) {
            STRIPE -> "Suscrito vía Web"
            APPLE -> "Suscrito vía App Store"
            GOOGLE -> "Suscrito vía Google Play"
        }

    /** Cancellation instructions when current platform differs from provider. */
    val cancelInstructions: String
        get() = when (this) {
            STRIPE -> "Tu suscripción fue realizada desde la web. Para cancelarla, ingresá a solennix.com > Configuración > Suscripción."
            APPLE -> "Tu suscripción fue realizada desde iOS. Para cancelarla, abrí Configuración > tu Apple ID > Suscripciones en tu iPhone o iPad."
            GOOGLE -> "Para cancelar, abrí Google Play Store > Pagos y suscripciones."
        }

    /** Whether this provider matches the current platform (Android). */
    val isCurrentPlatform: Boolean
        get() = this == GOOGLE
}

/**
 * Subscription details from backend.
 */
@Serializable
data class SubscriptionInfo(
    val status: String,
    val provider: SubscriptionProvider,
    @SerialName("current_period_end") val currentPeriodEnd: String? = null,
    @SerialName("cancel_at_period_end") val cancelAtPeriodEnd: Boolean = false
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
