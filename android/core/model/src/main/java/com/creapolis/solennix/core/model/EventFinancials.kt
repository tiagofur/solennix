package com.creapolis.solennix.core.model

import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

/**
 * Single source of truth for event financial calculations.
 * Mirrors iOS EventFinancials.swift and backend financial.ComputeEventFinancials.
 */
object EventFinancials {

    data class ProductRow(
        val quantity: Double,
        val unitPrice: Double,
        val lineDiscount: Double = 0.0,
        val unitCost: Double = 0.0,
    )

    data class ExtraRow(
        val price: Double,
        val cost: Double,
        val excludeUtility: Boolean,
    )

    data class SupplyRow(
        val quantity: Double,
        val unitCost: Double,
        val excludeCost: Boolean = false,
    )

    data class Result(
        val productsSubtotal: Double,
        val normalExtrasSubtotal: Double,
        val passThroughExtrasSubtotal: Double,
        val discountableBase: Double,
        val discountAmount: Double,
        val afterDiscount: Double,
        val taxAmount: Double,
        val total: Double,
        val productCost: Double,
        val extrasCost: Double,
        val suppliesCost: Double,
        val totalCost: Double,
        val revenue: Double,
        val netProfit: Double,
        val adjustedRevenue: Double,
        val profitMargin: Double,
    )

    fun round2(value: Double): Double = round(value * 100) / 100.0

    fun productUnitCostFromIngredients(ingredients: List<ProductIngredient>): Double =
        ingredients
            .filter { ing ->
                val type = ing.type
                type == null || type == InventoryType.INGREDIENT || type == InventoryType.SUPPLY
            }
            .sumOf { (it.unitCost ?: 0.0) * it.quantityRequired }

    fun compute(
        products: List<ProductRow>,
        extras: List<ExtraRow>,
        supplies: List<SupplyRow> = emptyList(),
        globalDiscountType: DiscountType,
        globalDiscount: Double,
        requiresInvoice: Boolean,
        taxRate: Double,
    ): Result {
        val productsSubtotal = products.sumOf { (it.unitPrice - it.lineDiscount) * it.quantity }
        val normalExtrasSubtotal = extras.filter { !it.excludeUtility }.sumOf { it.price }
        val passThroughExtrasSubtotal = extras.filter { it.excludeUtility }.sumOf { it.price }

        val discountableBase = productsSubtotal + normalExtrasSubtotal
        val discountAmount = when (globalDiscountType) {
            DiscountType.PERCENT -> {
                val clamped = max(0.0, min(100.0, globalDiscount))
                discountableBase * clamped / 100.0
            }
            DiscountType.FIXED -> min(max(0.0, globalDiscount), discountableBase)
        }

        val afterDiscount = max(0.0, discountableBase - discountAmount)
        val baseTotal = afterDiscount + passThroughExtrasSubtotal
        val taxAmount = if (requiresInvoice) baseTotal * taxRate / 100.0 else 0.0
        val total = baseTotal + taxAmount

        val productCost = products.sumOf { it.unitCost * it.quantity }
        val extrasCost = extras.sumOf { it.cost }
        val suppliesCost = supplies.filter { !it.excludeCost }.sumOf { it.quantity * it.unitCost }
        val totalCost = productCost + extrasCost + suppliesCost

        val revenue = total - if (requiresInvoice) taxAmount else 0.0
        val netProfit = revenue - totalCost
        val adjustedRevenue = revenue - passThroughExtrasSubtotal
        val profitMargin = if (adjustedRevenue > 0) (netProfit / adjustedRevenue) * 100.0 else 0.0

        return Result(
            productsSubtotal = round2(productsSubtotal),
            normalExtrasSubtotal = round2(normalExtrasSubtotal),
            passThroughExtrasSubtotal = round2(passThroughExtrasSubtotal),
            discountableBase = round2(discountableBase),
            discountAmount = round2(discountAmount),
            afterDiscount = round2(afterDiscount),
            taxAmount = round2(taxAmount),
            total = round2(total),
            productCost = round2(productCost),
            extrasCost = round2(extrasCost),
            suppliesCost = round2(suppliesCost),
            totalCost = round2(totalCost),
            revenue = round2(revenue),
            netProfit = round2(netProfit),
            adjustedRevenue = round2(adjustedRevenue),
            profitMargin = profitMargin,
        )
    }
}