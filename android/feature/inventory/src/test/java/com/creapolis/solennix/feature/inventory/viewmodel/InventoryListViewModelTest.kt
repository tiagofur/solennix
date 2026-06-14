package com.creapolis.solennix.feature.inventory.viewmodel

import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class InventoryListViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun buildItems() = listOf(
        InventoryItem(id = "i1", ingredientName = "Harina", currentStock = 2.0, minimumStock = 5.0, unit = "kg", type = InventoryType.INGREDIENT),
        InventoryItem(id = "i2", ingredientName = "Leche", currentStock = 8.0, minimumStock = 5.0, unit = "l", type = InventoryType.INGREDIENT),
        InventoryItem(id = "i3", ingredientName = "Microfono", currentStock = 1.0, minimumStock = 2.0, unit = "u", type = InventoryType.EQUIPMENT),
        InventoryItem(id = "i4", ingredientName = "Servilletas", currentStock = 50.0, minimumStock = 20.0, unit = "u", type = InventoryType.SUPPLY),
    )

    private fun makeRepo(items: List<InventoryItem> = buildItems()): InventoryRepository {
        val flow = MutableStateFlow(items)
        val repo = mockk<InventoryRepository>()
        every { repo.getInventoryItems() } returns flow
        coEvery { repo.syncInventory(any()) } returns Unit
        return repo
    }

    @Test
    fun `low stock filter keeps only below minimum items`() = runTest {
        val repo = makeRepo(
            listOf(
                InventoryItem(id = "i1", ingredientName = "Harina", currentStock = 2.0, minimumStock = 5.0, unit = "kg", type = InventoryType.INGREDIENT),
                InventoryItem(id = "i2", ingredientName = "Leche", currentStock = 8.0, minimumStock = 5.0, unit = "l", type = InventoryType.INGREDIENT),
                InventoryItem(id = "i3", ingredientName = "Microfono", currentStock = 1.0, minimumStock = 2.0, unit = "u", type = InventoryType.EQUIPMENT)
            )
        )

        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }

        vm.onLowStockToggle(true)
        advanceUntilIdle()

        assertEquals(listOf("Harina"), vm.uiState.value.ingredientItems.map { it.ingredientName })
        assertEquals(listOf("Microfono"), vm.uiState.value.equipmentItems.map { it.ingredientName })

        collector.cancel()
    }

    @Test
    fun `sort by stock toggles ascending then descending`() = runTest {
        val repo = makeRepo(
            listOf(
                InventoryItem(id = "i1", ingredientName = "A", currentStock = 9.0, minimumStock = 1.0, unit = "u", type = InventoryType.INGREDIENT),
                InventoryItem(id = "i2", ingredientName = "B", currentStock = 3.0, minimumStock = 1.0, unit = "u", type = InventoryType.INGREDIENT),
                InventoryItem(id = "i3", ingredientName = "C", currentStock = 6.0, minimumStock = 1.0, unit = "u", type = InventoryType.INGREDIENT)
            )
        )

        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }

        vm.onSortChange(InventorySortKey.CURRENT_STOCK)
        advanceUntilIdle()
        assertEquals(listOf(3.0, 6.0, 9.0), vm.uiState.value.ingredientItems.map { it.currentStock })

        vm.onSortChange(InventorySortKey.CURRENT_STOCK)
        advanceUntilIdle()
        assertEquals(listOf(9.0, 6.0, 3.0), vm.uiState.value.ingredientItems.map { it.currentStock })

        collector.cancel()
    }

    // --- Scope filter tests ---

    @Test
    fun `default scope is ALL and shows items of every type`() = runTest {
        val repo = makeRepo()
        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        assertEquals(InventoryScope.ALL, vm.uiState.value.scope)
        assertTrue(vm.uiState.value.ingredientItems.isNotEmpty())
        assertTrue(vm.uiState.value.equipmentItems.isNotEmpty())
        assertTrue(vm.uiState.value.supplyItems.isNotEmpty())

        collector.cancel()
    }

    @Test
    fun `scope INGREDIENT triggers filtered sync and shows only ingredients`() = runTest {
        val repo = makeRepo()
        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        vm.onScopeChange(InventoryScope.INGREDIENT)
        advanceUntilIdle()

        assertEquals(InventoryScope.INGREDIENT, vm.uiState.value.scope)
        // UI state client-side filter: equipment and supply must be hidden
        assertTrue(vm.uiState.value.equipmentItems.isEmpty())
        assertTrue(vm.uiState.value.supplyItems.isEmpty())
        // Sync was called with the ingredient type param
        coVerify { repo.syncInventory("ingredient") }

        collector.cancel()
    }

    @Test
    fun `scope EQUIPMENT triggers filtered sync and shows only equipment`() = runTest {
        val repo = makeRepo()
        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        vm.onScopeChange(InventoryScope.EQUIPMENT)
        advanceUntilIdle()

        assertEquals(InventoryScope.EQUIPMENT, vm.uiState.value.scope)
        assertTrue(vm.uiState.value.ingredientItems.isEmpty())
        assertTrue(vm.uiState.value.supplyItems.isEmpty())
        coVerify { repo.syncInventory("equipment") }

        collector.cancel()
    }

    @Test
    fun `scope SUPPLY triggers filtered sync and shows only supplies`() = runTest {
        val repo = makeRepo()
        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        vm.onScopeChange(InventoryScope.SUPPLY)
        advanceUntilIdle()

        assertEquals(InventoryScope.SUPPLY, vm.uiState.value.scope)
        assertTrue(vm.uiState.value.ingredientItems.isEmpty())
        assertTrue(vm.uiState.value.equipmentItems.isEmpty())
        coVerify { repo.syncInventory("supply") }

        collector.cancel()
    }

    @Test
    fun `scope change to ALL syncs without type param`() = runTest {
        val repo = makeRepo()
        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        // First go to EQUIPMENT, then back to ALL
        vm.onScopeChange(InventoryScope.EQUIPMENT)
        advanceUntilIdle()
        vm.onScopeChange(InventoryScope.ALL)
        advanceUntilIdle()

        assertEquals(InventoryScope.ALL, vm.uiState.value.scope)
        coVerify { repo.syncInventory(null) }

        collector.cancel()
    }

    @Test
    fun `stale scope result is dropped — client-side filter prevents cross-type bleed`() = runTest {
        // Simulate the cache still containing ALL types while scope = INGREDIENT.
        // The combine-level client-side filter must exclude non-ingredient items even
        // if the DB hasn't been updated yet by the scoped sync.
        val allItems = buildItems() // contains ingredient + equipment + supply
        val itemsFlow = MutableStateFlow(allItems)
        val repo = mockk<InventoryRepository>()
        every { repo.getInventoryItems() } returns itemsFlow
        coEvery { repo.syncInventory(any()) } returns Unit // sync doesn't mutate the flow

        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        vm.onScopeChange(InventoryScope.INGREDIENT)
        advanceUntilIdle()

        // Even though DB still has equipment+supply items, client-side filter hides them
        assertTrue(vm.uiState.value.equipmentItems.isEmpty(),
            "Equipment items must be hidden when scope is INGREDIENT (stale-append guard)")
        assertTrue(vm.uiState.value.supplyItems.isEmpty(),
            "Supply items must be hidden when scope is INGREDIENT (stale-append guard)")
        assertTrue(vm.uiState.value.ingredientItems.isNotEmpty())

        collector.cancel()
    }

    @Test
    fun `changing scope again before first sync completes uses latest scope`() = runTest {
        val repo = makeRepo()
        val vm = InventoryListViewModel(repo)
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        // Rapid scope changes: INGREDIENT → EQUIPMENT
        vm.onScopeChange(InventoryScope.INGREDIENT)
        vm.onScopeChange(InventoryScope.EQUIPMENT)
        advanceUntilIdle()

        // Final scope should be EQUIPMENT
        assertEquals(InventoryScope.EQUIPMENT, vm.uiState.value.scope)
        // The last synced scope was equipment (previous sync for ingredient was cancelled)
        coVerify(atLeast = 1) { repo.syncInventory("equipment") }

        collector.cancel()
    }
}
