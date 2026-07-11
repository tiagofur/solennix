package com.creapolis.solennix.feature.events.viewmodel

import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventFinancials
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.EventSupply
import com.creapolis.solennix.core.model.ProductIngredient
import com.creapolis.solennix.core.network.Endpoints
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

internal suspend fun EventDetailViewModel.loadProductUnitCosts(products: List<EventProduct>) {
    val missing = products
        .map { it.productId }
        .filter { it.isNotEmpty() && !productUnitCosts.containsKey(it) }
        .toSet()
    if (missing.isEmpty()) return

    val fetched = coroutineScope {
        missing.map { productId ->
            async {
                try {
                    val ingredients: List<ProductIngredient> =
                        apiService.get(Endpoints.productIngredients(productId))
                    productId to EventFinancials.productUnitCostFromIngredients(ingredients)
                } catch (_: Exception) {
                    productId to 0.0
                }
            }
        }.awaitAll()
    }

    val next = productUnitCosts.toMutableMap()
    fetched.forEach { (id, cost) -> next[id] = cost }
    updateProductUnitCosts(next)
}

internal fun EventDetailViewModel.computeFinancials(
    event: Event,
    products: List<EventProduct>,
    extras: List<EventExtra>,
    supplies: List<EventSupply>,
): EventFinancials.Result {
    return EventFinancials.compute(
        products = products.map {
            EventFinancials.ProductRow(
                quantity = it.quantity,
                unitPrice = it.unitPrice,
                lineDiscount = it.discount,
                unitCost = productUnitCosts[it.productId] ?: 0.0,
            )
        },
        extras = extras.map {
            EventFinancials.ExtraRow(
                price = it.price,
                cost = it.cost,
                excludeUtility = it.excludeUtility,
            )
        },
        supplies = supplies.map {
            EventFinancials.SupplyRow(
                quantity = it.quantity,
                unitCost = it.unitCost,
                excludeCost = it.excludeCost,
            )
        },
        globalDiscountType = event.discountType,
        globalDiscount = event.discount,
        requiresInvoice = event.requiresInvoice,
        taxRate = event.taxRate,
    )
}