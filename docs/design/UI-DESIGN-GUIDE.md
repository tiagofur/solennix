# Solennix — Guía de Diseño UI

> **"Moderna. Elegante. Minimalista."**
> Última actualización: Marzo 2026

---

## 1. Filosofía de Diseño

Solennix debe sentirse como una herramienta **premium pero accesible**. La estética combina la elegancia de la marca (navy + dorado) con la limpieza de un design system moderno inspirado en las Human Interface Guidelines de Apple.

### Principios Fundamentales

1. **Espacio es lujo** — Generoso padding y spacing entre elementos. Nunca amontonar contenido.
2. **Color como acento** — Los fondos son neutros; el dorado aparece solo donde importa.
3. **Un CTA por pantalla** — Un solo botón principal premium-gradient. El resto es secundario.
4. **Consistencia sobre creatividad** — Mismos tokens, mismos patrones, en toda la app.
5. **Mobile-first, responsive siempre** — Diseñar para mobile, adaptar para desktop.

---

## 2. Paleta de Colores en la App

### 2.1 Problema Actual y Corrección

**Diagnóstico:** La app actualmente mezcla colores de forma inconsistente. Se encontraron instancias de grays hardcodeados (`gray-500`, `gray-400`), uso inconsistente de tokens semánticos, y falta de claridad sobre cuándo usar colores de marca vs. colores del sistema.

**Regla de oro:** Los colores de marca (Navy, Dorado, Crema) son para **branding y acentos**. Los fondos, textos y bordes de la UI usan **tokens semánticos del design system**.

### 2.2 Tokens de Color — Referencia Definitiva

#### Marca (Brand)
| Token | Light | Dark | Uso Correcto |
|-------|-------|------|-------------|
| `primary` | `#C4A265` | `#C4A265` | CTAs, iconos activos, badges, links, focus rings |
| `primary-dark` | `#B8965A` | `#B8965A` | Hover de primary, gradientes |
| `primary-light` | `#F5F0E8` | `#F5F0E8` | Fondos hover sutiles (bg-primary-light/50) |
| `accent` | `#1B2A4A` | `#1B2A4A` | Elementos de contraste, landing page |
| `secondary` | `#6B7B8D` | `#94A3B8` | Texto terciario, elementos decorativos |

#### Superficies (Backgrounds)
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `bg` | `#f3f4f6` | `#000000` | Fondo de página (el más externo) |
| `surface-grouped` | `#ffffff` | `#09090b` | Panel de contenido principal |
| `surface` | `#f9fafb` | `#121212` | Áreas internas |
| `surface-alt` | `#f3f4f6` | `#1c1c1e` | Hover, estados alternos |
| `card` | `#ffffff` | `#121212` | Cards y contenedores |

#### Texto
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `text` | `#111827` | `#f5f5f7` | Texto principal, títulos |
| `text-secondary` | `#6b7280` | `#a1a1aa` | Texto secundario, labels |
| `text-tertiary` | `#9ca3af` | `#71717a` | Placeholders, texto deshabilitado |

#### Bordes
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `border` | `#e5e7eb` | `#27272a` | Bordes estándar |
| `border-strong` | `#d1d5db` | `#3f3f46` | Bordes con más énfasis |
| `separator` | `rgba(60,60,67,0.29)` | `rgba(84,84,88,0.65)` | Divisores de sección |

#### Semánticos
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `success` | `#34c759` | `#30d158` | Completado, activo, confirmado |
| `warning` | `#ff9500` | `#ff9f0a` | Alerta, stock bajo |
| `error` | `#ff3b30` | `#ff453a` | Error, cancelado, eliminar |
| `info` | `#007aff` | `#0a84ff` | Info, links de sistema |

### 2.3 Reglas de Aplicación de Color

#### ✅ CORRECTO
```
- Botón CTA principal: premium-gradient (linear-gradient #C4A265 → #D4B87A)
- Icono activo en tab/sidebar: text-primary
- Badge de categoría: bg-primary/10 text-primary
- Focus ring en inputs: ring-primary/40
- Avatar sin imagen: bg-primary/10 text-primary
- Link hover: text-primary
- Progress bar fill: bg-primary
```

#### ❌ INCORRECTO
```
- Fondo de card dorado: bg-primary ← NUNCA
- Texto body en dorado: text-primary ← NO para párrafos
- Borde de input en dorado permanente: border-primary ← Solo en focus
- Fondo de página navy en modo light: bg-accent ← Navy es solo para landing/branding
- Dorado con opacidad baja sobre crema: ← Bajo contraste, ilegible
- Gray-500 hardcodeado: ← Usar text-text-secondary
```

---

## 3. Layout y Estructura

### 3.1 Web — Estructura de Página

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar (bg-surface-grouped, border-r border-border)         │
│  ┌────┐                                                       │
│  │Logo│  ← Solennix icon                                     │
│  ├────┤                                                       │
│  │ Nav │  ← Items: text-text-secondary, active: text-primary │
│  │items│     Active bg: bg-primary/10                         │
│  └────┘                                                       │
│                                                               │
│  Main Content (bg-bg)                                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Page Header                                         │     │
│  │  ┌──────────────────────────┐  ┌──────────────────┐ │     │
│  │  │ H1: font-black           │  │ CTA: premium-    │ │     │
│  │  │     tracking-tight        │  │      gradient    │ │     │
│  │  │     text-text             │  │      text-white  │ │     │
│  │  └──────────────────────────┘  └──────────────────┘ │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │  Content Area (bg-surface-grouped rounded-xl p-6)    │     │
│  │  ┌────────────────┐ ┌────────────────┐               │     │
│  │  │  Card           │ │  Card           │              │     │
│  │  │  bg-card        │ │  bg-card        │              │     │
│  │  │  rounded-lg     │ │  rounded-lg     │              │     │
│  │  │  border-border  │ │  border-border  │              │     │
│  │  │  shadow-sm      │ │  shadow-sm      │              │     │
│  │  └────────────────┘ └────────────────┘               │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile — Estructura de Pantalla

```
┌─────────────────────────────┐
│  Status Bar (system)         │
├─────────────────────────────┤
│  Navigation Header           │
│  bg-surface, border-bottom   │
│  Title: font-bold text-text  │
├─────────────────────────────┤
│                              │
│  ScrollView                  │
│  bg-surface-grouped          │
│                              │
│  ┌─────────────────────────┐│
│  │  Card (bg-card)          ││
│  │  rounded-3xl             ││
│  │  shadow-sm               ││
│  │  margin: spacing.md      ││
│  └─────────────────────────┘│
│                              │
│  ┌─────────────────────────┐│
│  │  Card (bg-card)          ││
│  │  rounded-3xl             ││
│  └─────────────────────────┘│
│                              │
├─────────────────────────────┤
│  Bottom Tabs                 │
│  bg-card, border-top         │
│  Active: primary             │
│  Inactive: text-secondary    │
└─────────────────────────────┘
```

---

## 4. Componentes Clave

### 4.1 Botones

| Tipo | Clase | Uso |
|------|-------|-----|
| **Primary CTA** | `premium-gradient text-white font-semibold rounded-lg px-6 py-3` | Acción principal (1 por pantalla) |
| **Secondary** | `bg-surface-alt text-text border border-border rounded-lg px-4 py-2` | Acciones secundarias |
| **Destructive** | `bg-error/10 text-error border border-error/30 rounded-lg px-4 py-2` | Eliminar, cancelar |
| **Ghost** | `text-primary hover:bg-primary/5 rounded-lg px-4 py-2` | Links, acciones terciarias |

### 4.2 Inputs

```css
/* Estado normal */
bg-card border border-border rounded-lg px-4 py-3
placeholder:text-text-tertiary text-text

/* Focus */
focus:ring-2 focus:ring-primary/40 focus:border-primary

/* Error */
border-error focus:ring-error/40

/* Label */
text-text-secondary text-sm font-medium mb-1
```

### 4.3 Cards

```css
/* Card estándar */
bg-card rounded-xl border border-border shadow-sm p-5

/* Card con hover */
bg-card rounded-xl border border-border shadow-sm hover:border-primary/30
hover:shadow-md transition-all

/* Card destacada / KPI */
bg-card rounded-xl border border-border shadow-sm p-5
/* Con icono: */
icon-container: bg-primary/10 text-primary rounded-lg p-2
```

### 4.4 Badges y Status

```css
/* Badge primario */
bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full

/* Status: Quoted */
bg-amber-100 text-amber-700 (light) / bg-amber-900/20 text-amber-400 (dark)

/* Status: Confirmed */
bg-emerald-100 text-emerald-700 (light) / bg-emerald-900/20 text-emerald-400 (dark)

/* Status: Completed */
bg-blue-100 text-blue-700 (light) / bg-blue-900/20 text-blue-400 (dark)

/* Status: Cancelled */
bg-error/10 text-error
```

### 4.5 Tipografía en la App

```css
/* Título de página */
font-black tracking-tight text-text text-2xl (mobile: text-xl)

/* Sección heading */
font-bold text-text text-lg

/* Body */
text-text text-base

/* Secundario */
text-text-secondary text-sm

/* Caption */
text-text-tertiary text-xs

/* Montos / Precios */
font-semibold text-text tabular-nums
/* Formato: .toLocaleString('es-MX', { minimumFractionDigits: 2 }) */
```

---

## 5. Patrones de UI

### 5.1 Loading States

- **Listas:** `SkeletonTable` — filas con animación de pulse
- **Cards:** `SkeletonCard` — bloques redondeados con pulse
- **Inline:** `SkeletonLine` — líneas de texto con pulse
- **NUNCA:** spinners genéricos solos (siempre acompañar con skeleton o texto)
- **Color del skeleton:** `bg-surface-alt animate-pulse`

### 5.2 Estados Vacíos

```
┌─────────────────────────────┐
│                              │
│         [Ilustración]        │
│     (tono gris suave, 120px)│
│                              │
│    "No hay clientes aún"     │
│    text-text text-lg         │
│    font-semibold             │
│                              │
│    "Agrega tu primer         │
│     cliente para empezar"    │
│    text-text-secondary       │
│                              │
│    [   Agregar Cliente   ]   │
│    premium-gradient          │
│                              │
└─────────────────────────────┘
```

### 5.3 Errores

```css
/* Alert de error */
bg-error/5 border border-error/30 rounded-lg p-4
text-error text-sm

/* Input con error */
border-error
/* Mensaje debajo: */
text-error text-xs mt-1

/* Error de página completa */
bg-surface-grouped
icon: text-error
título: text-text
descripción: text-text-secondary
CTA retry: premium-gradient
```

### 5.4 Alertas y Confirmaciones

```css
/* Alert informativa */
bg-info/5 border border-info/30 rounded-lg p-4 text-info

/* Alert de éxito */
bg-success/5 border border-success/30 rounded-lg p-4 text-success

/* Alert de advertencia */
bg-warning/5 border border-warning/30 rounded-lg p-4 text-warning

/* Modal de confirmación destructiva */
/* Botón cancelar: secondary */
/* Botón eliminar: bg-error text-white */
```

---

## 6. Dark Mode

### Principios de Dark Mode

1. **Negro puro para fondos** — `#000000` para bg exterior (OLED friendly)
2. **Superficies elevadas más claras** — Card: `#121212`, surface-alt: `#1c1c1e`
3. **Texto blanco cálido** — `#f5f5f7` (no blanco puro #fff que cansa la vista)
4. **Primary NO cambia** — El dorado `#C4A265` funciona en ambos modos
5. **Semánticos ajustados** — Ligeramente más brillantes en dark para legibilidad
6. **Bordes más oscuros** — `#27272a` en lugar de `#e5e7eb`

### Checklist Dark Mode

- [ ] Todos los fondos usan tokens de superficie (no colores hardcodeados)
- [ ] Texto usa tokens `text`, `text-secondary`, `text-tertiary`
- [ ] Bordes usan `border` y `border-strong`
- [ ] Imágenes y iconos tienen suficiente contraste
- [ ] Sombras son invisibles en dark (shadow-sm desaparece naturalmente)
- [ ] Las alertas semánticas usan opacidades bajas (bg-error/5, bg-success/5)

---

## 7. Espaciado y Border Radius

### Escala de Espaciado

| Token | Valor | Uso |
|-------|-------|-----|
| `xxs` | 2px | Micro separaciones |
| `xs` | 4px | Entre iconos y texto |
| `sm` | 8px | Padding interno compacto |
| `md` | 16px | Padding estándar, gaps |
| `lg` | 20px | Márgenes de pantalla (mobile) |
| `xl` | 24px | Separación de secciones |
| `xxl` | 32px | Espaciado entre grupos |
| `xxxl` | 48px | Separación de zonas mayores |

### Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `radius-sm` | 6px | Badges, chips, tags |
| `radius-md` | 10px | Inputs, botones |
| `radius-lg` | 14px | Cards (web) |
| `radius-xl` | 20px | Cards principales, modals |
| `rounded-3xl` | — | Cards principales (mobile) |

---

## 8. Animaciones y Transiciones

```css
/* Transición estándar para todos los interactivos */
transition-all duration-200

/* Hover scale sutil (solo cards clickeables) */
hover:scale-[1.02] transition-transform

/* Premium gradient animation (solo hero/landing) */
animate-gradient (8s ease infinite)

/* Skeleton pulse */
animate-pulse

/* NO usar: */
/* - Bounces exagerados */
/* - Delays mayores a 300ms */
/* - Animaciones en cada scroll */
```

---

## 9. Checklist de Revisión de Pantalla

Antes de considerar una pantalla "terminada", verificar:

- [ ] **Título:** `font-black tracking-tight text-text`
- [ ] **CTA principal:** `premium-gradient` (solo 1)
- [ ] **Colores:** Ningún gray hardcodeado, todo usa tokens
- [ ] **Focus rings:** `ring-primary/40` en todos los inputs
- [ ] **Errores:** `text-error` con `border-error` (no `text-red-500`)
- [ ] **Loading:** Skeleton, no spinner solo
- [ ] **Precios:** `toLocaleString('es-MX', { minimumFractionDigits: 2 })`
- [ ] **Avatares:** `bg-primary/10 text-primary`
- [ ] **Dark mode:** Todos los colores cambian correctamente
- [ ] **Spacing:** Consistente con la escala (no valores arbitrarios)
- [ ] **Border radius:** Consistente (radius-lg para cards, radius-md para inputs)

---

*Guía de Diseño UI v1.0 — Marzo 2026*
*Referencia: Brand Manual v2.0, screen-improvements-mar-2026.md*
