package com.creapolis.solennix.core.model.extensions

/**
 * Translates a payment method key (from API) to its user-facing Spanish label.
 */
fun String.toPaymentMethodLabel(): String {
    return when (this.lowercase()) {
        "cash", "efectivo" -> "Efectivo"
        "transfer", "transferencia" -> "Transferencia"
        "card", "tarjeta" -> "Tarjeta"
        "check", "cheque" -> "Cheque"
        "other", "otro" -> "Otro"
        else -> this.replaceFirstChar { it.uppercase() }
    }
}
