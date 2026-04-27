# Release Notes — Próxima versión

Notas listas para copiar/pegar en App Store Connect y Google Play Console
cuando subas la actualización. Hay 2 versiones:

- **Corta (< 500 chars)** — para Play Store short description + App Store subtítulos
- **Larga** — para el cuerpo "What's New" de ambas stores

El CHANGELOG.md técnico completo está en la raíz del repo.

---

## 🇲🇽 Español (LATAM) — versión corta

```
🎨 Rediseñamos el formulario de Nuevo Evento

• Tocá el número en cualquier contador para escribirlo directo (sin 50 clicks)
• Botones más grandes y cómodos, visualmente más consistentes
• Paso 4: Equipamiento e Insumos con alerta de stock y separación clara por tipo de unidad (kg vs bolsa)
• En Android ahora también tenés botón "Liquidar" + confirmación antes de borrar un pago
• PDFs se generan en segundo plano — la app ya no se congela al tocar "Contrato"

Arreglos: corregido un crash en Extras/Insumos al eliminar, decimales que se pisaban al tipear, y el monto del descuento en el contrato PDF ahora coincide con lo que ves en Finanzas.
```

## 🇲🇽 Español (LATAM) — versión larga

```
Esta actualización se enfoca en pulir el formulario de Nuevo Evento y la pantalla de detalle, con varios arreglos de estabilidad y paridad entre iOS y Android.

Nuevo
• Stepper híbrido: en todos los contadores (Personas, Cantidad producto, Equipo, Insumo) ahora podés tocar el número y escribir directo. Ideal para cantidades grandes.
• Alerta de stock en Equipamiento: cuando pedís más del stock disponible, el número y la info de stock se pintan en rojo con un ícono de warning.
• Diferenciación por tipo de insumo: bolsa, caja, pack, unidad se ordenan con +/- (no tiene sentido pedir media bolsa). Kg, litros, gramos se escriben como decimales.
• [Android] Nuevo botón "Liquidar" en la pantalla de Pagos. Auto-rellena el saldo pendiente.
• [Android] Diálogo de confirmación antes de eliminar un pago.

Mejorado
• Paso 2 (Productos): header más claro con "Producto N" y botón de eliminar. Los botones +/- más grandes y el número no hace saltar el layout con 3 dígitos.
• Paso 3 (Extras): ahora podés tipear decimales sin que el formato pise lo que estás escribiendo.
• Paso 4 (Equipamiento): un solo layout iOS y Android con stock + unidad debajo del nombre.
• [Android] Botones primarios más compactos — antes se veían muy altos vs el resto.
• [Android] PDFs se generan en segundo plano, sin bloquear la interfaz.
• El Número de Personas arranca en 0 y exige que pongas un valor antes de continuar.

Arreglado
• [iOS] Crash al eliminar un Extra o un Insumo vacío.
• [iOS] El descuento en el contrato PDF daba un monto distinto al que se veía en Finanzas. Ahora coincide exacto.
• [Android] Vaciar la cantidad de un Insumo para re-tipear ya no elimina el insumo.
• [Android] Ícono de eliminar en Equipamiento/Insumos ahora es el mismo que en el resto de la app (antes era una X inconsistente).
```

---

## 🇺🇸 English — versión corta

```
🎨 Redesigned the New Event form

• Tap any counter number to type it directly (no more 50 clicks)
• Bigger, more consistent buttons
• Step 4: Equipment & Supplies now show stock warnings and split counters by unit type (kg vs bag)
• Android now has a "Settle" button + confirmation before deleting a payment
• PDFs generate in the background — the app no longer freezes when tapping "Contract"

Fixes: crashes when deleting Extras/Supplies, decimal typing that got overwritten mid-edit, and contract PDF discount now matches what you see in Finances.
```

## 🇺🇸 English — versión larga

```
This update focuses on polishing the New Event form and detail screen, with stability and iOS/Android parity fixes.

New
• Hybrid stepper: every counter (People, Product qty, Equipment, Supply) now lets you tap the number to type directly. Great for large quantities.
• Stock warnings in Equipment: if you request more than available stock, the number and stock line turn red with a warning icon.
• Supply unit-aware input: bag, box, pack, unit use +/- (no half-bags). Kg, liters, grams accept decimals.
• [Android] New "Settle" button in Payments. Auto-fills remaining balance.
• [Android] Confirmation dialog before deleting a payment.

Improved
• Step 2 (Products): clearer header with "Product N" + delete button. Bigger +/- buttons, fixed-width number.
• Step 3 (Extras): you can now type decimals without the formatter overwriting mid-typing.
• Step 4 (Equipment): unified iOS/Android layout with stock + unit under the name.
• [Android] Primary buttons more compact — used to look taller than the rest of the UI.
• [Android] PDFs generate on a background thread, no UI freeze.
• People count starts at 0 and requires a value before moving on.

Fixed
• [iOS] Crash when deleting an empty Extra or Supply.
• [iOS] Contract PDF discount amount didn't match the Finances screen. Now exact.
• [Android] Clearing a Supply quantity to re-type no longer deletes the supply.
• [Android] Delete icon in Equipment/Supplies now matches the rest of the app (previously an inconsistent X).
```

---

---

## 🌐 Web app (dashboard) — cambios incluidos

La versión web (`app.solennix.com`) recibe los mismos fixes críticos que mobile.
No requiere release en store — se despliega con el próximo deploy:

**Bugs corregidos**
- PDF de Contrato y Cotización: el monto del descuento era incorrecto
  cuando el tipo era porcentaje (mostraba el % como si fuera dólares).
  Ahora coincide con lo que ves en Finanzas.
- Eliminar un producto/extra/equipo/insumo ahora pide confirmación antes
  de borrar (igual que en mobile).

**Mejoras UX**
- Alerta inline cuando pedís más equipo del disponible en inventario.
- "Número de Personas" arranca en 0 y exige que pongas un valor antes
  de continuar al siguiente paso.

---

## Canales de comunicación adicionales (opcional)

Si querés avisar a usuarios fuera de la store:

### Email / Push
```
Asunto: ¿Le diste una vuelta al formulario de evento?

Rediseñamos cómo creás eventos en Solennix. Los puntos clave:

1. Tocás el número — en cualquier contador, ya no hace falta el +/- 50 veces.
2. Alertas cuando pedís más equipo del que tenés en stock.
3. Botón "Liquidar" en Android para cerrar el saldo de un toque.
4. Los PDFs generan sin congelar la app.

Abrí la app para probarlos.
```

### Post Instagram / Twitter
```
Nueva actualización de Solennix 🎉

+ Contadores con tap-to-edit (adiós a los 50 clicks)
+ Alertas de stock en equipamiento
+ "Liquidar" en Android
+ PDFs más rápidos

Arreglos de estabilidad en iOS y Android. Actualizá desde el App Store / Google Play.
```
