import { useState } from "react";
import {
  Home, Calendar, PartyPopper, Users, MoreHorizontal, Package, Boxes,
  Settings, Search, Plus, Zap, ChevronRight, Monitor, Tablet, Smartphone,
  Check, X, ArrowRight, LayoutDashboard, Menu, Bell, ChevronLeft,
  FileText, ClipboardList, Star, Globe, Apple, TabletSmartphone
} from "lucide-react";

// ─── Color Tokens ───────────────────────────────────────────────────────────
const C = {
  gold: "#C4A265",
  goldDark: "#B8965A",
  bg: "#F5F4F1",
  surface: "#FAF9F7",
  surfaceHover: "#F0EDE8",
  text: "#1A1A1A",
  textMuted: "#6B6560",
  border: "#E6E3DD",
  white: "#FFFFFF",
  danger: "#E74C3C",
  success: "#27AE60",
  warning: "#F39C12",
};

// ─── Data ───────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: "iphone", label: "iPhone", icon: Smartphone, group: "iOS" },
  { id: "ipad", label: "iPad", icon: Tablet, group: "iOS" },
  { id: "android-phone", label: "Android Phone", icon: Smartphone, group: "Android" },
  { id: "android-tab", label: "Android Tablet", icon: TabletSmartphone, group: "Android" },
  { id: "web-desktop", label: "Web Desktop", icon: Monitor, group: "Web" },
  { id: "web-mobile", label: "Web Mobile", icon: Globe, group: "Web" },
];

const BOTTOM_TABS = [
  { icon: Home, label: "Inicio", route: "/dashboard", desc: "Dashboard con KPIs y resumen" },
  { icon: Calendar, label: "Calendario", route: "/calendar", desc: "Vista calendario con eventos" },
  { icon: PartyPopper, label: "Eventos", route: "/events", desc: "Lista de todos los eventos" },
  { icon: Users, label: "Clientes", route: "/clients", desc: "Gestión de clientes" },
  { icon: MoreHorizontal, label: "Más", route: "/more", desc: "Productos, Inventario, Config" },
];

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Inicio", route: "/dashboard", section: "main" },
  { icon: Calendar, label: "Calendario", route: "/calendar", section: "main" },
  { icon: PartyPopper, label: "Eventos", route: "/events", section: "main" },
  { icon: Users, label: "Clientes", route: "/clients", section: "main" },
  { icon: Package, label: "Productos", route: "/products", section: "main" },
  { icon: Boxes, label: "Inventario", route: "/inventory", section: "main" },
];

const SIDEBAR_BOTTOM = [
  { icon: Settings, label: "Configuración", route: "/settings" },
];

const MORE_ITEMS = [
  { icon: Package, label: "Productos", desc: "Catálogo y recetas", route: "/products" },
  { icon: Boxes, label: "Inventario", desc: "Stock e insumos", route: "/inventory" },
  { icon: Settings, label: "Configuración", desc: "Perfil, negocio, cuenta", route: "/settings" },
];

const QUICK_ACTIONS = [
  { icon: Plus, label: "Nuevo Evento", desc: "Crear evento completo con cliente y fecha", color: C.gold },
  { icon: Zap, label: "Cotización Rápida", desc: "Presupuesto sin registrar cliente", color: C.warning },
];

const CHANGES = [
  {
    type: "removed",
    title: "Cotización (del sidebar)",
    reason: "Era una acción disfrazada de sección. Ahora es un botón dentro de Eventos.",
    platforms: "iPad, Android Tab, Web"
  },
  {
    type: "removed",
    title: "Cotización Rápida (del sidebar)",
    reason: "Mismo caso. Ahora es una acción rápida accesible desde FAB/botón contextual.",
    platforms: "iPad, Android Tab, Web"
  },
  {
    type: "removed",
    title: "Buscar (del sidebar/Más)",
    reason: "Migra al topbar como barra de búsqueda persistente + Cmd+K. No necesita sección propia.",
    platforms: "Todas"
  },
  {
    type: "added",
    title: "Eventos (tab principal en phones)",
    reason: "Es la entidad central de la app. Ya no está escondido en 'Más'.",
    platforms: "iPhone, Android Phone, Web Mobile"
  },
  {
    type: "added",
    title: "Eventos (lista en Web)",
    reason: "Web no tenía /events como página. Se crea EventList con filtros y búsqueda.",
    platforms: "Web Desktop, Web Mobile"
  },
  {
    type: "added",
    title: "FAB contextual con acciones rápidas",
    reason: "Nuevo Evento y Cotización Rápida se acceden desde un FAB flotante en las pantallas principales.",
    platforms: "Todas"
  },
];

const CURRENT_VS_NEW = {
  sidebar: [
    { item: "Dashboard/Inicio", before: "✓", after: "✓", change: "none" },
    { item: "Calendario", before: "✓", after: "✓", change: "none" },
    { item: "Eventos", before: "Solo iPad", after: "✓ Todas", change: "added" },
    { item: "Cotización", before: "✓", after: "✗ Removido", change: "removed" },
    { item: "Cotización Rápida", before: "✓", after: "✗ Removido", change: "removed" },
    { item: "Clientes", before: "✓", after: "✓", change: "none" },
    { item: "Productos", before: "✓", after: "✓", change: "none" },
    { item: "Inventario", before: "✓", after: "✓", change: "none" },
    { item: "Buscar", before: "✓ Sidebar", after: "↑ Topbar", change: "moved" },
    { item: "Configuración", before: "✓", after: "✓", change: "none" },
  ],
  bottomTabs: [
    { item: "Inicio", before: "✓", after: "✓", change: "none" },
    { item: "Calendario", before: "✓", after: "✓", change: "none" },
    { item: "Eventos", before: "✗ (en Más)", after: "✓ Tab propio", change: "added" },
    { item: "Clientes", before: "✓", after: "✓", change: "none" },
    { item: "Más", before: "✓ (6 items)", after: "✓ (3 items)", change: "simplified" },
  ],
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function Badge({ children, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: color + "18", color: color,
    }}>
      {children}
    </span>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{children}</h3>
      {sub && <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
      padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Phone Mockup ───────────────────────────────────────────────────────────
function PhoneMockup({ showMore }) {
  const [activeTab, setActiveTab] = useState(showMore ? 4 : 2);
  const [showFAB, setShowFAB] = useState(false);

  return (
    <div style={{
      width: 280, minHeight: 520, background: C.bg, borderRadius: 28,
      border: `3px solid ${C.text}`, overflow: "hidden", display: "flex",
      flexDirection: "column", position: "relative",
    }}>
      {/* Status bar */}
      <div style={{
        height: 32, background: C.white, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 12, fontWeight: 600, color: C.text,
      }}>
        9:41
      </div>

      {/* Topbar */}
      <div style={{
        height: 48, background: C.white, display: "flex", alignItems: "center",
        padding: "0 16px", gap: 12, borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text, flex: 1 }}>
          {BOTTOM_TABS[activeTab]?.label || "Más"}
        </span>
        <Search size={18} color={C.textMuted} />
        <Bell size={18} color={C.textMuted} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
        {activeTab === 4 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
              Catálogo
            </p>
            {MORE_ITEMS.slice(0, 2).map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: C.gold + "15",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <item.icon size={18} color={C.gold} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{item.desc}</div>
                </div>
                <ChevronRight size={16} color={C.textMuted} />
              </div>
            ))}
            <p style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 }}>
              Configuración
            </p>
            {MORE_ITEMS.slice(2).map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: C.gold + "15",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <item.icon size={18} color={C.gold} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{item.desc}</div>
                </div>
                <ChevronRight size={16} color={C.textMuted} />
              </div>
            ))}
          </div>
        ) : activeTab === 2 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              {["Todos", "Próximos", "Pasados"].map((f, i) => (
                <span key={i} style={{
                  padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: i === 0 ? C.gold : C.white,
                  color: i === 0 ? C.white : C.textMuted,
                  border: `1px solid ${i === 0 ? C.gold : C.border}`,
                }}>{f}</span>
              ))}
            </div>
            {["Boda García-López", "XV Años Martínez", "Baby Shower Ruiz"].map((e, i) => (
              <div key={i} style={{
                padding: "12px 14px", background: C.white, borderRadius: 12,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{e}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {["15 Abr 2026", "22 May 2026", "8 Jun 2026"][i]} · {["$45,000", "$28,000", "$15,000"][i]}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", color: C.textMuted, fontSize: 13,
          }}>
            {BOTTOM_TABS[activeTab]?.label}
          </div>
        )}
      </div>

      {/* FAB */}
      {activeTab !== 4 && (
        <div style={{ position: "absolute", right: 16, bottom: 76 }}>
          {showFAB && (
            <div style={{
              position: "absolute", bottom: 56, right: 0, width: 200,
              background: C.white, borderRadius: 14, border: `1px solid ${C.border}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden",
            }}>
              {QUICK_ACTIONS.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  cursor: "pointer", borderBottom: i === 0 ? `1px solid ${C.border}` : "none",
                }}>
                  <a.icon size={16} color={a.color} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.label}</div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowFAB(!showFAB)}
            style={{
              width: 48, height: 48, borderRadius: 14, background: C.gold,
              border: "none", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(196,162,101,0.4)",
              transform: showFAB ? "rotate(45deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            <Plus size={22} color={C.white} />
          </button>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <div style={{
        height: 56, background: C.white, display: "flex",
        borderTop: `1px solid ${C.border}`,
      }}>
        {BOTTOM_TABS.map((tab, i) => {
          const Icon = tab.icon;
          const active = i === activeTab;
          return (
            <button
              key={i}
              onClick={() => { setActiveTab(i); setShowFAB(false); }}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 2, background: "none", border: "none",
                cursor: "pointer",
              }}
            >
              <Icon size={20} color={active ? C.gold : C.textMuted} strokeWidth={active ? 2.5 : 1.5} />
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? C.gold : C.textMuted,
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Home indicator */}
      <div style={{
        height: 20, display: "flex", alignItems: "center", justifyContent: "center",
        background: C.white,
      }}>
        <div style={{ width: 100, height: 4, borderRadius: 2, background: C.text }} />
      </div>
    </div>
  );
}

// ─── Tablet/Desktop Mockup ──────────────────────────────────────────────────
function DesktopMockup({ collapsed }) {
  const [active, setActive] = useState(2);
  const [showFAB, setShowFAB] = useState(false);
  const sideW = collapsed ? 64 : 220;

  return (
    <div style={{
      width: "100%", maxWidth: 700, height: 420, background: C.bg, borderRadius: 16,
      border: `3px solid ${C.text}`, overflow: "hidden", display: "flex",
    }}>
      {/* Sidebar */}
      <div style={{
        width: sideW, minWidth: sideW, background: C.white,
        borderRight: `1px solid ${C.border}`, display: "flex",
        flexDirection: "column", transition: "width 0.2s",
      }}>
        {/* Logo */}
        <div style={{
          height: 56, display: "flex", alignItems: "center", gap: 10,
          padding: collapsed ? "0 18px" : "0 20px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: C.gold,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: C.white,
          }}>S</div>
          {!collapsed && (
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Solennix</span>
          )}
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {SIDEBAR_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isActive = i === active;
            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: collapsed ? "10px 14px" : "10px 12px",
                  borderRadius: 10, border: "none", cursor: "pointer",
                  background: isActive ? C.gold + "12" : "transparent",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <Icon size={18} color={isActive ? C.gold : C.textMuted} strokeWidth={isActive ? 2.5 : 1.5} />
                {!collapsed && (
                  <span style={{
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? C.gold : C.textMuted,
                  }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom */}
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${C.border}` }}>
          {SIDEBAR_BOTTOM.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: collapsed ? "10px 14px" : "10px 12px",
                  borderRadius: 10, border: "none", cursor: "pointer",
                  background: "transparent", justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <Icon size={18} color={C.textMuted} />
                {!collapsed && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.textMuted }}>{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <div style={{
          height: 56, display: "flex", alignItems: "center", padding: "0 20px",
          gap: 12, background: C.white, borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", background: C.bg, borderRadius: 10,
          }}>
            <Search size={15} color={C.textMuted} />
            <span style={{ fontSize: 13, color: C.textMuted }}>Buscar... ⌘K</span>
          </div>
          <Bell size={18} color={C.textMuted} />
          <div style={{
            width: 28, height: 28, borderRadius: 99, background: C.gold + "20",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: C.gold,
          }}>T</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 20, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>
              {SIDEBAR_ITEMS[active]?.label}
            </h2>
            {active === 2 && (
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 10, border: `1px solid ${C.border}`, background: C.white,
                  fontSize: 13, color: C.textMuted, cursor: "pointer",
                }}>
                  <Zap size={14} /> Cotización Rápida
                </button>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 10, border: "none", background: C.gold,
                  fontSize: 13, fontWeight: 600, color: C.white, cursor: "pointer",
                }}>
                  <Plus size={14} /> Nuevo Evento
                </button>
              </div>
            )}
          </div>
          {active === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                {["Todos", "Próximos", "Pasados", "Borradores"].map((f, i) => (
                  <span key={i} style={{
                    padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                    background: i === 0 ? C.gold : C.white,
                    color: i === 0 ? C.white : C.textMuted,
                    border: `1px solid ${i === 0 ? C.gold : C.border}`,
                  }}>{f}</span>
                ))}
              </div>
              {["Boda García-López", "XV Años Martínez", "Baby Shower Ruiz", "Corporativo TechMX"].map((e, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                  background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: C.gold + "12",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PartyPopper size={18} color={C.gold} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{e}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {["15 Abr 2026 · Ana García", "22 May 2026 · Laura Martínez", "8 Jun 2026 · María Ruiz", "20 Jul 2026 · TechMX SA"][i]}
                    </div>
                  </div>
                  <Badge color={[C.success, C.warning, C.gold, C.textMuted][i]}>
                    {["Confirmado", "Pendiente", "En proceso", "Borrador"][i]}
                  </Badge>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    {["$45,000", "$28,000", "$15,000", "$62,000"][i]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comparison Table ───────────────────────────────────────────────────────
function ComparisonTable({ data, title }) {
  const changeColors = {
    none: { bg: "transparent", text: C.textMuted },
    added: { bg: C.success + "12", text: C.success },
    removed: { bg: C.danger + "12", text: C.danger },
    moved: { bg: C.warning + "12", text: C.warning },
    simplified: { bg: C.gold + "12", text: C.gold },
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            <th style={{ textAlign: "left", padding: "10px 12px", color: C.textMuted, fontWeight: 600 }}>Item</th>
            <th style={{ textAlign: "center", padding: "10px 12px", color: C.textMuted, fontWeight: 600 }}>Antes</th>
            <th style={{ textAlign: "center", padding: "10px 12px", color: C.textMuted, fontWeight: 600 }}>Después</th>
            <th style={{ textAlign: "center", padding: "10px 12px", color: C.textMuted, fontWeight: 600 }}>Cambio</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const cc = changeColors[row.change];
            return (
              <tr key={i} style={{
                borderBottom: `1px solid ${C.border}`,
                background: cc.bg,
              }}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: C.text }}>{row.item}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: C.textMuted }}>{row.before}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: cc.text }}>{row.after}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <Badge color={cc.text}>
                    {row.change === "none" ? "Sin cambio" :
                     row.change === "added" ? "Nuevo" :
                     row.change === "removed" ? "Removido" :
                     row.change === "moved" ? "Movido" : "Simplificado"}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Platform Parity Matrix ─────────────────────────────────────────────────
function ParityMatrix() {
  const features = [
    { name: "Inicio/Dashboard", ph: true, tab: true, web: true },
    { name: "Calendario", ph: true, tab: true, web: true },
    { name: "Eventos (lista)", ph: true, tab: true, web: true },
    { name: "Clientes", ph: true, tab: true, web: true },
    { name: "Productos", ph: true, tab: true, web: true },
    { name: "Inventario", ph: true, tab: true, web: true },
    { name: "Búsqueda (topbar)", ph: true, tab: true, web: true },
    { name: "Cmd+K / Spotlight", ph: true, tab: true, web: true },
    { name: "FAB acciones rápidas", ph: true, tab: true, web: true },
    { name: "Configuración", ph: true, tab: true, web: true },
  ];

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${C.border}` }}>
          <th style={{ textAlign: "left", padding: "8px 12px", color: C.textMuted }}>Feature</th>
          <th style={{ textAlign: "center", padding: "8px 6px", color: C.textMuted, fontSize: 11 }}>iPhone</th>
          <th style={{ textAlign: "center", padding: "8px 6px", color: C.textMuted, fontSize: 11 }}>iPad</th>
          <th style={{ textAlign: "center", padding: "8px 6px", color: C.textMuted, fontSize: 11 }}>And. Ph</th>
          <th style={{ textAlign: "center", padding: "8px 6px", color: C.textMuted, fontSize: 11 }}>And. Tab</th>
          <th style={{ textAlign: "center", padding: "8px 6px", color: C.textMuted, fontSize: 11 }}>Web Dk</th>
          <th style={{ textAlign: "center", padding: "8px 6px", color: C.textMuted, fontSize: 11 }}>Web Mb</th>
        </tr>
      </thead>
      <tbody>
        {features.map((f, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: "8px 12px", fontWeight: 500, color: C.text }}>{f.name}</td>
            {[f.ph, f.tab, f.ph, f.tab, f.web, f.ph].map((v, j) => (
              <td key={j} style={{ textAlign: "center", padding: "8px 6px" }}>
                <Check size={16} color={C.success} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function NavigationProposal() {
  const [view, setView] = useState("overview");

  const tabs = [
    { id: "overview", label: "Resumen" },
    { id: "phone", label: "Phone" },
    { id: "tablet", label: "Tablet/Desktop" },
    { id: "changes", label: "Cambios" },
    { id: "parity", label: "Paridad" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: "24px 32px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: C.gold,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: C.white,
          }}>S</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>
              Solennix — Arquitectura de Navegación
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
              Propuesta unificada para 6 plataformas
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: view === t.id ? 700 : 500,
                background: view === t.id ? C.gold : "transparent",
                color: view === t.id ? C.white : C.textMuted,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px", maxWidth: 960, margin: "0 auto" }}>

        {/* ─── OVERVIEW ─── */}
        {view === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <SectionTitle sub="Principio fundamental de la propuesta">
                Secciones vs. Acciones
              </SectionTitle>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{
                  flex: "1 1 280px", padding: 16, borderRadius: 12,
                  background: C.success + "08", border: `1px solid ${C.success}30`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.success, margin: "0 0 8px" }}>
                    ✓ Navegación = Secciones (sustantivos)
                  </p>
                  <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.6 }}>
                    Inicio, Calendario, Eventos, Clientes, Productos, Inventario, Configuración.
                    Son <strong>lugares</strong> a donde el usuario va para explorar y gestionar.
                  </p>
                </div>
                <div style={{
                  flex: "1 1 280px", padding: 16, borderRadius: 12,
                  background: C.danger + "08", border: `1px solid ${C.danger}30`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.danger, margin: "0 0 8px" }}>
                    ✗ Navegación ≠ Acciones (verbos)
                  </p>
                  <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.6 }}>
                    "Cotización" y "Cotización Rápida" son <strong>acciones</strong> (crear algo nuevo).
                    Pertenecen a botones, FABs y menús contextuales — no al sidebar.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle sub="Cómo se mapea la navegación en cada tipo de pantalla">
                Patrón por Form Factor
              </SectionTitle>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  {
                    title: "Phones",
                    platforms: "iPhone · Android Phone · Web Mobile",
                    pattern: "Bottom Tab Bar (5 tabs) + Menú 'Más'",
                    items: "Inicio | Calendario | Eventos | Clientes | Más",
                    extra: "Más = Productos, Inventario, Config"
                  },
                  {
                    title: "Tablets",
                    platforms: "iPad · Android Tablet",
                    pattern: "Sidebar lateral (NavigationRail / SplitView)",
                    items: "6 secciones principales + Config abajo",
                    extra: "Sidebar colapsable a solo iconos"
                  },
                  {
                    title: "Desktop",
                    platforms: "Web Desktop (≥1024px)",
                    pattern: "Sidebar fijo + topbar con búsqueda",
                    items: "6 secciones principales + Config abajo",
                    extra: "Cmd+K para búsqueda rápida"
                  },
                ].map((p, i) => (
                  <div key={i} style={{
                    flex: "1 1 260px", padding: 16, borderRadius: 12,
                    border: `1px solid ${C.border}`, background: C.surface,
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.gold, margin: "0 0 2px" }}>{p.title}</p>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 10px" }}>{p.platforms}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>{p.pattern}</p>
                    <p style={{ fontSize: 12, color: C.text, margin: "0 0 2px" }}>{p.items}</p>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{p.extra}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle sub="Cómo el usuario crea eventos y cotizaciones">
                Acciones Rápidas (FAB)
              </SectionTitle>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {QUICK_ACTIONS.map((a, i) => (
                  <div key={i} style={{
                    flex: "1 1 240px", display: "flex", gap: 12, padding: 16,
                    borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, background: a.color + "15",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <a.icon size={22} color={a.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>{a.label}</p>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{
                fontSize: 12, color: C.textMuted, margin: "14px 0 0", lineHeight: 1.6,
                padding: "10px 14px", background: C.gold + "08", borderRadius: 10,
              }}>
                <strong>Disponibilidad:</strong> FAB flotante en todas las pantallas principales (phones).
                Botones contextuales en el header de la sección Eventos (tablet/desktop).
                También accesible desde Dashboard (acciones rápidas) y Calendario (crear desde fecha).
              </p>
            </Card>

            <Card>
              <SectionTitle sub="Presente en todas las plataformas, siempre accesible">
                Búsqueda Global
              </SectionTitle>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { platform: "Web Desktop", method: "Barra en topbar + ⌘K" },
                  { platform: "iPad / Android Tab", method: "Barra en topbar + ⌘K" },
                  { platform: "Phones", method: "Icono 🔍 en topbar → expande barra" },
                  { platform: "iOS nativo", method: "Core Spotlight + pull-to-search" },
                ].map((s, i) => (
                  <div key={i} style={{
                    flex: "1 1 200px", padding: "10px 14px", borderRadius: 10,
                    border: `1px solid ${C.border}`, background: C.surface,
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: "0 0 2px" }}>{s.platform}</p>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{s.method}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ─── PHONE ─── */}
        {view === "phone" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionTitle sub="Bottom Tab Bar + Menú Más + FAB con acciones rápidas">
              Navegación Phone (iPhone · Android Phone · Web Mobile)
            </SectionTitle>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                  Tab "Eventos" (NUEVO)
                </p>
                <PhoneMockup showMore={false} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                  Tab "Más" (simplificado)
                </p>
                <PhoneMockup showMore={true} />
              </div>
            </div>

            <Card>
              <SectionTitle>Bottom Tab Bar — 5 Tabs</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {BOTTOM_TABS.map((tab, i) => {
                  const Icon = tab.icon;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: C.gold + "12",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={18} color={C.gold} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{tab.label}</span>
                        <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{tab.route}</span>
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{tab.desc}</span>
                      {i === 2 && <Badge color={C.success}>Nuevo</Badge>}
                      {i === 4 && <Badge color={C.gold}>Simplificado</Badge>}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <SectionTitle sub="Solo 3 items — limpio y enfocado">Menú "Más"</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MORE_ITEMS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface,
                    }}>
                      <Icon size={18} color={C.gold} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: C.textMuted, flex: 1, textAlign: "right" }}>{item.desc}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ─── TABLET/DESKTOP ─── */}
        {view === "tablet" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionTitle sub="Sidebar con 6 secciones + Config abajo + Búsqueda en topbar">
              Navegación Tablet/Desktop (iPad · Android Tab · Web Desktop)
            </SectionTitle>

            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                Sidebar expandido — Vista "Eventos" con acciones contextuales
              </p>
              <DesktopMockup collapsed={false} />
            </div>

            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                Sidebar colapsado (solo iconos)
              </p>
              <DesktopMockup collapsed={true} />
            </div>

            <Card>
              <SectionTitle>Sidebar Items</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                  Secciones principales
                </p>
                {SIDEBAR_ITEMS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "8px 14px",
                      borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface,
                    }}>
                      <Icon size={16} color={C.gold} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{item.route}</span>
                    </div>
                  );
                })}
                <p style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 }}>
                  Parte inferior
                </p>
                {SIDEBAR_BOTTOM.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "8px 14px",
                      borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface,
                    }}>
                      <Icon size={16} color={C.gold} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{item.route}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card style={{ background: C.gold + "08", border: `1px solid ${C.gold}30` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.gold, margin: "0 0 8px" }}>
                Nota sobre "Nuevo Evento" y "Cotización Rápida"
              </p>
              <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.6 }}>
                Estas acciones aparecen como <strong>botones contextuales</strong> en el header de la sección Eventos
                (como se ve en el mockup arriba). También están disponibles desde el Dashboard como "acciones rápidas"
                y desde el Calendario al seleccionar una fecha. No necesitan ser items del sidebar.
              </p>
            </Card>
          </div>
        )}

        {/* ─── CHANGES ─── */}
        {view === "changes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionTitle sub="Todos los cambios respecto a la navegación actual">
              Registro de Cambios
            </SectionTitle>

            <Card>
              <SectionTitle>Sidebar (iPad · Android Tab · Web Desktop)</SectionTitle>
              <ComparisonTable data={CURRENT_VS_NEW.sidebar} />
            </Card>

            <Card>
              <SectionTitle>Bottom Tabs (iPhone · Android Phone · Web Mobile)</SectionTitle>
              <ComparisonTable data={CURRENT_VS_NEW.bottomTabs} />
            </Card>

            <Card>
              <SectionTitle>Detalle de cada cambio</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {CHANGES.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12, padding: "12px 14px", borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    background: c.type === "removed" ? C.danger + "06" : C.success + "06",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: c.type === "removed" ? C.danger + "15" : C.success + "15",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {c.type === "removed" ? <X size={14} color={C.danger} /> : <Check size={14} color={C.success} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.title}</span>
                        <Badge color={c.type === "removed" ? C.danger : C.success}>
                          {c.type === "removed" ? "Removido" : "Agregado"}
                        </Badge>
                      </div>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px" }}>{c.reason}</p>
                      <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>Plataformas: {c.platforms}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ─── PARITY ─── */}
        {view === "parity" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionTitle sub="Cada feature disponible en cada plataforma — sin excepciones">
              Matriz de Paridad — 6 Plataformas
            </SectionTitle>

            <Card>
              <ParityMatrix />
            </Card>

            <Card>
              <SectionTitle sub="Cómo cada plataforma implementa el mismo patrón de forma nativa">
                Implementación Nativa por Plataforma
              </SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  {
                    platform: "iOS (iPhone)", icon: "📱",
                    nav: "UITabBarController → SwiftUI TabView",
                    fab: "Botón flotante con .sheet() para acciones",
                    search: "UISearchController en NavigationBar + Core Spotlight",
                  },
                  {
                    platform: "iOS (iPad)", icon: "📱",
                    nav: "NavigationSplitView (sidebar + detail)",
                    fab: "Botones en toolbar del NavigationStack",
                    search: "Barra searchable() en NavigationStack + Spotlight",
                  },
                  {
                    platform: "Android (Phone)", icon: "🤖",
                    nav: "Material3 NavigationBar (BottomNavigation)",
                    fab: "Material3 ExtendedFloatingActionButton",
                    search: "SearchBar en TopAppBar + SearchView",
                  },
                  {
                    platform: "Android (Tablet)", icon: "🤖",
                    nav: "Material3 NavigationRail (sidebar vertical)",
                    fab: "Botones en TopAppBar + FAB",
                    search: "SearchBar en TopAppBar",
                  },
                  {
                    platform: "Web Desktop", icon: "🌐",
                    nav: "Sidebar fijo con Tailwind (w-64 / w-16)",
                    fab: "Botones en page header + Cmd+K palette",
                    search: "Input en topbar + CommandPalette (Cmd+K)",
                  },
                  {
                    platform: "Web Mobile", icon: "🌐",
                    nav: "Bottom bar fijo con Tailwind + menú hamburguesa",
                    fab: "FAB flotante (position: fixed)",
                    search: "Icono lupa → expande SearchBar",
                  },
                ].map((p, i) => (
                  <div key={i} style={{
                    padding: "12px 14px", borderRadius: 12,
                    border: `1px solid ${C.border}`, background: C.surface,
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>
                      {p.icon} {p.platform}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[
                        { label: "Navegación", value: p.nav },
                        { label: "Crear", value: p.fab },
                        { label: "Búsqueda", value: p.search },
                      ].map((d, j) => (
                        <div key={j} style={{
                          flex: "1 1 180px", padding: "6px 10px", borderRadius: 8,
                          background: C.white, border: `1px solid ${C.border}`,
                        }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: C.gold, margin: "0 0 2px", textTransform: "uppercase" }}>
                            {d.label}
                          </p>
                          <p style={{ fontSize: 11, color: C.text, margin: 0 }}>{d.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}