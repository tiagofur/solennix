package com.creapolis.solennix.core.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class EventFinancialsTest {

    @Test
    fun passThroughExtrasExcludedFromMarginDenominator() {
        val result = EventFinancials.compute(
            products = listOf(
                EventFinancials.ProductRow(quantity = 1.0, unitPrice = 1000.0, unitCost = 300.0),
            ),
            extras = listOf(
                EventFinancials.ExtraRow(price = 500.0, cost = 100.0, excludeUtility = false),
                EventFinancials.ExtraRow(price = 200.0, cost = 0.0, excludeUtility = true),
            ),
            globalDiscountType = DiscountType.FIXED,
            globalDiscount = 0.0,
            requiresInvoice = false,
            taxRate = 16.0,
        )

        assertEquals(1500.0, result.adjustedRevenue, 0.01)
        assertEquals(400.0, result.totalCost, 0.01)
        assertEquals((1300.0 / 1500.0) * 100.0, result.profitMargin, 0.01)
    }

    @Test
    fun excludeCostSupplyIgnored() {
        val result = EventFinancials.compute(
            products = emptyList(),
            extras = emptyList(),
            supplies = listOf(
                EventFinancials.SupplyRow(quantity = 5.0, unitCost = 100.0, excludeCost = false),
                EventFinancials.SupplyRow(quantity = 5.0, unitCost = 100.0, excludeCost = true),
            ),
            globalDiscountType = DiscountType.FIXED,
            globalDiscount = 0.0,
            requiresInvoice = false,
            taxRate = 16.0,
        )
        assertEquals(500.0, result.suppliesCost, 0.01)
    }
}