package com.creapolis.solennix.feature.settings.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.feature.settings.R
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject

internal const val DEFAULT_CONTRACT_TEMPLATE = """1. El Proveedor es una empresa dedicada a [Tipo de servicio], [Nombre comercial del proveedor], y cuenta con la capacidad para la prestación de dicho servicio.
2. El Cliente: [Nombre del cliente] desea contratar los servicios del Proveedor para el evento que se llevará a cabo el [Fecha del evento], en [Lugar del evento].
3. Servicio contratados: [Servicios del evento]

Por lo tanto, las partes acuerdan las siguientes cláusulas:

CLÁUSULAS:
Primera. Objeto del Contrato
El Proveedor se compromete a prestar los servicios de [Tipo de servicio] para [Número de personas] personas.

Segunda. Horarios de Servicio
El servicio será prestado en el evento en un horario de [Horario del evento].

Tercera. Costo Total/Anticipo
El costo total del servicio contratado será de [Monto total del evento] con un anticipo de [Total pagado].

Cuarta. Condiciones de Pago
El Cliente deberá cubrir un anticipo del [Porcentaje de anticipo]% para reservar la fecha. El resto deberá liquidarse antes del inicio del evento.

Quinta. Condiciones del Servicio
El Cliente se compromete a facilitar un espacio adecuado para la instalación del equipo necesario, que deberá contar con una superficie plana y conexión de luz.

Sexta. Cancelaciones y Reembolsos
En caso de cancelación por parte del Cliente con menos de [Días de cancelación] dias de anticipación, no se realizará reembolso del apartado.
Cuando la cancelación se realice dentro del plazo permitido, se reembolsará el [Porcentaje de reembolso]% del apartado.

Octava. Jurisdicción
Para cualquier disputa derivada de este contrato, las partes se someten a la jurisdicción de los tribunales competentes de [Ciudad del contrato].

Novena. Modificaciones
Cualquier modificación a este contrato deberá ser acordada por ambas partes por escrito.

Firmas:
Proveedor: [Nombre del proveedor]
Cliente: [Nombre del cliente]"""

@Serializable
private data class ContractDefaultsPayload(
    @SerialName("default_deposit_percent") val defaultDepositPercent: Double,
    @SerialName("default_cancellation_days") val defaultCancellationDays: Double,
    @SerialName("default_refund_percent") val defaultRefundPercent: Double,
    @SerialName("contract_template") val contractTemplate: String
)

@HiltViewModel
class ContractDefaultsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authManager: AuthManager,
    private val apiService: ApiService
) : ViewModel() {

    var depositPercent by mutableStateOf(50f)
    var cancellationDays by mutableStateOf(7f)
    var refundPercent by mutableStateOf(50f)
    var contractTemplate by mutableStateOf("")

    var isLoading by mutableStateOf(true)
    var isSaving by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    init {
        loadContractDefaults()
    }

    fun loadContractDefaults() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val freshUser: User = apiService.get(Endpoints.ME)
                authManager.storeUser(freshUser)
                populateFromUser(freshUser)
            } catch (e: Exception) {
                val cachedUser = authManager.currentUser.value
                if (cachedUser != null) {
                    populateFromUser(cachedUser)
                }
                errorMessage = context.getString(R.string.settings_error_load_data, e.message ?: e.javaClass.simpleName)
            } finally {
                isLoading = false
            }
        }
    }

    private fun populateFromUser(user: User) {
        depositPercent = user.defaultDepositPercent?.toFloat() ?: 50f
        cancellationDays = user.defaultCancellationDays?.toFloat() ?: 7f
        refundPercent = user.defaultRefundPercent?.toFloat() ?: 50f
        contractTemplate = user.contractTemplate?.takeIf { it.isNotBlank() } ?: DEFAULT_CONTRACT_TEMPLATE
    }

    fun saveContractDefaults() {
        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val payload = ContractDefaultsPayload(
                    defaultDepositPercent = depositPercent.toDouble(),
                    defaultCancellationDays = cancellationDays.toDouble(),
                    defaultRefundPercent = refundPercent.toDouble(),
                    contractTemplate = contractTemplate.trim()
                )
                val updatedUser: User = apiService.put(Endpoints.UPDATE_PROFILE, payload)
                authManager.storeUser(updatedUser)
                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = context.getString(R.string.settings_error_save, e.message ?: e.javaClass.simpleName)
            } finally {
                isSaving = false
            }
        }
    }
}
