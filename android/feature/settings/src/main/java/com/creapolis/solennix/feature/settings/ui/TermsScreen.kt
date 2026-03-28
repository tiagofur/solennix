package com.creapolis.solennix.feature.settings.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TermsScreen(
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Términos y Condiciones") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 700.dp) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            Text(
                text = "Última actualización: Marzo 2026",
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            TermsSection(
                title = "1. Aceptación de los Términos",
                content = "Al acceder y utilizar Solennix, aceptas estar sujeto a estos términos y condiciones. Si no estás de acuerdo con alguna parte de estos términos, no podrás acceder al servicio."
            )

            TermsSection(
                title = "2. Descripción del Servicio",
                content = "Solennix es una plataforma de gestión de eventos que permite a los usuarios organizar clientes, crear cotizaciones, manejar inventario y generar documentos profesionales como contratos y presupuestos."
            )

            TermsSection(
                title = "3. Registro y Cuenta",
                content = "Para usar Solennix debes:\n• Proporcionar información precisa y actualizada\n• Mantener la confidencialidad de tu contraseña\n• Notificarnos inmediatamente sobre cualquier uso no autorizado\n• Ser responsable de toda actividad bajo tu cuenta"
            )

            TermsSection(
                title = "4. Uso Aceptable",
                content = "Te comprometes a no usar Solennix para:\n• Actividades ilegales o fraudulentas\n• Violar derechos de propiedad intelectual\n• Distribuir malware o contenido dañino\n• Interferir con la operación del servicio\n• Recolectar datos de otros usuarios sin autorización"
            )

            TermsSection(
                title = "5. Suscripciones y Pagos",
                content = "Algunos servicios requieren suscripción de pago:\n• Los precios se muestran en pesos mexicanos (MXN)\n• Las suscripciones se renuevan automáticamente\n• Puedes cancelar en cualquier momento desde Google Play Store\n• Los reembolsos se procesan según las políticas de Google Play"
            )

            TermsSection(
                title = "6. Propiedad Intelectual",
                content = "Solennix y su contenido original, características y funcionalidad son propiedad exclusiva de Creapolis. El servicio está protegido por leyes de derechos de autor, marcas registradas y otras leyes de propiedad intelectual."
            )

            TermsSection(
                title = "7. Contenido del Usuario",
                content = "Conservas todos los derechos sobre el contenido que cargas a Solennix. Al cargar contenido, nos otorgas una licencia limitada para almacenar, procesar y mostrar dicho contenido únicamente para proporcionarte el servicio."
            )

            TermsSection(
                title = "8. Limitación de Responsabilidad",
                content = "Solennix se proporciona \"tal cual\" sin garantías de ningún tipo. No seremos responsables por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de usar el servicio."
            )

            TermsSection(
                title = "9. Terminación",
                content = "Podemos suspender o terminar tu acceso al servicio inmediatamente, sin previo aviso, por cualquier motivo, incluyendo el incumplimiento de estos términos."
            )

            TermsSection(
                title = "10. Modificaciones",
                content = "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación. El uso continuado del servicio constituye la aceptación de los términos modificados."
            )

            TermsSection(
                title = "11. Ley Aplicable",
                content = "Estos términos se regirán e interpretarán de acuerdo con las leyes de México, sin tener en cuenta sus disposiciones sobre conflictos de leyes."
            )

            TermsSection(
                title = "12. Contacto",
                content = "Para preguntas sobre estos términos, contáctanos en: legal@solennix.com"
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
        }
    }
}

@Composable
private fun TermsSection(title: String, content: String) {
    Column(modifier = Modifier.padding(bottom = 20.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SolennixTheme.colors.primaryText,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            text = content,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText,
            lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.4
        )
    }
}
