package com.creapolis.solennix.feature.products.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Product
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductDetailUiState(
    val product: Product? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val productId: String = checkNotNull(savedStateHandle["productId"])

    private val _uiState = MutableStateFlow(ProductDetailUiState(isLoading = true))
    val uiState: StateFlow<ProductDetailUiState> = _uiState.asStateFlow()

    var deleteSuccess by mutableStateOf(false)
        private set

    init {
        loadProduct()
    }

    private fun loadProduct() {
        viewModelScope.launch {
            try {
                val product = productRepository.getProduct(productId)
                _uiState.value = ProductDetailUiState(product = product, isLoading = false)
            } catch (e: Exception) {
                _uiState.value = ProductDetailUiState(errorMessage = e.message, isLoading = false)
            }
        }
    }

    fun deleteProduct() {
        viewModelScope.launch {
            try {
                productRepository.deleteProduct(productId)
                deleteSuccess = true
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = "Error al eliminar producto: ${e.message}")
            }
        }
    }
}
