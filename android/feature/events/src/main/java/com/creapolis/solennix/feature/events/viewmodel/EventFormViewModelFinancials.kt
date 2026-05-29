package com.creapolis.solennix.feature.events.viewmodel

import com.creapolis.solennix.core.model.DiscountType

// Summary Logic
val EventFormViewModel.subtotalProducts: Double
    get() = selectedProducts.sumOf { it.totalPrice ?: 0.0 }

val EventFormViewModel.subtotalExtras: Double
    get() = eventExtras.sumOf { it.price }

val EventFormViewModel.subtotalNormalExtras: Double
    get() = eventExtras.filter { !it.excludeUtility }.sumOf { it.price }

val EventFormViewModel.subtotalPassThroughExtras: Double
    get() = eventExtras.filter { it.excludeUtility }.sumOf { it.price }

val EventFormViewModel.discountableBase: Double
    get() = subtotalProducts + subtotalNormalExtras

val EventFormViewModel.discountAmount: Double
    get() {
        val d = discount.toDoubleOrNull() ?: 0.0
        return if (discountType == DiscountType.PERCENT) {
            discountableBase * (d / 100)
        } else {
            d.coerceAtMost(discountableBase)
        }
    }

val EventFormViewModel.taxAmount: Double
    get() {
        if (!requiresInvoice) return 0.0
        val rate = taxRate.toDoubleOrNull() ?: 0.0
        val baseTotal = discountableBase - discountAmount + subtotalPassThroughExtras
        return baseTotal * (rate / 100)
    }

val EventFormViewModel.total: Double
    get() = (discountableBase - discountAmount + subtotalPassThroughExtras + taxAmount).coerceAtLeast(0.0)

// Profitability Metrics
val EventFormViewModel.costProducts: Double
    get() = selectedProducts.sumOf { p ->
        (productUnitCosts[p.productId] ?: 0.0) * p.quantity
    }

val EventFormViewModel.costExtras: Double
    get() = eventExtras.sumOf { it.cost }

val EventFormViewModel.costSupplies: Double
    get() = selectedSupplies.filter { !it.excludeCost }.sumOf { it.unitCost * it.quantity }

val EventFormViewModel.totalCosts: Double
    get() = costProducts + costExtras + costSupplies

val EventFormViewModel.netProfit: Double
    get() {
        val revenue = total - (if (requiresInvoice) taxAmount else 0.0)
        return revenue - totalCosts
    }

val EventFormViewModel.profitMargin: Double
    get() {
        val revenue = total - (if (requiresInvoice) taxAmount else 0.0)
        val passThroughRevenue = eventExtras.filter { it.excludeUtility }.sumOf { it.price }
        val adjustedRevenue = revenue - passThroughRevenue
        if (adjustedRevenue <= 0) return 0.0
        return (netProfit / adjustedRevenue) * 100
    }

val EventFormViewModel.costStaff: Double
    get() = selectedStaff.sumOf { it.feeAmount ?: 0.0 }
