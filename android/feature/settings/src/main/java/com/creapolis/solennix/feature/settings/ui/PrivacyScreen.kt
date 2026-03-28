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
fun PrivacyScreen(
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Política de Privacidad") },
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

            PolicySection(
                title = "1. Información que Recopilamos",
                content = "Recopilamos información que nos proporcionas directamente, como tu nombre, correo electrónico, información de tu negocio y datos de tus clientes y eventos. También recopilamos información automáticamente sobre cómo usas la aplicación."
            )

            PolicySection(
                title = "2. Uso de la Información",
                content = "Utilizamos la información recopilada para:\n• Proporcionar y mejorar nuestros servicios\n• Personalizar tu experiencia\n• Enviar notificaciones importantes\n• Procesar pagos y suscripciones\n• Cumplir con obligaciones legales"
            )

            PolicySection(
                title = "3. Almacenamiento de Datos",
                content = "Tus datos se almacenan de forma segura en servidores protegidos. Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal contra acceso no autorizado, pérdida o alteración."
            )

            PolicySection(
                title = "4. Compartir Información",
                content = "No vendemos ni compartimos tu información personal con terceros para fines de marketing. Solo compartimos datos con:\n• Proveedores de servicios que nos ayudan a operar la aplicación\n• Cuando sea requerido por ley\n• Con tu consentimiento explícito"
            )

            PolicySection(
                title = "5. Tus Derechos",
                content = "Tienes derecho a:\n• Acceder a tus datos personales\n• Corregir información inexacta\n• Solicitar la eliminación de tus datos\n• Exportar tus datos\n• Retirar tu consentimiento en cualquier momento"
            )

            PolicySection(
                title = "6. Cookies y Tecnologías Similares",
                content = "Utilizamos cookies y tecnologías similares para mejorar la funcionalidad de la aplicación, analizar el uso y personalizar contenido."
            )

            PolicySection(
                title = "7. Cambios a esta Política",
                content = "Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos sobre cambios significativos a través de la aplicación o por correo electrónico."
            )

            PolicySection(
                title = "8. Contacto",
                content = "Si tienes preguntas sobre esta política de privacidad o sobre cómo manejamos tus datos, contáctanos en: soporte@solennix.com"
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
        }
    }
}

@Composable
private fun PolicySection(title: String, content: String) {
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
