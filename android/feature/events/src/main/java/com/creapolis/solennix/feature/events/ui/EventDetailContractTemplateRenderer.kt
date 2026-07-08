package com.creapolis.solennix.feature.events.ui

import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.extensions.asCurrency
import com.creapolis.solennix.core.model.extensions.formatQuantity

internal data class ContractRenderResult(
    val text: String,
    val missingTokens: List<String>
)

internal fun renderContractTemplate(
    event: com.creapolis.solennix.core.model.Event,
    client: com.creapolis.solennix.core.model.Client?,
    user: com.creapolis.solennix.core.model.User?,
    products: List<com.creapolis.solennix.core.model.EventProduct>,
    totalPaid: Double
): ContractRenderResult {
    val template = user?.contractTemplate?.takeIf { it.isNotBlank() } ?: DEFAULT_CONTRACT_TEMPLATE

    val depositPercent = event.depositPercent ?: user?.defaultDepositPercent ?: 0.0
    val depositAmount = event.totalAmount * (depositPercent / 100)
    val cancellationDays = event.cancellationDays ?: user?.defaultCancellationDays ?: 0.0
    val refundPercent = event.refundPercent ?: user?.defaultRefundPercent ?: 0.0
    val discountValue = if (event.discountType == DiscountType.PERCENT) {
        event.totalAmount * (event.discount / 100) / maxOf(1 - event.discount / 100 + event.taxRate / 100, 0.01)
    } else {
        event.discount
    }

    val eventDate = try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.forLanguageTag("es-MX"))
        val display = java.text.SimpleDateFormat("d 'de' MMMM, yyyy", java.util.Locale.forLanguageTag("es-MX"))
        val date = sdf.parse(event.eventDate.take(10))
        if (date != null) display.format(date) else event.eventDate
    } catch (_: Exception) {
        event.eventDate
    }

    val today = java.text.SimpleDateFormat("d 'de' MMMM, yyyy", java.util.Locale.forLanguageTag("es-MX")).format(java.util.Date())

    val servicesList = if (products.isNotEmpty()) {
        products.joinToString(", ") { "${it.quantity.formatQuantity()} ${it.productName ?: "Producto"}" }
    } else {
        null
    }

    val tokens: List<Pair<String, String?>> = listOf(
        "[Nombre del cliente]" to client?.name,
        "[Teléfono del cliente]" to client?.phone,
        "[Email del cliente]" to client?.email,
        "[Dirección del cliente]" to client?.address,
        "[Ciudad del cliente]" to client?.city,
        "[Fecha del evento]" to eventDate,
        "[Hora de inicio]" to event.startTime,
        "[Hora de fin]" to event.endTime,
        "[Horario del evento]" to run {
            val s = event.startTime
            val e = event.endTime
            if (s != null && e != null) "$s - $e" else s ?: e
        },
        "[Tipo de servicio]" to event.serviceType,
        "[Número de personas]" to event.numPeople.toString(),
        "[Ubicación del evento]" to event.location,
        "[Lugar del evento]" to event.location,
        "[Ciudad del evento]" to event.city,
        "[Monto total del evento]" to event.totalAmount.asCurrency(event.currencyCode),
        "[Subtotal del evento]" to (event.totalAmount - event.taxAmount + discountValue).asCurrency(event.currencyCode),
        "[Descuento del evento]" to discountValue.asCurrency(event.currencyCode),
        "[IVA del evento]" to event.taxAmount.asCurrency(event.currencyCode),
        "[Porcentaje de anticipo]" to "${depositPercent.toInt()}%",
        "[Monto de anticipo]" to depositAmount.asCurrency(event.currencyCode),
        "[Total pagado]" to totalPaid.asCurrency(event.currencyCode),
        "[Días de cancelación]" to "${cancellationDays.toInt()}",
        "[Porcentaje de reembolso]" to "${refundPercent.toInt()}%",
        "[Nombre del negocio]" to (user?.businessName ?: user?.name),
        "[Nombre comercial del proveedor]" to (user?.businessName ?: user?.name),
        "[Nombre del proveedor]" to user?.name,
        "[Email del proveedor]" to user?.email,
        "[Fecha actual]" to today,
        "[Ciudad del contrato]" to (event.city ?: client?.city),
        "[Notas del evento]" to event.notes,
        "[Servicios del evento]" to servicesList,
    )

    var result = template
    val missingTokens = mutableListOf<String>()

    tokens.forEach { (token, value) ->
        if (value != null && value.isNotEmpty()) {
            result = result.replace(token, value)
        } else if (template.contains(token)) {
            missingTokens.add(token)
        }
    }

    return ContractRenderResult(result, missingTokens)
}

internal fun isContractHeading(text: String): Boolean {
    val upper = text.uppercase()
    return (text == upper && text.length in 4..79) ||
        text.startsWith("PRIMERA") ||
        text.startsWith("SEGUNDA") ||
        text.startsWith("TERCERA") ||
        text.startsWith("CUARTA") ||
        text.startsWith("QUINTA") ||
        text.startsWith("SEXTA") ||
        text.startsWith("CLÁUSULA")
}

private const val DEFAULT_CONTRACT_TEMPLATE = """CONTRATO DE PRESTACIÓN DE SERVICIOS

En la ciudad de [Ciudad del evento], a [Fecha actual], comparecen por una parte [Nombre del negocio], en lo sucesivo "EL PROVEEDOR", y por otra parte [Nombre del cliente], en lo sucesivo "EL CLIENTE".

DECLARACIONES

EL PROVEEDOR declara que cuenta con la capacidad y experiencia para proporcionar servicios de [Tipo de servicio].

EL CLIENTE declara que requiere los servicios de EL PROVEEDOR para el evento a celebrarse el día [Fecha del evento] en [Ubicación del evento].

CLÁUSULAS

PRIMERA. OBJETO DEL CONTRATO
EL PROVEEDOR se compromete a prestar servicios de [Tipo de servicio] para [Número de personas] personas el día [Fecha del evento], con horario de [Hora de inicio] a [Hora de fin].

SEGUNDA. PRECIO Y FORMA DE PAGO
El precio total de los servicios será de [Monto total del evento]. EL CLIENTE deberá cubrir un anticipo del [Porcentaje de anticipo] ([Monto de anticipo]) al momento de la firma del presente contrato. El saldo restante deberá cubrirse a más tardar el día del evento.

TERCERA. CANCELACIÓN
En caso de cancelación por parte de EL CLIENTE con menos de [Días de cancelación] días de anticipación, EL PROVEEDOR reembolsará el [Porcentaje de reembolso] del anticipo.

CUARTA. OBLIGACIONES DEL PROVEEDOR
EL PROVEEDOR se obliga a proporcionar los servicios pactados en tiempo y forma, conforme a las especificaciones acordadas.

QUINTA. OBLIGACIONES DEL CLIENTE
EL CLIENTE se obliga a realizar los pagos en los plazos acordados y a proporcionar las facilidades necesarias para la prestación del servicio.

Leído el presente contrato, ambas partes lo firman de conformidad."""
