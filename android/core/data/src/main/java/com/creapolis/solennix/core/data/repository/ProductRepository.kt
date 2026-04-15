package com.creapolis.solennix.core.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.creapolis.solennix.core.data.paging.RemotePagingSource
import com.creapolis.solennix.core.database.dao.ProductDao
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.PaginatedResponse
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.ProductIngredient
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.SolennixException
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.Endpoints
import io.ktor.util.reflect.typeInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

interface ProductRepository {
    fun getProducts(): Flow<List<Product>>
    fun getActiveProductCount(): Flow<Int>
    suspend fun getProduct(id: String): Product?
    suspend fun syncProducts()
    suspend fun createProduct(product: Product): Product
    suspend fun updateProduct(product: Product): Product
    suspend fun deleteProduct(id: String)
    suspend fun getProductIngredients(productId: String): List<ProductIngredient>
    suspend fun updateProductIngredients(productId: String, ingredients: List<ProductIngredient>): List<ProductIngredient>

    /**
     * Returns a [PagingData] stream that loads product pages directly from
     * the remote API using server-side pagination.
     */
    fun getProductsRemotePaging(
        sort: String = "name",
        order: String = "asc",
        query: String = ""
    ): Flow<PagingData<Product>>
}

@Singleton
class OfflineFirstProductRepository @Inject constructor(
    private val productDao: ProductDao,
    private val apiService: ApiService
) : ProductRepository {

    override fun getProducts(): Flow<List<Product>> =
        productDao.getProducts().map { it.map { entity -> entity.asExternalModel() } }

    override fun getActiveProductCount(): Flow<Int> = productDao.getActiveProductCount()

    override suspend fun getProduct(id: String): Product? =
        productDao.getProduct(id)?.asExternalModel()

    override suspend fun syncProducts() {
        val networkProducts: List<Product> = apiService.get(Endpoints.PRODUCTS)
        productDao.insertProducts(networkProducts.map { it.asEntity() })
    }

    override suspend fun createProduct(product: Product): Product {
        val networkProduct: Product = apiService.post(Endpoints.PRODUCTS, product)
        productDao.insertProducts(listOf(networkProduct.asEntity()))
        return networkProduct
    }

    override suspend fun updateProduct(product: Product): Product {
        val networkProduct: Product = apiService.put(Endpoints.product(product.id), product)
        productDao.insertProducts(listOf(networkProduct.asEntity()))
        return networkProduct
    }

    override suspend fun deleteProduct(id: String) {
        try {
            apiService.delete(Endpoints.product(id))
            productDao.deleteProductById(id)
        } catch (e: Exception) {
            if (e is SolennixException.Auth) throw e
            // Offline: cannot queue without SyncStatus column — throw to let UI handle
            throw e
        }
    }

    override suspend fun getProductIngredients(productId: String): List<ProductIngredient> =
        apiService.get(Endpoints.productIngredients(productId))

    override suspend fun updateProductIngredients(
        productId: String,
        ingredients: List<ProductIngredient>
    ): List<ProductIngredient> =
        apiService.put(Endpoints.productIngredients(productId), ingredients)

    override fun getProductsRemotePaging(
        sort: String,
        order: String,
        query: String
    ): Flow<PagingData<Product>> {
        val params = buildMap {
            put("sort", sort)
            put("order", order)
            if (query.isNotBlank()) put("q", query)
        }
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = true
            ),
            pagingSourceFactory = {
                RemotePagingSource<Product>(
                    apiService = apiService,
                    endpoint = Endpoints.PRODUCTS,
                    params = params,
                    typeInfo = typeInfo<PaginatedResponse<Product>>(),
                    pageSize = 20
                )
            }
        ).flow
    }
}
