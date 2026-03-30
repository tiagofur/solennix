package com.creapolis.solennix.feature.products.viewmodel

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.ProductIngredient
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class RecipeItem(
    val id: String = UUID.randomUUID().toString(),
    var inventoryId: String = "",
    var quantityRequired: Double = 1.0,
    var inventoryName: String? = null,
    var unit: String? = null,
    var unitCost: Double? = null,
    val type: InventoryType = InventoryType.INGREDIENT
)

@HiltViewModel
class ProductFormViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val inventoryRepository: InventoryRepository,
    private val apiService: ApiService,
    private val planLimitsManager: PlanLimitsManager,
    private val authManager: AuthManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val productId: String? = savedStateHandle["productId"]

    // Plan limit check
    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        private set
    val isLimitReached: Boolean
        get() = limitCheckResult is LimitCheckResult.LimitReached

    var name by mutableStateOf("")
    var category by mutableStateOf("")
    var basePrice by mutableStateOf("")
    var imageUrl by mutableStateOf("")
    var isActive by mutableStateOf(true)

    // Recipe items
    val ingredients = mutableStateListOf<RecipeItem>()
    val equipment = mutableStateListOf<RecipeItem>()
    val supplies = mutableStateListOf<RecipeItem>()

    // Inventory items for pickers
    var allInventoryItems by mutableStateOf<List<InventoryItem>>(emptyList())
        private set
    val ingredientInventoryItems: List<InventoryItem>
        get() = allInventoryItems.filter { it.type == InventoryType.INGREDIENT }
    val equipmentInventoryItems: List<InventoryItem>
        get() = allInventoryItems.filter { it.type == InventoryType.EQUIPMENT }
    val supplyInventoryItems: List<InventoryItem>
        get() = allInventoryItems.filter { it.type == InventoryType.SUPPLY }

    // Categories
    var existingCategories by mutableStateOf<List<String>>(emptyList())
        private set

    var isLoading by mutableStateOf(false)
    var isSaving by mutableStateOf(false)
    var isUploadingImage by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    val isFormValid: Boolean
        get() = name.isNotBlank() && category.isNotBlank() && basePrice.toDoubleOrNull() != null

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            isLoading = true
            try {
                // Sync inventory from network (non-blocking: use cache if sync fails)
                try {
                    inventoryRepository.syncInventory()
                } catch (_: Exception) {
                    // Sync failed (e.g. expired token), fall back to cached data
                }
                allInventoryItems = inventoryRepository.getInventoryItems().first()

                // Load existing categories from products
                val products = productRepository.getProducts().first()
                existingCategories = products.map { it.category }.distinct().sorted()

                if (productId != null) {
                    loadProduct(productId)
                } else {
                    val plan = authManager.currentUser.value?.plan ?: Plan.BASIC
                    limitCheckResult = planLimitsManager.canCreateProduct(plan)
                }
            } catch (e: Exception) {
                errorMessage = "Error al cargar datos: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    private suspend fun loadProduct(id: String) {
        try {
            val product = productRepository.getProduct(id)
            if (product != null) {
                name = product.name
                category = product.category
                basePrice = product.basePrice.toString()
                imageUrl = product.imageUrl ?: ""
                isActive = product.isActive
            }

            // Load ingredients
            val productIngredients = productRepository.getProductIngredients(id)
            ingredients.clear()
            equipment.clear()
            supplies.clear()

            for (pi in productIngredients) {
                val item = RecipeItem(
                    id = pi.id,
                    inventoryId = pi.inventoryId,
                    quantityRequired = pi.quantityRequired,
                    inventoryName = pi.ingredientName,
                    unit = pi.unit,
                    unitCost = pi.unitCost,
                    type = pi.type ?: InventoryType.INGREDIENT
                )
                when (item.type) {
                    InventoryType.INGREDIENT -> ingredients.add(item)
                    InventoryType.EQUIPMENT -> equipment.add(item)
                    InventoryType.SUPPLY -> supplies.add(item)
                }
            }
        } catch (e: Exception) {
            errorMessage = "Error al cargar producto: ${e.message}"
        }
    }

    // Recipe management
    fun addIngredient() { ingredients.add(RecipeItem(type = InventoryType.INGREDIENT)) }
    fun addEquipment() { equipment.add(RecipeItem(type = InventoryType.EQUIPMENT)) }
    fun addSupply() { supplies.add(RecipeItem(type = InventoryType.SUPPLY)) }

    fun removeIngredient(index: Int) { if (index in ingredients.indices) ingredients.removeAt(index) }
    fun removeEquipment(index: Int) { if (index in equipment.indices) equipment.removeAt(index) }
    fun removeSupply(index: Int) { if (index in supplies.indices) supplies.removeAt(index) }

    fun updateRecipeInventory(list: MutableList<RecipeItem>, index: Int, inventoryId: String) {
        if (index !in list.indices) return
        val inv = allInventoryItems.find { it.id == inventoryId }
        list[index] = list[index].copy(
            inventoryId = inventoryId,
            inventoryName = inv?.ingredientName,
            unit = inv?.unit,
            unitCost = inv?.unitCost
        )
    }

    fun updateRecipeQuantity(list: MutableList<RecipeItem>, index: Int, quantity: Double) {
        if (index !in list.indices) return
        list[index] = list[index].copy(quantityRequired = quantity)
    }

    fun saveProduct() {
        if (!isFormValid) return

        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val product = Product(
                    id = productId ?: UUID.randomUUID().toString(),
                    userId = "",
                    name = name,
                    category = category,
                    basePrice = basePrice.toDoubleOrNull() ?: 0.0,
                    recipe = null,
                    imageUrl = imageUrl.takeIf { it.isNotBlank() },
                    isActive = isActive,
                    createdAt = "",
                    updatedAt = ""
                )

                val savedProduct = if (productId != null) {
                    productRepository.updateProduct(product)
                } else {
                    productRepository.createProduct(product)
                }

                // Save ingredients
                val allRecipeItems = ingredients + equipment + supplies
                val validItems = allRecipeItems.filter { it.inventoryId.isNotBlank() }

                if (validItems.isNotEmpty() || productId != null) {
                    val ingredientBodies = validItems.map { item ->
                        ProductIngredient(
                            id = "",
                            productId = savedProduct.id,
                            inventoryId = item.inventoryId,
                            quantityRequired = item.quantityRequired,
                            createdAt = ""
                        )
                    }
                    productRepository.updateProductIngredients(savedProduct.id, ingredientBodies)
                }

                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = "Error al guardar producto: ${e.message}"
            } finally {
                isSaving = false
            }
        }
    }

    fun uploadImage(context: Context, uri: Uri) {
        viewModelScope.launch {
            isUploadingImage = true
            errorMessage = null
            try {
                val contentResolver = context.contentResolver
                val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
                val fileName = getFileName(context, uri) ?: "product_image.jpg"
                val inputStream = contentResolver.openInputStream(uri)
                val bytes = inputStream?.readBytes()
                inputStream?.close()

                if (bytes != null) {
                    val response = apiService.upload(
                        Endpoints.UPLOAD_IMAGE,
                        bytes,
                        fileName,
                        mimeType
                    )
                    imageUrl = response.url
                } else {
                    errorMessage = "No se pudo leer la imagen seleccionada"
                }
            } catch (e: Exception) {
                errorMessage = "Error al subir imagen: ${e.message}"
            } finally {
                isUploadingImage = false
            }
        }
    }

    private fun getFileName(context: Context, uri: Uri): String? {
        var name: String? = null
        val cursor = context.contentResolver.query(uri, null, null, null, null)
        cursor?.use {
            if (it.moveToFirst()) {
                val index = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) {
                    name = it.getString(index)
                }
            }
        }
        return name
    }
}
