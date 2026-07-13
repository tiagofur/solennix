# Sesión — Issue #879 (Inventory follow-up)

- **Issue:** #879 — feat(web): Master-detail split pane for Inventory at xl+
- **Estado:** done
- **Branch:** `feat/web-inventory-split-pane-879`
- **Base:** main (post-#978, que agregó Clients + Products)

## Cambios
- **InventoryDetails.tsx**: extraído `InventoryDetailPanel({ itemId, embedded?, onDeleted? })`. El componente ruta `InventoryDetails` queda como wrapper delgado. Modo `embedded`: omite `<Breadcrumb>` + back button; delete success llama `onDeleted`.
- **InventoryList.tsx**: en xl envuelve el contenido en `<SplitPane>`. Row click → `setSearchParams({selected: id})` en xl, `navigate` en < xl. Row activa highlight + `aria-current`. Empty state "Seleccioná un insumo".
- **i18n**: `split.select_item` / `split.select_item_hint` en es + en.
- **Tests**: `InventoryList.test.tsx` +3 casos xl (empty state, detail panel con `?selected=`, select sin navigate). Mock de `useBreakpoint` + stub de `InventoryDetailPanel`.

## Verificación
- `npm run check`: verde
- `npm run lint`: 0 errors (5 warnings pre-existentes)
- `npm run test:run`: 1371 tests / 127 files verde (+3 nuevos)

## Notas
- Reutiliza la infraestructura de #978 (`SplitPane`, `useIsXl`) — sin nuevos componentes compartidos.
- Mismo patrón exacto que Clients/Products: row click condicional, `?selected=` param, wrapper delgado para la ruta.
- Queda pendiente Events/EventSummary (82KB monolítico) como follow-up final de #879.
