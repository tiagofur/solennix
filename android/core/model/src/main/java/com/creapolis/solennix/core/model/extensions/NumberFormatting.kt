package com.creapolis.solennix.core.model.extensions

/**
 * Formats a quantity: shows as integer if whole number, otherwise with up to 2 decimals.
 */
fun Double.formatQuantity(): String {
    return if (this == this.toLong().toDouble()) {
        this.toLong().toString()
    } else {
        String.format("%.2f", this)
    }
}
