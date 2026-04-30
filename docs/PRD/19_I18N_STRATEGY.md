# i18n Strategy

> [!abstract] Resumen
> Solennix se construye multi-idioma desde el Calendario (slice inicial, 2026-04-20). Cada plataforma usa su infraestructura nativa; los idiomas shipped por default son **ES (source / development language)** y **EN**. Desde 2026-04-29 la estrategia ya no se organiza por plataforma sino por **slice cross-platform** con una **copy matrix canónica** para evitar drift semántico entre iOS, Android y Web. El selector de idioma per-usuario queda pendiente para un slice posterior — por ahora el device / navigator locale gobierna.

## Tracker de ejecución

- **Epic**: #202 — `feat(cross-platform): complete product-wide i18n parity`
- **Slices**:
  - #94 — Dashboard ✅ implementado en web + iOS + Android; issue cerrado
  - #95 — Events list
  - #203 — Canonical copy matrix + governance
  - #204 — Event detail + event form ✅ implementado en web + iOS + Android; issue cerrado
  - #205 — Auth + settings
  - #206 — Clients
  - #207 — Products + inventory
  - #208 — Public/client-facing flows ✅ PR #225 en estado `CLEAN` tras refresh sobre `main`
  - #209 — Final hardcoded-string parity sweep

> [!info] 2026-04-30 — Web baseline repair under issue #230
> Durante la estabilización de suites web se confirmó que parte del problema no era sólo drift de tests: `web/src/i18n/locales/{es,en}/events.json` había quedado incompleto tras restores merge-safe y `Dashboard.tsx` consumía una key (`dashboard.upcoming.no_events`) que no existía en los catálogos.
> - Se restauraron en ES/EN los namespaces completos requeridos por `EventSummary` (`general`, `financials`, `summary`, `photos`, `payments`, etc.).
> - Se agregó `dashboard.upcoming.no_events` en ES/EN para alinear catálogo y consumo real del Dashboard.
> - Se ajustaron tests stale de Dashboard / EventList / EventSummary para reflejar el wording vigente (`Hola, {{name}}`, `Nuevo evento`, `Cotización rápida`, `Cobrado`, `IVA pendiente`, `Eventos del mes`).
> - Validación focalizada: **111 tests PASS** en 7 suites web baseline relacionadas.
> - Estado final: mergeado vía PR `#231`; follow-ups `#226/#229` y `#232/#233` quedaron absorbidos y cerrados.

## Principio rector

**La unidad de entrega NO es una plataforma. Es un flujo de producto.**

- No cerramos "Android listo" si iOS/Web todavía muestran copy distinta para la misma intención.
- Cada issue de i18n se ejecuta **cross-platform por pantalla/flujo**.
- La paridad se mide por:
  - **misma intención**
  - **misma jerarquía UX**
  - **misma terminología de negocio**
  - **mismas reglas de error / confirmación / empty state**
- Se permiten variantes mobile más cortas **solo** si el espacio lo exige y la intención se conserva.

## Idiomas soportados

| Locale | Rol | Estado |
| --- | --- | --- |
| `es` | Source (Rioplatense / neutral LATAM) | Completo |
| `en` | Secundario | Completo en Web y Calendario. (Faltan namespaces como `search`) |

Locales regionales (`es-MX`, `es-AR`, `en-US`, `en-GB`) colapsan al locale base de 2 letras. Los montos MXN siguen formateándose con `es-MX` independiente del idioma de UI (convención contable).

## Convención de keys

- **snake_case** + **punto para jerarquía**: `calendar.block.reason_label`, `calendar.error.load_failed`.
- Un namespace por pantalla (`calendar`, próximo `dashboard`, `events`, …). No existe namespace "common" todavía — las acciones compartidas (OK, Cancelar, Eliminar) se duplican en cada namespace para aislar el blast radius de un rename.
- Los placeholders de interpolación usan la sintaxis del framework correspondiente:
  - **iOS**: `%@` (String), `%lld` (Int). Ej: `"Motivo: %@"`.
  - **Android**: `%1$s`, `%1$d` (indexed). Ej: `<string name="calendar_unblock_reason_prefix">Motivo: %1$s</string>`.
  - **Web (i18next)**: `{{var}}`. Ej: `"reason_prefix": "Motivo: {{reason}}"`.

## Governance de copy

### Fuente de verdad

La fuente de verdad del wording vive en esta estrategia + los issues de slice. El código **consume** copy; no la define.

Orden de autoridad:

1. **Copy matrix canónica** de este documento
2. Issue de slice cross-platform correspondiente
3. Catálogos de cada plataforma
4. Código UI

Si el catálogo contradice la matrix, gana la matrix. Si una plataforma contradice el catálogo, gana el catálogo.

### Canonical vs compact

Cada key puede tener hasta 3 niveles:

- **canonical**: wording preferido y más explícito
- **compact_mobile**: variante más corta para chips, tabs, toolbars o CTAs densos
- **forbidden**: abreviaciones o sinónimos que NO queremos reintroducir

Reglas:

- Compact no puede cambiar el verbo principal ni la intención.
- Compact no puede perder contexto en acciones destructivas.
- Si desktop/web usa canonical y mobile usa compact, debe estar documentado en esta matrix o en el issue del slice.
- Si una label entra completa en mobile, se usa canonical. No se acorta "porque sí".

### Tono y estilo

- **UI en español neutral LATAM** como idioma fuente.
- Verbos de CTA en infinitivo o imperativo corto y consistente: `Guardar`, `Cancelar`, `Eliminar`, `Ver planes`.
- Estados y feedback con tono directo: `Sin eventos`, `No se encontraron resultados`, `Error al cargar`.
- Evitar sinónimos innecesarios para la misma acción (`Borrar`, `Quitar`, `Remover`) salvo que el dominio realmente cambie.
- En mobile se prioriza claridad sobre literalidad: mejor `Nuevo evento` que truncar `Crear evento o cotización` a algo ambiguo.

### Reglas de longitud

- **CTA primaria mobile**: objetivo ≤ 18 caracteres.
- **Chip / segmented control**: objetivo ≤ 12 caracteres.
- **Toolbar / nav title compacta**: objetivo ≤ 22 caracteres.
- **Dialog destructive title**: objetivo ≤ 28 caracteres, pero nunca a costa de perder claridad.
- Si una variante supera esos budgets, se evalúa `compact_mobile` documentado.

### Qué debe entrar en cada slice

Todo issue de i18n por flujo debe inventariar:

- títulos de pantalla
- botones / CTAs
- placeholders
- labels de formularios
- tabs / chips / filtros / sort
- empty states
- toasts y errores visibles al usuario
- diálogos de confirmación / destrucción
- hints y helper text
- estados (`quoted`, `confirmed`, etc.)

Si un string visible al usuario no entra en el inventario, el issue está incompleto.

## Copy matrix canónica (v0)

> [!note] Primera versión
> Esta matriz arranca con vocabulary shared de producto. Cada slice debe ampliarla sin romper la semántica existente.

| Dominio | Key semántica | ES canonical | EN canonical | Compact mobile ES | Compact mobile EN | Forbidden / notas |
| --- | --- | --- | --- | --- | --- | --- |
| Shared action | save | Guardar | Save | Guardar | Save | No usar `Salvar` |
| Shared action | cancel | Cancelar | Cancel | Cancelar | Cancel | No usar `Descartar` salvo cierre con pérdida explícita |
| Shared action | delete | Eliminar | Delete | Eliminar | Delete | No usar `Borrar` / `Quitar` para entidades persistidas |
| Shared action | edit | Editar | Edit | Editar | Edit | — |
| Shared action | create | Crear | Create | Nuevo | New | `Nuevo` sólo permitido en CTA compacta |
| Shared action | search | Buscar | Search | Buscar | Search | No usar `Filtrar` como sinónimo |
| Shared action | filter | Filtrar | Filter | Filtrar | Filter | No usar `Buscar` cuando abre filtros |
| Shared action | clear_all | Limpiar todo | Clear all | Limpiar | Clear | `Borrar todo` prohibido |
| Shared action | confirm | Confirmar | Confirm | Confirmar | Confirm | — |
| Shared action | close | Cerrar | Close | Cerrar | Close | — |
| Shared action | view_plans | Ver planes | View plans | Planes | Plans | Compact sólo para botones chicos |
| Entity | event | Evento | Event | Evento | Event | — |
| Entity | client | Cliente | Client | Cliente | Client | — |
| Entity | product | Producto | Product | Producto | Product | — |
| Entity | inventory | Inventario | Inventory | Inventario | Inventory | No usar `Stock` como nombre de pantalla |
| Empty state | no_results | Sin resultados | No results | Sin resultados | No results | — |
| Empty state | no_events | Sin eventos | No events | Sin eventos | No events | — |
| Empty state | create_first_event | Crea tu primer evento para comenzar | Create your first event to get started | Crear primer evento | Create first event | Compact permitida en cards/banners |
| Feedback | load_error | Error al cargar | Failed to load | Error al cargar | Load failed | Mantener tono breve |
| Feedback | save_error | Error al guardar | Failed to save | Error al guardar | Save failed | — |
| Feedback | delete_error | Error al eliminar | Failed to delete | Error al eliminar | Delete failed | — |
| Event status | all | Todos | All | Todos | All | — |
| Event status | quoted | Cotizado | Quoted | Cotizado | Quoted | No usar `Presupuestado` sin cambio de negocio |
| Event status | confirmed | Confirmado | Confirmed | Confirmado | Confirmed | — |
| Event status | completed | Completado | Completed | Completado | Completed | — |
| Event status | cancelled | Cancelado | Cancelled | Cancelado | Cancelled | — |
| Dashboard | dashboard_title | Inicio | Home | Inicio | Home | No usar `Dashboard` en UI ES |
| Dashboard | refresh | Actualizar | Refresh | Actualizar | Refresh | — |
| Dashboard KPI | net_sales | Ventas netas | Net sales | Vtas. netas | Net sales | Compact ES sólo si el card no entra |
| Dashboard KPI | collected | Cobrado | Collected | Cobrado | Collected | — |
| Dashboard KPI | vat_collected | IVA cobrado | VAT collected | IVA cobrado | VAT collected | — |
| Dashboard KPI | vat_outstanding | IVA pendiente | VAT due | IVA pend. | VAT due | Compact ES sólo en cards móviles densas |
| Dashboard KPI | events_this_month | Eventos del mes | Events this month | Eventos mes | This month | Mantener sentido temporal |
| Dashboard KPI | low_stock | Stock bajo | Low stock | Stock bajo | Low stock | — |
| Dashboard KPI | clients_total | Clientes | Clients | Clientes | Clients | Subtitle canonical: `Total` / `Total` |
| Dashboard KPI | quotes | Cotizaciones | Quotes | Cotizaciones | Quotes | — |
| Dashboard | quick_new_event | Nuevo evento | New event | Nuevo | New | Compact permitida en botones chicos |
| Dashboard | quick_new_client | Nuevo cliente | New client | Cliente | Client | Compact sólo en botón muy chico |
| Dashboard | inventory_alerts | Alertas de inventario | Inventory alerts | Alertas stock | Stock alerts | Compact mobile permitida |
| Dashboard | upcoming_events | Próximos eventos | Upcoming events | Próximos | Upcoming | Compact sólo en headers angostos |
| Dashboard | event_status | Estado de eventos | Event status | Estados | Status | No usar `Distribución` como título principal |
| Dashboard | financial_comparison | Comparativa financiera | Financial comparison | Comparativa | Comparison | Compact mobile permitida |
| Dashboard | revenue_last_6_months | Ingresos — últimos 6 meses | Revenue — last 6 months | Ingresos 6 meses | 6-month revenue | Mantener el marco temporal |
| Dashboard | register_payment | Registrar pago | Record payment | Registrar pago | Add payment | `Guardar pago` permitido sólo si el CTA comparte espacio con otros |
| Dashboard | register_payment_and_complete | Registrar pago y completar | Record payment and complete | Pagar y completar | Pay & complete | Compact mobile aprobada |
| Dashboard | complete_only | Solo completar | Complete only | Completar | Complete | Compact permitida |
| Dashboard | view_detail | Ver detalle | View details | Ver | View | `Ver` sólo permitido en acción secundaria compacta |
| Dashboard | status_chart_no_data | Sin eventos este mes | No events this month | Sin eventos | No events | Mejor que un vacío genérico |
| Dashboard | status_chart_create_first | Crea tu primer evento | Create your first event | Crear evento | Create event | Compact permitida en cards |
| Dashboard | attention_required | Requieren atención | Need attention | Atención | Attention | Mantener tono operativo |
| Events list | title | Eventos | Events | Eventos | Events | — |
| Events list | export_csv | Exportar CSV | Export CSV | Exportar | Export | Compact permitida en icon button + text |
| Events list | quick_quote | Cotización rápida | Quick quote | Cotización | Quote | No usar `Quote` en UI ES |
| Events list | new_event | Nuevo evento | New event | Nuevo | New | Compact permitida |
| Events list | search_placeholder | Buscar eventos... | Search events... | Buscar... | Search... | No usar `Filtrar eventos...` como placeholder principal si el campo hace search textual |
| Events list | search_clear | Limpiar búsqueda | Clear search | Limpiar | Clear | Compact permitida |
| Events list | date_range | Rango de fechas | Date range | Fechas | Dates | Compact permitida en icon button |
| Events list | apply_filters | Aplicar | Apply | Aplicar | Apply | — |
| Events list | date_range_title | Seleccionar rango | Select range | Rango | Range | Preferir `Seleccionar` sobre `Seleccioná` en source neutral |
| Events list | date_range_headline | Filtro de fechas | Date filter | Fechas | Dates | Compact permitida |
| Events list | sort_by | Ordenar por | Sort by | Ordenar | Sort | Compact permitida |
| Events list | sort_events | Ordenar eventos | Sort events | Ordenar | Sort | Para icon action |
| Events list | ascending | Ascendente | Ascending | Asc. | Asc. | Compact sólo en affordances muy chicas |
| Events list | descending | Descendente | Descending | Desc. | Desc. | Compact sólo en affordances muy chicas |
| Events list | service | Servicio | Service | Servicio | Service | No usar `Tipo de servicio` salvo en export o tabla ancha |
| Events list | service_type | Tipo de servicio | Service type | Servicio | Service | Versión larga para desktop/export |
| Events list | people | Personas | People | Personas | People | — |
| Events list | city | Ciudad | City | Ciudad | City | — |
| Events list | all_day | Todo el día | All day | Todo el día | All day | — |
| Events list | change_status | Cambiar estado | Change status | Estado | Status | Compact permitida en sheet/item angosto |
| Events list | delete_event_title | Eliminar evento | Delete event | Eliminar | Delete | Título completo en dialog; compact sólo en row action |
| Events list | delete_event_description | Se eliminarán todos los datos del evento, incluyendo pagos y archivos. Esta acción no se puede deshacer. | All event data, including payments and files, will be deleted. This action cannot be undone. | Esta acción no se puede deshacer. | This action cannot be undone. | La variante compact NO reemplaza el dialog principal |
| Events list | delete_permanently | Eliminar permanentemente | Delete permanently | Eliminar | Delete | Compact sólo en botones chicos |
| Events list | no_results_hint | No se encontraron eventos con ese filtro | No events matched that filter | Sin coincidencias | No matches | Compact permitida en mobile cards |
| Events list | client_fallback | Cliente | Client | Cliente | Client | No usar `Sin cliente` salvo si el diseño exige explicitar ausencia |
| Events list | total | Total | Total | Total | Total | — |
| Auth | sign_in | Iniciar sesión | Sign in | Ingresar | Sign in | `Ingresar` sólo permitido en CTA compacta |
| Auth | create_account | Crear cuenta | Create account | Crear cuenta | Create account | No usar `Registrarse` como CTA principal si el resto usa sustantivo |
| Auth | email | Correo electrónico | Email | Correo | Email | Compact ES permitida en mobile forms densos |
| Auth | password | Contraseña | Password | Contraseña | Password | — |
| Auth | confirm_password | Confirmar contraseña | Confirm password | Confirmar | Confirm | Compact sólo cuando el label largo rompe layout |
| Auth | forgot_password | ¿Olvidaste tu contraseña? | Forgot your password? | ¿Olvidaste? | Forgot? | Compact sólo en links muy angostos |
| Auth | continue_with | O continuar con | Or continue with | O con | Or with | Compact permitida en separadores chicos |
| Auth | continue_with_google | Continuar con Google | Continue with Google | Google | Google | Compact sólo en buttons de ícono+texto angostos |
| Auth | continue_with_apple | Continuar con Apple | Continue with Apple | Apple | Apple | Compact sólo en buttons de ícono+texto angostos |
| Auth | no_account | ¿No tenés cuenta? | Don't have an account? | ¿Sin cuenta? | No account? | Compact sólo si el layout lo obliga |
| Auth | already_have_account | ¿Ya tenés cuenta? | Already have an account? | ¿Ya tenés cuenta? | Already have one? | — |
| Auth | reset_password | Restablecer contraseña | Reset password | Restablecer | Reset | Compact permitida en CTA |
| Auth | recover_password | Recuperar contraseña | Recover password | Recuperar | Recover | Preferir `Restablecer` para la acción final y `Recuperar` para el flujo inicial |
| Auth | send_link | Enviar enlace | Send link | Enviar | Send | Compact permitida |
| Auth | back_to_sign_in | Volver a iniciar sesión | Back to sign in | Volver | Back | Compact sólo en success screens chicas |
| Auth | current_password | Contraseña actual | Current password | Actual | Current | Compact sólo en forms estrechos |
| Auth | new_password | Nueva contraseña | New password | Nueva | New | Compact sólo en forms estrechos |
| Auth | name_full | Nombre completo | Full name | Nombre | Name | Compact sólo si el form lo exige |
| Auth | terms_ack | Al registrarte, aceptás nuestros Términos de Servicio y Política de Privacidad. | By creating an account, you agree to our Terms of Service and Privacy Policy. | Aceptás Términos y Privacidad. | You agree to Terms and Privacy. | Compact sólo en pantallas muy chicas; mantener links claros |
| Auth | credentials_hint | Ingresá tus credenciales para continuar | Enter your credentials to continue | Ingresá para continuar | Continue with your credentials | `Tus credenciales` puede omitirse en compact |
| Settings | title | Ajustes | Settings | Ajustes | Settings | No usar `Configuración` si las otras plataformas usan `Ajustes` |
| Settings | subtitle | Gestioná tu cuenta, negocio y suscripción | Manage your account, business, and subscription | Cuenta, negocio y plan | Account, business, plan | Compact permitida en subtítulos chicos |
| Settings tab | profile | Perfil | Profile | Perfil | Profile | — |
| Settings tab | business | Negocio | Business | Negocio | Business | No usar `Empresa` salvo contexto legal/branding |
| Settings tab | contracts | Contratos | Contracts | Contratos | Contracts | — |
| Settings tab | notifications | Notificaciones | Notifications | Avisos | Notifications | `Avisos` no es preferred canonical |
| Settings tab | subscription | Suscripción | Subscription | Plan | Plan | Compact permitida en tabs chicas |
| Settings section | appearance | Apariencia | Appearance | Apariencia | Appearance | — |
| Settings section | account | Cuenta | Account | Cuenta | Account | — |
| Settings section | information | Información | Information | Info | Info | Compact permitida en secciones chicas |
| Settings action | edit_profile | Editar perfil | Edit profile | Editar perfil | Edit profile | — |
| Settings action | change_password | Cambiar contraseña | Change password | Cambiar clave | Change password | `Cambiar clave` sólo como compact, no canonical |
| Settings action | business_settings | Ajustes del negocio | Business settings | Negocio | Business | Compact permitida en list item angosto |
| Settings action | contract_defaults | Valores del contrato | Contract defaults | Contrato | Contract | Compact permitida en list item angosto |
| Settings action | manage_plan | Gestionar plan | Manage plan | Plan | Plan | Preferir `Gestionar plan` sobre `Gestionar suscripción` en CTA corto |
| Settings action | privacy_policy | Política de privacidad | Privacy policy | Privacidad | Privacy | Compact permitida |
| Settings action | terms_conditions | Términos y condiciones | Terms and conditions | Términos | Terms | Compact permitida |
| Settings action | delete_account | Eliminar cuenta | Delete account | Eliminar cuenta | Delete account | Acción destructiva: evitar abreviar demasiado |
| Settings action | logout | Cerrar sesión | Sign out | Salir | Sign out | `Salir` sólo como compact secondary |
| Settings profile | dark_mode | Modo oscuro | Dark mode | Oscuro | Dark mode | Compact permitida en toggles apretados |
| Settings profile | language | Idioma | Language | Idioma | Language | — |
| Settings profile | language_updated | Idioma actualizado | Language updated | Idioma actualizado | Language updated | — |
| Settings theme | choose_theme | Elegir tema | Choose theme | Tema | Theme | Compact sólo en dialogs pequeños |
| Settings theme | system_default | Predeterminado del sistema | System default | Sistema | System | Compact permitida |
| Settings theme | light | Claro | Light | Claro | Light | — |
| Settings theme | dark | Oscuro | Dark | Oscuro | Dark | — |
| Settings profile | not_configured | No configurado | Not configured | Sin configurar | Not set | `Sin configurar` aprobado como compact |
| Clients | title | Clientes | Clients | Clientes | Clients | — |
| Clients | new_client | Nuevo cliente | New client | Nuevo | New | Compact permitida en CTA pequeña |
| Clients | edit_client | Editar cliente | Edit client | Editar | Edit | Compact sólo en action button angosto |
| Clients | add_client | Agregar cliente | Add client | Agregar | Add | `Nuevo cliente` preferido para CTA principal; `Agregar` permitido en affordances secundarias |
| Clients | search_placeholder | Buscar clientes... | Search clients... | Buscar... | Search... | No usar `Filtrar clientes...` como placeholder principal |
| Clients | export_csv | Exportar CSV | Export CSV | Exportar | Export | Compact permitida |
| Clients | name | Nombre | Name | Nombre | Name | — |
| Clients | full_name | Nombre completo | Full name | Nombre | Name | Compact permitida |
| Clients | phone | Teléfono | Phone | Teléfono | Phone | No usar `Telefono` sin tilde en catálogos nuevos |
| Clients | email | Correo electrónico | Email | Correo | Email | Compact permitida |
| Clients | address | Dirección | Address | Dirección | Address | No usar `Direccion` sin tilde en catálogos nuevos |
| Clients | city | Ciudad | City | Ciudad | City | — |
| Clients | notes | Notas | Notes | Notas | Notes | — |
| Clients | photo_optional | Foto (opcional) | Photo (optional) | Foto | Photo | Compact permitida debajo de avatar |
| Clients | tap_add_photo | Tocá para agregar foto | Tap to add photo | Agregar foto | Add photo | Source neutral: preferir `Agregar foto` en catálogo base; frase completa puede vivir como helper contextual |
| Clients | uploading_photo | Subiendo foto... | Uploading photo... | Subiendo... | Uploading... | Compact permitida |
| Clients | personal_info | Información personal | Personal information | Datos | Personal info | Compact permitida en cards chicas |
| Clients | contact_info | Información de contacto | Contact information | Contacto | Contact info | Compact permitida |
| Clients | total_events | Eventos totales | Total events | Eventos | Events | Compact permitida en KPI card |
| Clients | total_spent | Total gastado | Total spent | Gastado | Spent | Compact permitida en KPI card |
| Clients | average_per_event | Promedio por evento | Average per event | Promedio | Average | Compact permitida en KPI card |
| Clients | event_history | Historial de eventos | Event history | Historial | History | Compact permitida en headers angostos |
| Clients | no_clients | Sin clientes | No clients | Sin clientes | No clients | — |
| Clients | no_results | Sin resultados | No results | Sin resultados | No results | — |
| Clients | no_events_registered | Sin eventos registrados | No events recorded | Sin eventos | No events | Compact permitida |
| Clients | create_first_client | Agrega tu primer cliente para empezar | Add your first client to get started | Crear cliente | Create client | Compact permitida en empty state mobile |
| Clients | no_match_search | No se encontraron clientes que coincidan con tu búsqueda | No clients matched your search | Sin coincidencias | No matches | Compact permitida |
| Clients | not_registered | No registrado | Not provided | No registrado | Not provided | No usar `No proporcionado` como canonical cross-platform |
| Clients | call | Llamar | Call | Llamar | Call | — |
| Clients | delete_client_title | Eliminar cliente | Delete client | Eliminar | Delete | Título completo en dialog |
| Clients | delete_client_description | Esta acción no se puede deshacer. | This action cannot be undone. | No se puede deshacer. | Can't be undone. | Si el nombre del cliente está en contexto visual, esta versión corta alcanza |
| Clients | delete_client_named_description | Se eliminará este cliente. Esta acción no se puede deshacer. | This client will be deleted. This action cannot be undone. | No se puede deshacer. | Can't be undone. | Evitar textos distintos por plataforma salvo por contexto UI |
| Clients | retry | Reintentar | Retry | Reintentar | Retry | — |
| Products | title | Productos | Products | Productos | Products | — |
| Products | new_product | Nuevo producto | New product | Nuevo | New | Compact permitida |
| Products | add_product | Agregar producto | Add product | Agregar | Add | `Nuevo producto` preferido como CTA principal |
| Products | search_placeholder | Buscar productos... | Search products... | Buscar... | Search... | No usar `Filtrar productos...` como placeholder principal |
| Products | export_csv | Exportar CSV | Export CSV | Exportar | Export | Compact permitida |
| Products | name | Nombre | Name | Nombre | Name | — |
| Products | category | Categoría | Category | Categoría | Category | — |
| Products | base_price | Precio base | Base price | Precio | Price | Compact permitida |
| Products | active_product | Producto activo | Active product | Activo | Active | Compact permitida en toggles/cards |
| Products | visible_in_quotes | Visible en cotizaciones | Visible in quotes | Visible | Visible | Compact permitida |
| Products | image_optional | Imagen (opcional) | Image (optional) | Imagen | Image | Compact permitida |
| Products | select_image | Seleccionar imagen | Select image | Imagen | Image | Compact sólo en botones chicos |
| Products | change_image | Cambiar imagen | Change image | Cambiar | Change | Compact permitida |
| Products | uploading_image | Subiendo imagen... | Uploading image... | Subiendo... | Uploading... | Compact permitida |
| Products | composition_ingredients | Composición / insumos | Composition / ingredients | Composición | Composition | Mantener slash, no inventar 2 labels distintas por plataforma |
| Products | composition_description | Solo los insumos generan costo al producto. | Only ingredients contribute product cost. | Solo genera costo. | Cost-driving only. | Compact permitida como helper corto |
| Products | required_equipment | Equipo necesario | Required equipment | Equipo | Equipment | Compact permitida |
| Products | required_equipment_description | Activos reutilizables. No se incluyen en el costo. | Reusable assets. They are not included in cost. | Sin costo | No cost | Compact sólo como badge/helper mínimo |
| Products | event_supplies | Insumos por evento | Event supplies | Insumos evento | Event supplies | Compact permitida |
| Products | event_supplies_description | Costo fijo por evento. | Fixed cost per event. | Costo fijo | Fixed cost | Compact permitida |
| Products | add | Agregar | Add | Agregar | Add | — |
| Products | quantity | Cantidad | Quantity | Cant. | Qty | Compact sólo en tablas muy densas |
| Products | estimated_cost | Costo estimado | Estimated cost | Costo est. | Est. cost | Compact permitida |
| Products | associated_team | Equipo asociado | Associated team | Equipo | Team | Compact permitida |
| Products | no_team | Sin equipo | No team | Sin equipo | No team | — |
| Products | select_item | Seleccionar ítem | Select item | Seleccionar | Select | Compact permitida |
| Products | stock | Stock | Stock | Stock | Stock | — |
| Products | details | Detalles | Details | Detalles | Details | — |
| Products | edit_product | Editar producto | Edit product | Editar | Edit | Compact permitida |
| Products | delete_product_title | Eliminar producto | Delete product | Eliminar | Delete | Título completo en dialog |
| Products | delete_product_description | Esta acción no se puede deshacer. | This action cannot be undone. | No se puede deshacer. | Can't be undone. | Mantener copy destructiva breve y clara |
| Products | inactive | Inactivo | Inactive | Inactivo | Inactive | — |
| Products | unit_cost | Costo por unidad | Cost per unit | Costo/u | Unit cost | Compact permitida |
| Products | estimated_margin | Margen estimado | Estimated margin | Margen est. | Est. margin | Compact permitida |
| Products | upcoming_events | Próximos eventos | Upcoming events | Próximos | Upcoming | Compact permitida |
| Products | no_products | Sin productos | No products | Sin productos | No products | — |
| Products | no_results | Sin resultados | No results | Sin resultados | No results | — |
| Products | create_first_product | Agrega tu primer producto al catálogo | Add your first product to the catalog | Crear producto | Create product | Compact permitida en empty state |
| Products | no_match_filters | No se encontraron productos que coincidan con los filtros aplicados | No products matched the applied filters | Sin coincidencias | No matches | Compact permitida |
| Inventory | title | Inventario | Inventory | Inventario | Inventory | — |
| Inventory | new_item | Nuevo ítem | New item | Nuevo | New | Compact permitida |
| Inventory | add_item | Agregar ítem | Add item | Agregar | Add | `Nuevo ítem` preferido como CTA principal |
| Inventory | search_placeholder | Buscar inventario... | Search inventory... | Buscar... | Search... | No usar `Filtrar inventario...` como placeholder principal |
| Inventory | low_stock | Stock bajo | Low stock | Stock bajo | Low stock | — |
| Inventory | adjust_stock | Ajustar stock | Adjust stock | Ajustar | Adjust | Compact permitida |
| Inventory | confirm | Confirmar | Confirm | Confirmar | Confirm | — |
| Inventory | name | Nombre | Name | Nombre | Name | No usar `Nombre del item` como canonical corto |
| Inventory | item_name | Nombre del ítem | Item name | Nombre | Item name | Compact permitida |
| Inventory | type | Tipo | Type | Tipo | Type | — |
| Inventory | ingredient | Consumible | Consumable | Consumible | Consumable | Reemplaza `Ingrediente` si el dominio se refiere a stock consumible general |
| Inventory | supply | Insumo por evento | Event supply | Insumo evento | Event supply | Compact permitida |
| Inventory | equipment | Equipo | Equipment | Equipo | Equipment | No usar `Activo / Equipo` como canonical corto |
| Inventory | current_stock | Stock actual | Current stock | Stock | Stock | Compact permitida |
| Inventory | minimum_stock | Stock mínimo | Minimum stock | Mínimo | Minimum | Compact permitida |
| Inventory | unit | Unidad | Unit | Unidad | Unit | — |
| Inventory | unit_cost | Costo unitario | Unit cost | Costo | Cost | Compact permitida |
| Inventory | stock_value | Valor en stock | Stock value | Valor stock | Stock value | Compact permitida |
| Inventory | minimum_recommended | Mínimo recomendado | Recommended minimum | Mínimo rec. | Recommended min. | Compact permitida |
| Inventory | demand_next_7_days | Demanda próximos 7 días | Demand next 7 days | Demanda 7 días | 7-day demand | Compact permitida |
| Inventory | consumption_section | Consumibles | Consumables | Consumibles | Consumables | Canonical para la sección de ingredientes consumibles |
| Inventory | supplies_section | Insumos por evento | Event supplies | Insumos evento | Event supplies | Compact permitida |
| Inventory | equipment_section | Equipos | Equipment | Equipos | Equipment | — |
| Inventory | no_inventory | Sin inventario | No inventory | Sin inventario | No inventory | — |
| Inventory | no_results | Sin resultados | No results | Sin resultados | No results | — |
| Inventory | no_low_stock_items | No hay ítems con stock bajo | No low-stock items | Sin stock bajo | No low stock | Compact permitida |
| Inventory | create_first_item | Agrega tu primer ítem al inventario | Add your first item to inventory | Crear ítem | Create item | Compact permitida |
| Inventory | delete_item_title | Eliminar ítem | Delete item | Eliminar | Delete | Título completo en dialog |
| Inventory | delete_item_description | Esta acción no se puede deshacer. | This action cannot be undone. | No se puede deshacer. | Can't be undone. | Mantener copy destructiva breve y clara |
| Inventory | details | Ver detalles | View details | Detalles | Details | Compact permitida |
| Inventory | save | Guardar | Save | Guardar | Save | — |

### Inventario operativo por slice

#### Dashboard

Strings visibles detectados en código actual:

- `Inicio`
- `Actualizar`
- `Ventas Netas` / `Cobrado` / `IVA Cobrado` / `IVA Pendiente`
- `Eventos del Mes` / `Stock Bajo` / `Clientes` / `Cotizaciones`
- `Nuevo Evento` / `Nuevo Cliente`
- `Alertas de Inventario` / `Próximos Eventos`
- `Registrar pago` / `Pagar y completar` / `Solo completar` / `Ver detalle`
- `Estado de Eventos` / `Comparativa Financiera`
- `Ingresos — Últimos 6 meses`
- `Hola`
- `Hola, {{name}}`

Notas de normalización:

- `Inicio` queda como título canónico de Dashboard en ES.
- `Dashboard` no debe aparecer en UI ES; sólo en docs técnicas o nombres de archivo.
- `Guardar Pago` no es preferido; `Registrar pago` es el canonical. `Pagar y completar` queda aprobado como compact variant.
- `Ventas Netas` se normaliza a `Ventas netas` en sentence case para todos los catálogos nuevos.
- `Hola, {{name}}` es el saludo canonical vigente del Dashboard. `Bienvenido` queda descartado mientras la UI mantenga tono cálido/directo.
- `Cobrado`, `IVA pendiente` y `Eventos del mes` son las labels vigentes en KPI cards web. Expectations con `Cobrado Real`, `IVA por Cobrar` o `Eventos activos` deben considerarse stale.

#### Events list

Strings visibles detectados en código actual:

- `Eventos`
- `Exportar CSV`
- `Cotización Rápida`
- `Nuevo Evento`
- `Buscar eventos...`
- `Limpiar búsqueda`
- `Todos` / `Cotizado` / `Confirmado` / `Completado` / `Cancelado`
- `Seleccioná el rango` / `Filtro de fechas` / `Aplicar` / `Cancelar`
- `Limpiar todo`
- `Ordenar por` / `Ordenar eventos` / `Ascendente` / `Descendente`
- `Fecha` / `Cliente` / `Tipo de Servicio` / `Personas` / `Estado` / `Total` / `Ciudad`
- `Cambiar estado` / `Editar` / `Eliminar`
- `Eliminar evento`
- `Se eliminarán todos los datos del evento, incluyendo pagos y archivos. Esta acción no se puede deshacer.`
- `Eliminar permanentemente`
- `Sin resultados` / `Sin eventos`
- `No se encontraron eventos con ese filtro`
- `Crea tu primer evento para comenzar`
- `Todo el día`

Notas de normalización:

- Para source neutral LATAM usamos `Seleccionar rango`, no `Seleccioná el rango`, dentro de catálogos nuevos.
- `Buscar eventos...` es el placeholder canonical para search textual. `Filtrar eventos...` confunde search con filtros estructurados.
- `Servicio` es la label corta aprobada. `Tipo de servicio` queda para export/table layouts donde haya espacio.
- `Nuevo evento` y `Cotización rápida` usan sentence case en catálogos nuevos.

#### EventSummary

Strings visibles detectados en el slice web estabilizado:

- `Volver a la lista`
- `Presupuesto` / `Lista de Insumos` / `Checklist` / `Contrato` / `Reporte de Pagos`
- `Cobro en Línea` / `Pagar con Stripe`
- `Ver resumen del evento` / `Ver pagos del evento` / `Ver lista de insumos` / `Ver contrato del evento` / `Ver fotos del evento` / `Ver checklist del evento`
- `Información del evento`
- `Pagado`
- `Insumos asignados` / `Equipo Asignado` / `Personal Asignado`
- `Configuración Financiera y Contrato`
- `Venta Neta` / `IVA` / `Costos` / `Utilidad Neta`
- `Progreso de Cobro`
- `Registrar anticipo` / `Registrar pago`
- `Fotos del Evento` / `Agregar Fotos`
- `Checklist del evento`

Notas de normalización:

- `IVA` queda como label canonical corta del resumen financiero actual en web. Copy o tests que esperen `Requiere factura (IVA ...)` dentro de `EventSummary` están desactualizados tras la remoción previa del invoice UI (#215).
- Mientras el flujo de eventos web comparta un solo catálogo, `events.json` debe incluir al menos `list`, `form`, `general`, `products`, `extras`, `financials`, `summary`, `staff`, `supplies`, `equipment`, `quick_client` y `client_portal_share`.

#### Event detail + event form

Strings visibles detectados en código actual:

- `Detalle del evento` / `Editar evento` / `Nuevo evento`
- `Pagos`, `Registrar pago`, `Anticipo`, `Liquidar`, `Historial de pagos`
- `Contrato`, `Checklist`, `Lista de insumos`, `Fotos del evento`, `Portal del cliente`
- `Duplicar evento`, `Compartir por WhatsApp`, `Eliminar evento`
- `Información general`, `Productos`, `Extras`, `Inventario y personal`, `Finanzas y contrato`
- `Seleccionar cliente`, `Fecha del evento`, `Hora`, `Tipo de servicio`, `Ubicación`, `Ciudad`
- `Agregar producto`, `Agregar extra`, `Agregar equipo`, `Agregar insumo`, `Agregar colaborador`
- `Rentabilidad`, `IVA`, `Descuento`, `Notas del evento`, `Política de cancelación`
- `Link del cliente`, `Copiar enlace`, `Rotar`, `Deshabilitar`

Notas de normalización:

- `Detalle del evento` queda como título canonical para el hub del evento; no mezclar con `Resumen del evento` como título principal.
- `Registrar pago` sigue siendo el canonical; `Guardar pago` no se usa en nuevas superficies.
- `Portal del cliente` es el nombre canonical del share link organizer-facing; evitar variantes como `Link del cliente` como título principal.
- `Inventario y personal` se mantiene como label del paso agrupado cross-platform aunque adentro existan subsecciones `Insumos`, `Equipamiento` y `Personal`.
- `Nuevo evento` / `Editar evento` usan sentence case y se comparten entre toolbar, títulos y breadcrumbs.
- **Estado 2026-04-29**: slice implementado cross-platform. Web, iOS y Android ya consumen catálogo/localized resources para detail hub, event form, payments, client portal share, checklist, contrato, fotos, staff, equipment, supplies y validaciones visibles.

#### Auth / Settings

Strings visibles detectados en código actual:

- `Iniciar Sesión` / `Crear Cuenta`
- `Correo Electrónico` / `Contraseña` / `Confirmar Contraseña`
- `¿Olvidaste tu contraseña?`
- `o continuá con`
- `Continuar con Google` / `Continuar con Apple`
- `¿No tenés cuenta?` / `¿Ya tenés cuenta?`
- `Recuperar Contraseña` / `Restablecer Contraseña`
- `Enviar Enlace` / `Ir a Login` / `Volver al Inicio`
- `Ajustes`
- `Apariencia` / `Cuenta` / `Suscripción` / `Información`
- `Editar Perfil` / `Cambiar Contraseña` / `Ajustes del Negocio`
- `Valores del Contrato` / `Notificaciones`
- `Gestionar Plan`
- `Política de Privacidad` / `Términos y Condiciones` / `Eliminar Cuenta`
- `Cerrar Sesión`
- `Elegir tema` / `Predeterminado del Sistema` / `Claro` / `Oscuro`
- `Idioma`

Notas de normalización:

- Para catálogos nuevos usamos **sentence case**: `Iniciar sesión`, `Crear cuenta`, `Correo electrónico`, `Cerrar sesión`.
- `Ajustes` queda como canonical cross-platform; no mezclamos `Configuración` en unas superficies y `Ajustes` en otras.
- `Gestionar plan` queda como CTA canonical corta. `Suscripción` queda para sección/tab, no necesariamente para el botón principal.
- `Cerrar sesión` es canonical; `Salir` sólo como compact secondary variant.
- `Correo electrónico` es el canonical completo; `Correo` queda aprobado como compact label si el layout mobile se rompe.

#### Clients

Strings visibles detectados en código actual:

- `Clientes`
- `CSV` / `Exportar CSV`
- `Nuevo Cliente` / `Agregar Cliente`
- `Buscar clientes` / `Buscar clientes...` / `Filtrar clientes por nombre o teléfono...`
- `Cliente` / `Detalle del Cliente`
- `Editar cliente` / `Editar`
- `Nombre` / `Nombre Completo`
- `Teléfono` / `Telefono`
- `Correo Electrónico` / `Email`
- `Dirección` / `Direccion`
- `Ciudad`
- `Notas`
- `Foto (optional)` / `Foto del cliente` / `Seleccionar foto` / `Toca para agregar foto` / `Subiendo foto...`
- `Información de Contacto` / `Información personal`
- `Estadisticas`
- `Total Eventos` / `Total Gastado` / `Promedio`
- `Historial de Eventos`
- `Sin clientes`
- `Agrega tu primer cliente para empezar`
- `Sin resultados`
- `No se encontraron clientes que coincidan con tu busqueda`
- `Sin eventos registrados`
- `No proporcionado` / `No registrado`
- `Eliminar cliente`
- `¿Eliminar este cliente? Esta acción no se puede deshacer.`
- `Se eliminara a {nombre}. Podras deshacer durante unos segundos.`
- `Llamar`

Notas de normalización:

- Para nuevos catálogos usamos `Buscar clientes...`, no `Filtrar clientes...`, porque el campo es búsqueda textual.
- `Nuevo cliente` queda como CTA principal canonical. `Agregar cliente` queda permitido en FABs, accessibility labels o affordances secundarias.
- `Correo electrónico` gana sobre `Email` como label. `Email` queda aceptable sólo como valor corto/context menu o si la plataforma ya lo usa en affordances mínimas.
- `No registrado` queda como fallback canonical cross-platform; evita drift con `No proporcionado`.
- Corregimos tildes y sentence case en nuevos catálogos: `Teléfono`, `Dirección`, `Estadísticas`, `Historial de eventos`.

#### Próxima expansión inmediata

Los siguientes dominios deben agregarse a la matrix en la próxima iteración de #203:

- **Products / Inventory**: stock, costo, precio, unidad, receta, equipo, insumo

## Checklist de review por slice

- [ ] El flujo tiene inventario completo de strings visibles.
- [ ] Existe ES canonical y EN canonical para cada key.
- [ ] Las variantes compact mobile están justificadas y documentadas.
- [ ] iOS, Android y Web expresan la misma intención para la misma acción.
- [ ] No quedan strings hardcodeados en pantallas, diálogos, toasts o empty states del flujo.
- [ ] Fechas, números y moneda respetan locale y convenciones contables definidas.
- [ ] Los textos destructivos mantienen contexto suficiente en mobile.

## Mapa de archivos por plataforma

| Plataforma | Catálogo ES | Catálogo EN | Cómo se consume |
| --- | --- | --- | --- |
| **iOS** | `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Resources/Localizable.xcstrings` (sourceLanguage=es) | Mismo archivo, campo `en.stringUnit.value` | `Text(String(localized: "calendar.title", bundle: .module))` |
| **Android** | `android/feature/<feature>/src/main/res/values/strings.xml` | `.../values-en/strings.xml` | `stringResource(R.string.calendar_title)` o `pluralStringResource(...)` |
| **Web** | `web/src/i18n/locales/es/<namespace>.json` | `web/src/i18n/locales/en/<namespace>.json` | `const { t } = useTranslation('calendar'); t('title')` |

## Infraestructura

### iOS

- [Package.swift](ios/Packages/SolennixFeatures/Package.swift) declara `defaultLocalization: "es"` y `resources: [.process("Resources")]` en el target.
- [project.yml](ios/project.yml) agrega `developmentLanguage: es` + `knownRegions: [en, es, Base]` al root `options`.
- Formato: **String Catalog** (`.xcstrings`) — Xcode 15+, con entrada `sourceLanguage` y un objeto `strings` keyed por identifier. Cada entrada tiene `localizations.<locale>.stringUnit.{state,value}`.
- Los strings se consumen con `String(localized: "key", bundle: .module)` — el `bundle: .module` es obligatorio porque las features viven en un SPM package, no en el app target.
- Fechas/números: `DateFormatter` con `locale = Locale.autoupdatingCurrent` + `setLocalizedDateFormatFromTemplate` para que el formato siga el idioma del device.

### Android

- `strings.xml` por feature module: `android/feature/<module>/src/main/res/values/strings.xml` (default ES), `values-en/strings.xml` (EN).
- Los modules NO dependen de `:app` por R — cada feature module ship sus propias strings para evitar ciclos de dependencia.
- Shared UI strings (`ok`, `cancel`, `delete`) se mantienen scoped al module que los necesita (p.ej. `calendar_action_cancel`) — `core:designsystem` podría absorberlos en un slice futuro si más módulos los duplican.
- Consumo: `stringResource(R.string.calendar_title)` / `pluralStringResource(R.plurals.calendar_event_count, count, count)` dentro de `@Composable`.

### Web

- Deps: `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- Config: [web/src/i18n/config.ts](web/src/i18n/config.ts) con `fallbackLng: "es"`, `load: "languageOnly"`, `supportedLngs: ["es", "en"]` — regionales colapsan al base.
- Init side-effect en [web/src/main.tsx](web/src/main.tsx) antes del primer render.
- Locales: `web/src/i18n/locales/{es,en}/<namespace>.json`.
- Consumo: `const { t, i18n } = useTranslation('calendar'); <h1>{t('title')}</h1>`.
- Fechas via `date-fns`: helper `pickDateFnsLocale(i18n.language)` elige entre `es` / `enUS` según el idioma vigente.
- **Persistencia**: El idioma se cambia en `Settings.tsx`, se guarda en la base de datos (`user.preferred_language`) y `AuthContext` sincroniza automáticamente la UI (`i18n.changeLanguage(user.preferred_language)`) al iniciar sesión.
- Tests: [tests/setup.ts](web/tests/setup.ts) importa `../src/i18n/config` y pinea `i18n.changeLanguage('es')` para que las assertions sean deterministas (evita que el `navigator.language` del CI lleve los tests a EN).

## Qué NO localizamos

- **Datos ingresados por el usuario**: nombres de eventos, descripciones, motivos de bloqueo, nombres de clientes, etc. viajan tal cual.
- **Moneda**: MXN se formatea con `es-MX` (comas para miles) independiente del idioma de UI — convención contable mexicana.
- **Errores de backend**: los mensajes en `error` de respuestas HTTP siguen en inglés. Los clients los capturan y muestran su propio mensaje localizado del catálogo (`calendar.error.load_failed`, etc.), no el texto crudo del backend.
- **Endpoints**: las rutas API usan kebab-case en inglés (`/api/dashboard/revenue-chart`) — tráfico HTTP no cambia con el idioma.

## Próximos slices

1. **#203 — Canonical copy matrix + governance**: completar esta matrix y convertirla en criterio obligatorio de review.
2. **#94 / #95**: cerrar Dashboard y Events list con paridad real en iOS, Android y Web.
3. **#204 / #205 / #206 / #207 / #208**: expandir el mismo patrón por flujo.
4. **#209 — Final sweep**: barrido final de strings hardcodeados, drift semántico y fallbacks.
5. **Selector de idioma en Mobile**: Agregar el selector de idioma en Settings de iOS (`@AppStorage("preferredLocale")`) y Android (`LocaleManager.setApplicationLocales`), que sincronicen con el backend igual que la web.
6. **Backend i18n** (opcional, lower priority): `Accept-Language` header routing + tabla de traducciones server-side para mensajes que se muestran al usuario crudos (validaciones de formularios).

## Verificación rápida

### iOS

```
# Cambia el idioma del simulador via Settings → General → Language & Region → iPhone Language → English
# Reinstala y relanza la app. La pantalla Calendario debería mostrar textos en EN.
```

### Android

```bash
adb shell setprop persist.sys.locale en-US
adb shell am broadcast -a android.intent.action.LOCALE_CHANGED
adb shell am force-stop com.solennix.app
adb shell monkey -p com.solennix.app -c android.intent.category.LAUNCHER 1
```

### Web

```js
// Browser console
localStorage.setItem('i18nextLng', 'en');
location.reload();
```
