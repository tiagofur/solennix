import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  Package,
  TrendingUp,
  Moon,
  Sun,
  CheckCircle,
  Star,
  ArrowRight,
  BarChart3,
  Shield,
  Zap,
  ChevronDown,
  Menu,
  X,
  MapPin,
  DollarSign,
  Bell,
  ArrowUp,
  Clock,
  Smartphone,
  Fingerprint,
  LayoutGrid,
  RefreshCw,
  Receipt,
  CreditCard,
  Building,
  Send,
  ClipboardList,
  FileText,
  CheckSquare,
  UsersRound,
  Warehouse,
} from "lucide-react";

const APP_STORE_URL =
  "https://apps.apple.com/mx/app/solennix/id6760874129";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.solennix.app";
import { useTheme } from "@/hooks/useTheme";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Cotizaciones profesionales",
    description:
      "Genera cotizaciones PDF en minutos. Tu cliente las recibe por link, puede aceptar y pagar desde su celular.",
  },
  {
    icon: CreditCard,
    color: "text-success",
    bg: "bg-success/10",
    title: "Cobros y Pagos",
    description:
      "Stripe integrado. Cobrá en parcialidades, tus clientes pagan online y el sistema conciliar automatico.",
  },
  {
    icon: Send,
    color: "text-info",
    bg: "bg-info/10",
    title: "Portal del Cliente",
    description:
      "Tus clientes acceden a un portal con su contrato, fotos, timeline y pagan sin salir de la app.",
  },
  {
    icon: ClipboardList,
    color: "text-warning",
    bg: "bg-warning/10",
    title: "Inventario y Recursos",
    description:
      "Registrá equipos y personal. El sistema evita conflictos de disponibilidad automaticamente.",
  },
  {
    icon: UsersRound,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Staff y Equipos",
    description:
      "Asigna personal, envia asignaciones y recibe confirmaciones. Todo centralizado.",
  },
  {
    icon: Calendar,
    color: "text-success",
    bg: "bg-success/10",
    title: "Calendario Integral",
    description:
      "Todas tus eventos, disponibilidad y conflictos en una vista. Arrastrá y reorganizá.",
  },
  {
    icon: BarChart3,
    color: "text-info",
    bg: "bg-info/10",
    title: "Reportes en Tiempo Real",
    description:
      "Ingresos, eventos, ocupacion. Métricas reales para optimizar precios y crecer.",
  },
  {
    icon: Building,
    color: "text-warning",
    bg: "bg-warning/10",
    title: "Forms Públicos",
    description:
      "Crea formularios de solicitud o cotizacion. Tus clientes cotizan ellos mismos.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Crea tu cuenta",
    description: "Registrate gratis. Sin tarjeta requerida.",
    icon: Zap,
  },
  {
    number: "02",
    title: "Cotiza en minutos",
    description: "Crea una cotizacion profesional. Tu cliente la recibe por link.",
    icon: FileText,
  },
  {
    number: "03",
    title: "Cobra online",
    description: "Tu cliente acepta y paga desde su celular. Stripe hace la conciliacion.",
    icon: CreditCard,
  },
  {
    number: "04",
    title: "Ejecuta y cumpli",
    description: "Inventario, staff y portal del cliente. Todo controlado.",
    icon: ClipboardList,
  },
];

// STATS - removed unverified stats per issue #194
// Real proof through product capabilities instead of numbers

const TESTIMONIALS = [
  {
    name: "María González",
    role: "Organizadora de Bodas",
    location: "Ciudad de México",
    avatar: "MG",
    avatarColor: "bg-error",
    rating: 5,
    text: "El portal del cliente fue un cambio total. Mis novios ven su contrato, suben fotos y pagan online. Yo ya no persigo pagos.",
  },
  {
    name: "Carlos Mendoza",
    role: "Productor de Eventos",
    location: "Monterrey",
    avatar: "CM",
    avatarColor: "bg-info",
    rating: 5,
    text: "El control de inventario salvo mi negocio. Ya no tenemos dobles reservas y el staff recibe sus asignaciones en el celular.",
  },
  {
    name: "Ana Rodríguez",
    role: "DJ y Animadora",
    location: "Guadalajara",
    avatar: "AR",
    avatarColor: "bg-primary",
    rating: 5,
    text: "Las cotizaciones automaticas y el link de pago online me ahorraron 10 horas semanales. Mis clientes pagan antes del evento.",
  },
];

const PLANS = [
  {
    name: "Básico",
    price: "Gratis",
    originalPrice: null,
    period: "",
    description: "Perfecto para empezar",
    promo: null,
    features: [
      "Hasta 3 eventos por mes",
      "Hasta 50 clientes registrados",
      "Hasta 20 ítems en catálogo",
      "Gestión básica de clientes",
      "Calendario de eventos",
    ],
    cta: "Comenzar Gratis",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$99",
    originalPrice: "$199",
    period: "MXN/mes",
    description: "Para profesionales en crecimiento",
    promo: "🎉 Precio de lanzamiento",
    features: [
      "Eventos, clientes y catálogo ilimitados",
      "Generación de cotizaciones PDF",
      "Control de pagos en múltiples plazos",
      "Reportes y analíticas avanzadas",
      "Soporte prioritario",
    ],
    cta: "Comenzar Ahora",
    href: "/register",
    highlighted: true,
    ctaClass: "premium-gradient text-white",
  },
];

const FAQS = [
  {
    question: "¿Necesito tarjeta de crédito para registrarme?",
    answer:
      "No. El plan Básico es completamente gratuito y no requiere tarjeta de crédito. Solo necesitas un correo electrónico.",
  },
  {
    question: "¿Puedo importar mis datos existentes?",
    answer:
      "Sí. Puedes importar clientes desde CSV o Excel. También ofrecemos migración asistida para cuentas Pro.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Absolutamente. Usamos encriptación de extremo a extremo, backups automáticos diarios y servidores con certificación SOC 2.",
  },
  {
    question: "¿Puedo cancelar en cualquier momento?",
    answer:
      "Sí, sin penalizaciones ni contratos de permanencia. Puedes cancelar cuando quieras y conservar acceso hasta el final del período pagado.",
  },
];

const MOBILE_FEATURES = [
  { icon: Fingerprint, text: "Face ID y Touch ID para entrar al instante" },
  { icon: LayoutGrid, text: "Widgets en la pantalla de inicio" },
  { icon: Bell, text: "Notificaciones en tiempo real" },
  { icon: RefreshCw, text: "Sincronización automática con web" },
];

function AppStoreBadge() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 bg-text text-bg px-5 py-3 rounded-2xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
      aria-label="Descargar Solennix en App Store"
    >
      {/* Apple logo SVG */}
      <svg
        viewBox="0 0 814 1000"
        className="h-7 w-auto fill-current shrink-0"
        aria-hidden="true"
      >
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-148.2-91.6C93.4 747.1 22 592.4 22 440.8c0-248.2 163.2-379.2 323.4-379.2 85.5 0 156.7 56.3 210.5 56.3 51.5 0 132.2-59.8 232.2-59.8 30.4 0 108.2 2.6 159.8 96.8zM546.1 131.4c23.1-27.6 39.8-65.8 39.8-104 0-5.2-.6-10.4-1.3-15.6-37.5 1.3-82.5 25.1-109.4 55.8-21.7 24.4-42.2 62.7-42.2 101.5 0 5.8.6 11.7 1.3 13.6 2.6.6 6.5 1.3 10.4 1.3 34 0 76.9-22.5 101.4-52.6z" />
      </svg>
      <div className="text-left">
        <div className="text-xs font-medium leading-none mb-0.5 opacity-75">
          Descargá en
        </div>
        <div className="text-base font-black leading-none">App Store</div>
      </div>
    </a>
  );
}

function GooglePlayBadge() {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 bg-text text-bg px-5 py-3 rounded-2xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
      aria-label="Descargar Solennix en Google Play"
    >
      {/* Google Play triangle icon */}
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 fill-current shrink-0"
        aria-hidden="true"
      >
        <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
      </svg>
      <div className="text-left">
        <div className="text-xs font-medium leading-none mb-0.5 opacity-75">
          Disponible en
        </div>
        <div className="text-base font-black leading-none">Google Play</div>
      </div>
    </a>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[280px] mx-auto select-none pointer-events-none">
      {/* Phone frame */}
      <div className="relative bg-card border-[3px] border-border rounded-[44px] overflow-hidden shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 bg-card border-b border-border rounded-b-2xl z-10 flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <div className="w-12 h-2 rounded-full bg-border" />
        </div>

        {/* Screen content */}
        <div className="pt-10 pb-6 px-4 bg-bg min-h-[520px] flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between px-1 pt-2 pb-1">
            <div>
              <p className="text-xs text-text-secondary">Buenos días 👋</p>
              <p className="text-sm font-black text-text">Mi negocio</p>
            </div>
            <div className="w-8 h-8 rounded-full premium-gradient flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* KPI pills */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card border border-border rounded-2xl p-3">
              <p className="text-xs text-text-secondary mb-1">Ingresos</p>
              <p className="text-sm font-black text-text">$135,500</p>
              <p className="text-xs text-success font-bold">+18% este mes</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3">
              <p className="text-xs text-text-secondary mb-1">Eventos</p>
              <p className="text-sm font-black text-text">8 activos</p>
              <p className="text-xs text-primary font-bold">3 esta semana</p>
            </div>
          </div>

          {/* Events list */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-bold text-text-secondary">
                Próximos eventos
              </p>
            </div>
            {MOCK_EVENTS.map((event) => (
              <div
                key={event.name}
                className="px-3 py-2.5 flex items-center gap-2.5 border-b border-border last:border-0"
              >
                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text truncate">
                    {event.name}
                  </p>
                  <p className="text-[10px] text-text-secondary">{event.date}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${event.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
                >
                  {event.status === "confirmed" ? "Confirmado" : "Cotizado"}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom nav bar */}
          <div className="mt-auto bg-card border border-border rounded-2xl px-4 py-2 flex justify-around">
            {[BarChart3, Calendar, Users, Package].map((Icon, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-0.5 py-1 ${i === 0 ? "text-primary" : "text-text-tertiary"}`}
              >
                <Icon className="h-4 w-4" />
                <div
                  className={`h-1 w-1 rounded-full ${i === 0 ? "bg-primary" : "bg-transparent"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-primary/20 blur-2xl rounded-full" />
    </div>
  );
}

// Mini dashboard mockup data
const MOCK_EVENTS = [
  {
    name: "Boda Martínez",
    date: "Sáb 15 Mar",
    guests: 180,
    status: "confirmed",
    amount: "$45,000",
  },
  {
    name: "Cumpleaños VIP",
    date: "Dom 16 Mar",
    guests: 60,
    status: "quoted",
    amount: "$12,500",
  },
  {
    name: "Evento Corporativo",
    date: "Vie 21 Mar",
    guests: 250,
    status: "confirmed",
    amount: "$78,000",
  },
];

const MOCK_KPIS = [
  {
    label: "Ingresos del mes",
    value: "$135,500",
    delta: "+18%",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    label: "Eventos activos",
    value: "8",
    delta: "+3",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Clientes totales",
    value: "47",
    delta: "+5",
    color: "text-info",
    bg: "bg-info/10",
  },
];

function AppMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none pointer-events-none">
      {/* Browser chrome */}
      <div className="bg-surface-alt rounded-t-2xl px-4 py-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-yellow-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 bg-surface/60 rounded-md px-3 py-1 text-xs text-text-tertiary font-mono">
          app.solennix.com/dashboard
        </div>
      </div>

      {/* App window */}
      <div className="bg-surface-alt rounded-b-2xl border-x border-b border-border shadow-2xl overflow-hidden">
        {/* Sidebar + content layout */}
        <div className="flex h-[340px]">
          {/* Sidebar */}
          <div className="w-14 bg-card border-r border-border flex flex-col items-center py-4 gap-4">
            <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="mt-2 flex flex-col gap-3">
              {[BarChart3, Calendar, Users, Package].map((Icon, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? "bg-primary/10 text-primary" : "text-text-tertiary"}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-2">
              {MOCK_KPIS.map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-card rounded-xl p-3 border border-border"
                >
                  <div className="text-xs text-text-secondary mb-1">
                    {kpi.label}
                  </div>
                  <div className="text-sm font-black text-text">
                    {kpi.value}
                  </div>
                  <div className={`text-xs font-bold ${kpi.color} mt-0.5`}>
                    {kpi.delta} este mes
                  </div>
                </div>
              ))}
            </div>

            {/* Events list */}
            <div className="bg-card rounded-xl border border-border overflow-hidden flex-1">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary">
                  Próximos eventos
                </span>
                <span className="text-xs text-primary font-semibold">
                  Ver todos →
                </span>
              </div>
              <div className="divide-y divide-border">
                {MOCK_EVENTS.map((event) => (
                  <div
                    key={event.name}
                    className="px-3 py-2 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-text truncate">
                        {event.name}
                      </div>
                      <div className="text-xs text-text-secondary flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {event.date} · {event.guests} personas
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-text">
                        {event.amount}
                      </div>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${event.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
                      >
                        {event.status === "confirmed"
                          ? "Confirmado"
                          : "Cotizado"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating glow */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
    </div>
  );
}

export const Landing: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="min-h-screen bg-bg transition-colors">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-between items-center h-20">
            <Logo size={40} />

            <div className="hidden md:flex items-center space-x-10">
              <a
                href="#features"
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                Características
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                Cómo funciona
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                Precios
              </a>
              <a
                href="#app"
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                App Móvil
              </a>
              <a
                href="#faq"
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                FAQ
              </a>
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors border border-transparent hover:border-border"
                aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors border border-transparent hover:border-border"
                aria-label={
                  theme === "dark"
                    ? "Cambiar a modo claro"
                    : "Cambiar a modo oscuro"
                }
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              <Link
                to="/login"
                className="hidden sm:inline-flex text-sm font-semibold text-text hover:text-primary transition-colors"
              >
                Ingresar
              </Link>
              <Link
                to="/register"
                className="premium-gradient text-white text-sm px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02]"
              >
                Probar Gratis
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-bg px-4 py-4 animate-in slide-in-from-top-4 duration-200">
          <div className="space-y-3">
            <a
              href="#features"
              className="block text-sm text-text-secondary py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Características
            </a>
            <a
              href="#how-it-works"
              className="block text-sm text-text-secondary py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cómo funciona
            </a>
            <a
              href="#pricing"
              className="block text-sm text-text-secondary py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Precios
            </a>
            <a
              href="#app"
              className="block text-sm text-text-secondary py-2 flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              App Móvil
            </a>
            <a
              href="#faq"
              className="block text-sm text-text-secondary py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </a>
            <Link
              to="/login"
              className="block text-sm text-text-secondary py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Background mesh */}
        <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-info/10 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Text centered on top */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-full mb-10 tracking-wide uppercase">
              <Zap className="h-4 w-4" />
              <span>Control operativo completo</span>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-text mb-8 leading-[1.05] tracking-tight">
              Cotizá, Cobrá,
              <br />
              <span className="text-transparent bg-clip-text premium-gradient animate-gradient">
                Coordiná y Cumplí
              </span>
            </h1>

            <p className="text-lg sm:text-2xl text-text-secondary mb-12 max-w-3xl mx-auto leading-relaxed">
              Una plataforma para gestionar todo el ciclo de tus eventos: cotizaciones profesionales, cobros online, 
              inventario, staff y Portal del cliente. Todo desde un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center mb-12">
              <Link
                to="/register"
                className="premium-gradient text-white px-10 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-[1.05] flex items-center justify-center gap-3"
              >
                Empezar Gratis Ahora
                <ArrowRight className="h-6 w-6" />
              </Link>
              <Link
                to="/login"
                className="bg-card glass-card text-text px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:bg-surface border border-border flex items-center justify-center"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 text-sm font-semibold text-text-secondary opacity-80">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Instala en 2 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Cancela cuando quieras</span>
              </div>
            </div>

            {/* App Store badges */}
            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-xs text-text-tertiary font-medium uppercase tracking-widest">
                <span className="h-px w-10 bg-border" />
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>También disponible en</span>
                <span className="h-px w-10 bg-border" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <AppStoreBadge />
                <GooglePlayBadge />
              </div>
            </div>
          </div>

          {/* App mockup */}
          <AppMockup />
        </div>
      </section>

      {/* ── PRODUCT PROOF ── */}
      <section className="premium-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white mb-8">
            <h3 className="text-2xl font-extrabold mb-2">Todo el ciclo operativo</h3>
            <p className="text-white/80">De la cotizacion al cumplimiento</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="bg-white/10 rounded-2xl p-4">
              <FileText className="h-8 w-8 mx-auto mb-2 text-white" />
              <div className="text-white font-bold text-sm">Cotizaciones PDF</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-white" />
              <div className="text-white font-bold text-sm">Cobros Online</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <Send className="h-8 w-8 mx-auto mb-2 text-white" />
              <div className="text-white font-bold text-sm">Portal Cliente</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <UsersRound className="h-8 w-8 mx-auto mb-2 text-white" />
              <div className="text-white font-bold text-sm">Gestion Staff</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-surface-alt text-text-secondary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>✨ Características</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text mb-4">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto">
              Deja de usar hojas de cálculo, WhatsApp y notas dispersas.
              Centraliza toda tu operación en una plataforma diseñada para
              organizadores de eventos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-border hover:border-brand-orange/30 hover:shadow-xl transition-all duration-300 bg-card"
              >
                <div
                  className={`${feature.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon
                    className={`h-6 w-6 ${feature.color}`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-lg font-bold text-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="py-32 bg-surface-grouped relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-full mb-6 uppercase tracking-wider">
              <span>🚀 Cómo funciona</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-text mb-6 tracking-tight">
              Empieza en minutos, no en días
            </h2>
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Diseñamos la plataforma para que sea intuitiva y potente desde el
              primer segundo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {STEPS.map((step, index) => (
              <div key={step.number} className="relative group">
                {index < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-[44px] left-[calc(50%+40px)] w-[calc(100%-80px)] h-1 bg-border/40 rounded-full" />
                )}
                <div className="relative text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] premium-gradient text-white font-black text-2xl mb-8 shadow-xl shadow-primary/25 transform group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-text mb-4 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOBILE APP ── */}
      <section id="app" className="py-24 bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-full mb-8 uppercase tracking-wider">
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>App Móvil</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-text mb-6 tracking-tight leading-[1.1]">
                Tu negocio en el bolsillo
              </h2>

              <p className="text-lg text-text-secondary mb-10 leading-relaxed">
                Gestiona eventos, revisá pagos y confirmá inventario desde tu
                iPhone. La misma potencia de la plataforma web, ahora disponible
                donde estés.
              </p>

              <ul className="space-y-4 mb-10">
                {MOBILE_FEATURES.map((f) => (
                  <li key={f.text} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon
                        className="h-5 w-5 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-text font-semibold text-sm">
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-4">
                <AppStoreBadge />
                <GooglePlayBadge />
              </div>
            </div>

            {/* Right: phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-surface-alt text-text-secondary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>💬 Testimonios</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text mb-4">
              Lo que dicen nuestros usuarios
            </h2>
            <p className="text-base sm:text-lg text-text-secondary">
              Más de 500 organizadores ya confían en Solennix para gestionar su
              negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-surface-alt rounded-2xl p-6 border border-border"
              >
                <div
                  className="flex items-center gap-1 mb-4"
                  role="img"
                  aria-label={`${t.rating} estrellas de 5`}
                >
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 text-yellow-400 fill-yellow-400"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`${t.avatarColor} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-text text-sm">
                      {t.name}
                    </div>
                    <div className="text-text-secondary text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {t.role} · {t.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section
        id="pricing"
        className="py-32 bg-surface-grouped relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-full mb-6 uppercase tracking-wider">
              <span>💰 Precios</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-text mb-6 tracking-tight">
              Planes para cada etapa
            </h2>
            <p className="text-base sm:text-xl text-text-secondary max-w-2xl mx-auto">
              Comienza gratis y activa el plan Pro cuando lo necesites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-10 flex flex-col transition-all duration-300 border-2 ${
                  plan.highlighted
                    ? "border-primary bg-card shadow-2xl shadow-primary/10 scale-[1.02] z-10"
                    : "border-border bg-card shadow-sm hover:shadow-md"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-2">
                    <span className="bg-primary text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/30">
                      Más popular
                    </span>
                    {plan.promo && (
                      <span className="bg-success text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-success/30">
                        {plan.promo}
                      </span>
                    )}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-black text-text mb-2 tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-2 mb-10">
                  {plan.originalPrice && (
                    <span className="text-xl line-through text-text-tertiary font-medium">
                      {plan.originalPrice}
                    </span>
                  )}
                  <span className="text-5xl font-black text-text tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-text-secondary font-medium uppercase text-xs tracking-widest">
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-4 mb-10 grow">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div
                        className={`p-1 rounded-full ${plan.highlighted ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}
                      >
                        <CheckCircle className="h-4 w-4 shrink-0" />
                      </div>
                      <span className="text-text font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.href}
                  className={`block text-center py-5 px-8 rounded-2xl font-black text-lg transition-all ${
                    plan.highlighted
                      ? "premium-gradient text-white shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02]"
                      : "bg-surface-alt text-text hover:bg-border transition-colors border border-border"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 bg-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-surface-alt text-text-secondary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>❓ Preguntas frecuentes</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text mb-4">
              Resolvemos tus dudas
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="border border-border rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-5 text-left bg-card hover:bg-surface-alt transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  aria-expanded={openFaq === index}
                  aria-label={`${faq.question} - ${openFaq === index ? "Cerrar" : "Abrir"} respuesta`}
                >
                  <span className="font-semibold text-text text-sm">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-text-secondary shrink-0 ml-4 transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 pt-1 bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 bg-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden premium-gradient rounded-3xl sm:rounded-[3rem] px-6 py-12 sm:p-20 text-center premium-shadow mx-2 sm:mx-0">
            {/* Background decorative elements */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20" />

            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-4xl sm:text-7xl font-black text-white mb-8 tracking-tight leading-[1.1]">
                ¿Listo para escalar <br />
                tu negocio?
              </h2>
              <p className="text-lg sm:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                Únete a la nueva generación de organizadores que ya
                profesionalizaron su operación.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                <Link
                  to="/register"
                  className="bg-white text-primary px-8 sm:px-12 py-5 sm:py-6 rounded-2xl font-black text-xl sm:text-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-[1.05] flex items-center justify-center gap-3 w-full sm:w-auto"
                >
                  Comenzar Gratis
                  <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
                </Link>
                <Link
                  to="/login"
                  className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-2xl font-black text-xl sm:text-2xl hover:bg-white/20 transition-all flex items-center justify-center w-full sm:w-auto"
                >
                  Ya tengo cuenta
                </Link>
              </div>

              <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-x-4 sm:gap-x-8 gap-y-4 text-white/80 text-xs sm:text-sm font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>Sin tarjeta de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>Cancela cuando quieras</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>Soporte en español</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-surface-grouped text-text-secondary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-8 mb-10">
            <div className="md:col-span-3 xl:col-span-2">
              <Logo size={40} className="mb-4" />
              <p className="text-sm leading-relaxed max-w-xs">
                La plataforma todo-en-uno para organizadores de eventos
                profesionales en México y Latinoamérica.
              </p>
            </div>
            <div>
              <h4 className="text-text font-semibold text-sm mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="hover:text-text transition-colors"
                  >
                    Características
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-text transition-colors"
                  >
                    Precios
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-text transition-colors"
                  >
                    Cómo funciona
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-text transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-semibold text-sm mb-4 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                Descargar
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-text transition-colors flex items-center gap-1.5"
                  >
                    iOS — App Store
                  </a>
                </li>
                <li>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-text transition-colors"
                  >
                    Android — Google Play
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-semibold text-sm mb-4">Cuenta</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/register"
                    className="hover:text-text transition-colors"
                  >
                    Registrarse
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="hover:text-text transition-colors"
                  >
                    Iniciar Sesión
                  </Link>
                </li>
                <li>
                  <Link
                    to="/forgot-password"
                    className="hover:text-text transition-colors"
                  >
                    Recuperar contraseña
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-text transition-colors"
                  >
                    Acerca de
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-text transition-colors"
                  >
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-text transition-colors"
                  >
                    Política de Privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © 2026 Solennix. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-success" aria-hidden="true" />
              <span>
                Datos protegidos con encriptación de extremo a extremo
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── SCROLL TO TOP ── */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Volver al inicio"
        className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full premium-gradient text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/40 ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
};
