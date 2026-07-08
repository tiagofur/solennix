package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import android.content.SharedPreferences
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.SupplySource
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChecklistItem(
    val id: String,
    val name: String,
    val quantity: Double,
    val unit: String,
    val section: ChecklistSection,
    val unitCost: Double = 0.0
)

enum class ChecklistSection {
    EQUIPMENT,
    STOCK,
    PURCHASE
}

data class EventChecklistUiState(
    val eventId: String = "",
    val eventName: String = "",
    val eventDate: String = "",
    val items: List<ChecklistItem> = emptyList(),
    val checkedIds: Set<String> = emptySet(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val currency: String = "MXN"
) {
    val progress: Float
        get() = if (items.isEmpty()) 0f else checkedIds.size.toFloat() / items.size

    val equipmentItems: List<ChecklistItem>
        get() = items.filter { it.section == ChecklistSection.EQUIPMENT }

    val stockItems: List<ChecklistItem>
        get() = items.filter { it.section == ChecklistSection.STOCK }

    val purchaseItems: List<ChecklistItem>
        get() = items.filter { it.section == ChecklistSection.PURCHASE }
}

@HiltViewModel
class EventChecklistViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val eventRepository: EventRepository,
    private val productRepository: ProductRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val eventId: String = savedStateHandle["eventId"] ?: ""

    // Checklist progress is persisted per-event; event IDs end up as preference
    // keys. Keep the file encrypted so a rooted device or backup extraction
    // cannot enumerate the user's event IDs from plain preference files.
    //
    // On first launch after the encrypted-prefs change, any data written to the
    // legacy plaintext file (`checklist_prefs`) is silently migrated into the
    // new encrypted file and the old file is deleted. This preserves the user's
    // ticked checklist items across the upgrade. Gated by an internal flag so
    // it only runs once per install.
    private val prefs: SharedPreferences = run {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        val encrypted = EncryptedSharedPreferences.create(
            context,
            ENCRYPTED_PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
        migrateLegacyChecklistPrefs(context, encrypted)
        encrypted
    }

    private val _uiState = MutableStateFlow(EventChecklistUiState(eventId = eventId))
    val uiState: StateFlow<EventChecklistUiState> = _uiState.asStateFlow()

    init {
        loadChecklist()
        loadPersistedCheckedState()
    }

    private fun loadChecklist() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val event = eventRepository.getEvent(eventId)
                if (event == null) {
                    _uiState.update { it.copy(isLoading = false, error = "Evento no encontrado") }
                    return@launch
                }

                // Fetch event-specific data concurrently
                val productsDeferred = async { eventRepository.getEventProductsFromApi(eventId) }
                val equipmentDeferred = async { eventRepository.getEventEquipmentFromApi(eventId) }
                val suppliesDeferred = async { eventRepository.getEventSuppliesFromApi(eventId) }

                val products = productsDeferred.await()
                val equipment = equipmentDeferred.await()
                val supplies = suppliesDeferred.await()

                val checklistItems = mutableListOf<ChecklistItem>()

                // 1. Equipment items from event assignments
                for (item in equipment) {
                    checklistItems.add(
                        ChecklistItem(
                            id = "eq_${item.id}",
                            name = item.equipmentName ?: "Equipo",
                            quantity = item.quantity.toDouble(),
                            unit = item.unit ?: "",
                            section = ChecklistSection.EQUIPMENT
                        )
                    )
                }

                // 2. Product ingredients with bringToEvent=true, aggregated by inventoryId
                data class IngredientAgg(var name: String, var quantity: Double, var unit: String)
                val ingredientMap = mutableMapOf<String, IngredientAgg>()

                for (product in products) {
                    try {
                        val ingredients = productRepository.getProductIngredients(product.productId)
                        for (ingredient in ingredients) {
                            if (ingredient.bringToEvent != true) continue
                            val key = ingredient.inventoryId
                            val totalQty = ingredient.quantityRequired * product.quantity
                            val existing = ingredientMap[key]
                            if (existing != null) {
                                existing.quantity += totalQty
                            } else {
                                ingredientMap[key] = IngredientAgg(
                                    name = ingredient.ingredientName ?: "Ingrediente",
                                    quantity = totalQty,
                                    unit = ingredient.unit ?: ""
                                )
                            }
                        }
                    } catch (_: Exception) {
                        // Skip products whose ingredients can't be fetched
                    }
                }

                for ((inventoryId, info) in ingredientMap) {
                    checklistItems.add(
                        ChecklistItem(
                            id = "ing_$inventoryId",
                            name = info.name,
                            quantity = info.quantity,
                            unit = info.unit,
                            section = ChecklistSection.STOCK
                        )
                    )
                }

                // 3. Supply items — section determined by source field
                for (supply in supplies) {
                    val section = if (supply.source == SupplySource.STOCK) {
                        ChecklistSection.STOCK
                    } else {
                        ChecklistSection.PURCHASE
                    }
                    checklistItems.add(
                        ChecklistItem(
                            id = "sup_${supply.id}",
                            name = supply.supplyName ?: "Insumo",
                            quantity = supply.quantity,
                            unit = supply.unit ?: "",
                            section = section,
                            unitCost = supply.unitCost
                        )
                    )
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        eventName = event.serviceType,
                        eventDate = event.eventDate,
                        items = checklistItems,
                        currency = event.currencyCode
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    private fun loadPersistedCheckedState() {
        val key = "checklist_$eventId"
        val checkedIds = prefs.getStringSet(key, emptySet()) ?: emptySet()
        _uiState.update { it.copy(checkedIds = checkedIds) }
    }

    private fun persistCheckedState(checkedIds: Set<String>) {
        val key = "checklist_$eventId"
        prefs.edit().putStringSet(key, checkedIds).apply()
    }

    fun toggleItem(itemId: String) {
        val currentChecked = _uiState.value.checkedIds
        val newChecked = if (currentChecked.contains(itemId)) {
            currentChecked - itemId
        } else {
            currentChecked + itemId
        }

        _uiState.update { it.copy(checkedIds = newChecked) }
        persistCheckedState(newChecked)
    }

    fun checkAllInSection(section: ChecklistSection) {
        val sectionItems = _uiState.value.items.filter { it.section == section }
        val sectionIds = sectionItems.map { it.id }.toSet()
        val newChecked = _uiState.value.checkedIds + sectionIds

        _uiState.update { it.copy(checkedIds = newChecked) }
        persistCheckedState(newChecked)
    }

    fun uncheckAllInSection(section: ChecklistSection) {
        val sectionItems = _uiState.value.items.filter { it.section == section }
        val sectionIds = sectionItems.map { it.id }.toSet()
        val newChecked = _uiState.value.checkedIds - sectionIds

        _uiState.update { it.copy(checkedIds = newChecked) }
        persistCheckedState(newChecked)
    }

    fun resetChecklist() {
        _uiState.update { it.copy(checkedIds = emptySet()) }
        val key = "checklist_$eventId"
        prefs.edit().remove(key).apply()
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Legacy checklist prefs migration (one-shot on first launch after the
// encrypted-prefs change landed).
//
// Before: `checklist_prefs` (MODE_PRIVATE, plaintext on disk).
// After : `checklist_prefs_encrypted` (EncryptedSharedPreferences).
//
// Users who had ticked items in the old file would otherwise see their
// checklist progress reset to zero on first launch after the update.
// The migration copies every entry from the legacy file, sets a flag so
// it never runs again, and deletes the orphan file so no plaintext data
// lingers on disk post-upgrade.
// ─────────────────────────────────────────────────────────────────────────

private const val LEGACY_PREFS_NAME = "checklist_prefs"
private const val ENCRYPTED_PREFS_NAME = "checklist_prefs_encrypted"
private const val MIGRATION_FLAG_KEY = "__migrated_from_plaintext_v1__"

private fun migrateLegacyChecklistPrefs(
    context: Context,
    encrypted: SharedPreferences
) {
    // Fast-path: idempotent. Subsequent ViewModel inits short-circuit here.
    if (encrypted.getBoolean(MIGRATION_FLAG_KEY, false)) return

    val legacy = context.getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE)
    val legacyAll = legacy.all

    if (legacyAll.isNotEmpty()) {
        val editor = encrypted.edit()
        legacyAll.forEach { (key, value) ->
            when (value) {
                is String -> editor.putString(key, value)
                is Boolean -> editor.putBoolean(key, value)
                is Int -> editor.putInt(key, value)
                is Long -> editor.putLong(key, value)
                is Float -> editor.putFloat(key, value)
                is Set<*> -> {
                    @Suppress("UNCHECKED_CAST")
                    editor.putStringSet(key, value as Set<String>)
                }
                // Unknown types are skipped rather than crashing — the
                // checklist feature only writes strings today, so this
                // branch exists only for forward-compat paranoia.
                else -> Unit
            }
        }
        editor.putBoolean(MIGRATION_FLAG_KEY, true).apply()

        // Wipe the legacy file on disk so plaintext event IDs don't stay
        // readable in backups / rooted device dumps after the migration.
        // minSdk = 26 so Context.deleteSharedPreferences is always
        // available on this codebase.
        legacy.edit().clear().apply()
        context.deleteSharedPreferences(LEGACY_PREFS_NAME)
    } else {
        // Nothing to migrate — still persist the flag so we don't reopen
        // the legacy file on every cold start looking for data that
        // isn't there.
        encrypted.edit().putBoolean(MIGRATION_FLAG_KEY, true).apply()
    }
}
