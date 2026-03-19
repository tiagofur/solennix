package com.creapolis.solennix.core.data.search

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.Product
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Indexa contenido de la app para que aparezca en la busqueda del dispositivo.
 * Usa ShortcutManagerCompat con shortcuts dinamicos y de larga duracion
 * para integrarse con Google Search en el dispositivo.
 */
@Singleton
class AppSearchIndexer @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        private const val MAX_SHORTCUTS = 15 // Android limita shortcuts dinamicos
        private const val CATEGORY_CLIENT = "com.creapolis.solennix.category.CLIENT"
        private const val CATEGORY_EVENT = "com.creapolis.solennix.category.EVENT"
        private const val CATEGORY_PRODUCT = "com.creapolis.solennix.category.PRODUCT"
    }

    /**
     * Indexa clientes como shortcuts dinamicos para busqueda.
     * Incluye nombre, telefono y email como palabras clave.
     */
    fun indexClients(clients: List<Client>) {
        val shortcuts = clients
            .take(MAX_SHORTCUTS)
            .map { client ->
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("solennix://client/${client.id}")).apply {
                    setPackage(context.packageName)
                }

                ShortcutInfoCompat.Builder(context, "client_${client.id}")
                    .setShortLabel(client.name)
                    .setLongLabel("${client.name} - ${client.phone}")
                    .setIcon(IconCompat.createWithResource(context, android.R.drawable.ic_menu_my_calendar))
                    .setIntent(intent)
                    .setLongLived(true)
                    .setCategories(setOf(CATEGORY_CLIENT))
                    .build()
            }

        // Eliminar shortcuts de clientes anteriores y agregar nuevos
        removeShortcutsByCategory(CATEGORY_CLIENT)
        shortcuts.forEach { shortcut ->
            ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
        }
    }

    /**
     * Indexa eventos como shortcuts dinamicos para busqueda.
     * Incluye tipo de evento, cliente, fecha y ubicacion.
     */
    fun indexEvents(events: List<Event>) {
        val shortcuts = events
            .take(MAX_SHORTCUTS)
            .map { event ->
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("solennix://event/${event.id}")).apply {
                    setPackage(context.packageName)
                }

                val locationText = event.location ?: event.city ?: ""
                val longLabel = buildString {
                    append(event.serviceType)
                    append(" - ${event.eventDate}")
                    if (locationText.isNotBlank()) append(" · $locationText")
                }

                ShortcutInfoCompat.Builder(context, "event_${event.id}")
                    .setShortLabel(event.serviceType)
                    .setLongLabel(longLabel.take(80)) // Android limita a ~80 chars
                    .setIcon(IconCompat.createWithResource(context, android.R.drawable.ic_menu_my_calendar))
                    .setIntent(intent)
                    .setLongLived(true)
                    .setCategories(setOf(CATEGORY_EVENT))
                    .build()
            }

        removeShortcutsByCategory(CATEGORY_EVENT)
        shortcuts.forEach { shortcut ->
            ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
        }
    }

    /**
     * Indexa productos como shortcuts dinamicos para busqueda.
     * Incluye nombre, categoria y precio.
     */
    fun indexProducts(products: List<Product>) {
        val shortcuts = products
            .filter { it.isActive }
            .take(MAX_SHORTCUTS)
            .map { product ->
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("solennix://product/${product.id}")).apply {
                    setPackage(context.packageName)
                }

                val longLabel = "${product.name} - ${product.category} · $${product.basePrice}"

                ShortcutInfoCompat.Builder(context, "product_${product.id}")
                    .setShortLabel(product.name)
                    .setLongLabel(longLabel.take(80))
                    .setIcon(IconCompat.createWithResource(context, android.R.drawable.ic_menu_my_calendar))
                    .setIntent(intent)
                    .setLongLived(true)
                    .setCategories(setOf(CATEGORY_PRODUCT))
                    .build()
            }

        removeShortcutsByCategory(CATEGORY_PRODUCT)
        shortcuts.forEach { shortcut ->
            ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
        }
    }

    /**
     * Elimina todos los items indexados.
     */
    fun removeAll() {
        ShortcutManagerCompat.removeAllDynamicShortcuts(context)
    }

    /**
     * Elimina shortcuts de una categoria especifica.
     */
    private fun removeShortcutsByCategory(category: String) {
        val allShortcuts = ShortcutManagerCompat.getDynamicShortcuts(context)
        val toRemove = allShortcuts
            .filter { it.categories?.contains(category) == true }
            .map { it.id }

        if (toRemove.isNotEmpty()) {
            ShortcutManagerCompat.removeDynamicShortcuts(context, toRemove)
        }
    }
}
