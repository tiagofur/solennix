package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.material3.LocalTextStyle
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

/**
 * Formato de display para el descuento por producto — paridad con iOS
 * que usa `%g`. Un entero se imprime sin el ".0" (2.0 → "2"), un decimal
 * se conserva tal cual (2.5 → "2.5"). Evita que el card muestre "2.0" al
 * abrir un producto con descuento redondo.
 */
fun formatDiscountClean(value: Double): String =
    if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()

/**
 * Numero tappable dentro de los steppers +/-. Al tocarlo abre el teclado
 * numerico y permite tipear directamente — evita decenas de clicks cuando
 * la cantidad es alta (100 platos, 200 personas).
 *
 * Estado local (`textValue` con TextFieldValue) es autoritativo mientras el
 * usuario edita. Se hidrata del VM en mount y cuando cambia `key` (rebind a
 * otro item). Durante la edicion, los push del VM NO pisan lo que se tipia.
 * Al blur: clamp a `minValue` y rehidratar display.
 *
 * @param key cualquier valor hashable que cambia al apuntar a otro item
 *        (product.id, extra.id). Gatilla rehidrate.
 * @param minValue clamp al blur. 0 para personas (transitorio), 1 para
 *        productos/equipamiento/insumos.
 */
@Composable
fun EditableQuantityField(
    value: Int,
    onValueChange: (Int) -> Unit,
    minValue: Int,
    key: Any,
    modifier: Modifier = Modifier,
    width: Dp = 36.dp,
    textStyle: TextStyle = LocalTextStyle.current,
    colorOverride: androidx.compose.ui.graphics.Color? = null,
) {
    var textValue by remember(key) {
        mutableStateOf(TextFieldValue(value.toString()))
    }
    var isFocused by remember { mutableStateOf(false) }

    // Sync cuando el valor cambia desde afuera (stepper +/-, edit event) y
    // el usuario no esta editando. Durante focus, ignorar para no pisar.
    LaunchedEffect(value, isFocused) {
        if (!isFocused && textValue.text != value.toString()) {
            textValue = TextFieldValue(value.toString())
        }
    }

    BasicTextField(
        value = textValue,
        onValueChange = { new ->
            // Filtrar a solo digitos. Permite vacio transitorio (no
            // propaga 0 que podria eliminar el item).
            val digits = new.text.filter { it.isDigit() }
            val filtered = new.copy(text = digits)
            textValue = filtered
            digits.toIntOrNull()?.let { onValueChange(it) }
        },
        modifier = modifier
            .width(width)
            .onFocusChanged { focusState ->
                if (isFocused != focusState.isFocused) {
                    isFocused = focusState.isFocused
                    if (focusState.isFocused) {
                        // Selecciona todo al entrar — tipear pisa.
                        textValue = textValue.copy(
                            selection = androidx.compose.ui.text.TextRange(0, textValue.text.length)
                        )
                    } else {
                        // Blur: clamp + rehydrate.
                        val clamped = (textValue.text.toIntOrNull() ?: minValue)
                            .coerceAtLeast(minValue)
                        if (clamped != value) onValueChange(clamped)
                        textValue = TextFieldValue(clamped.toString())
                    }
                }
            },
        singleLine = true,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done,
        ),
        textStyle = textStyle.copy(
            textAlign = TextAlign.Center,
            color = colorOverride ?: textStyle.color,
            fontFeatureSettings = "tnum",
        ),
        cursorBrush = SolidColor(SolennixTheme.colors.primary),
    )
}
