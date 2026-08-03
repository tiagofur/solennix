# Profile Sharing Specification

## Purpose

El botón "Compartir mi perfil" en el dashboard del proveedor (#1120 Parte B) hace ridículamente fácil difundir el link `/u/:slug` del organizador. Es el motor de adquisición de v2.0 (PRD §6.4): cada share = cliente potencial a CAC ~$0. Sin esto, el directorio y el flujo de solicitudes quedan sin tráfico orgánico.

## Requirements

### Requirement: Card de sharing en el dashboard

El sistema MUST mostrar un componente `ShareProfileCard` en el dashboard del proveedor, visible en <3 clics desde el home (1 clic: está en el home directamente).

#### Scenario: Provider con perfil habilitado

- GIVEN un provider autenticado con public_slug e is_enabled=true
- WHEN abre el dashboard
- THEN ve la card "Compartir mi perfil" con las acciones de share

#### Scenario: Provider sin perfil habilitado

- GIVEN un provider sin public_slug o is_enabled=false
- WHEN abre el dashboard
- THEN ve un CTA "Configurá tu perfil público" que linkea a Settings

### Requirement: Acciones de share

El sistema MUST ofrecer: copiar link, WhatsApp, Web Share API nativo (si soportado).

#### Scenario: Copiar link

- GIVEN la card de share visible
- WHEN el provider clic en "Copiar link"
- THEN el link `${origin}/u/${slug}` se copia al clipboard y se muestra feedback "Copiado"

#### Scenario: WhatsApp

- GIVEN la card de share visible
- WHEN el provider clic en "WhatsApp"
- THEN abre `https://wa.me/?text=${encodedLink}` en una pestaña nueva

#### Scenario: Web Share nativo (si soportado)

- GIVEN `navigator.share` existe (mobile/Chrome Android)
- WHEN la card renderiza
- THEN muestra el botón "Compartir" nativo que invoca `navigator.share({ url: link })`

#### Scenario: Web Share no soportado (desktop)

- GIVEN `navigator.share` es undefined (Safari desktop/Firefox)
- WHEN la card renderiza
- THEN el botón nativo NO aparece (solo copiar + WhatsApp)

### Requirement: Link construido correctamente

El sistema MUST construir el link como `${origin}/u/${slug}` donde origin es `window.location.origin` (la web, no la API).

#### Scenario: Link correcto

- GIVEN slug="alice-catering" y origin="https://solennix.com"
- WHEN se construye el link
- THEN es "https://solennix.com/u/alice-catering"

### Requirement: Incentivo visible

El sistema MUST mostrar copy motivacional: "Cada vez que compartís tu perfil, podés recibir solicitudes nuevas".

#### Scenario: Incentivo presente

- GIVEN la card de share visible
- WHEN se renderiza
- THEN el copy motivacional está visible

### Requirement: Feedback de copiado

El sistema MUST mostrar feedback visual ("Copiado") tras copiar el link, que desaparece tras 2s.

#### Scenario: Feedback temporal

- GIVEN el provider clic en copiar
- WHEN se completa la copia
- THEN aparece "Copiado" y desaparece tras 2 segundos

### Requirement: i18n ES/EN

El sistema MUST tener todos los strings en ES y EN.

#### Scenario: Strings EN

- GIVEN idioma EN
- WHEN la card renderiza
- THEN todos los textos están en inglés
