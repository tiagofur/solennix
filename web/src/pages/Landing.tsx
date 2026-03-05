import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { Logo } from '../components/Logo';

const features = [
  {
    icon: Calendar,
    color: 'text-primary',
    bg: 'bg-primary/10 dark:bg-primary/20',
    title: 'Calendario Inteligente',
    description:
      'Visualiza todos tus eventos en un calendario interactivo. Arrastra, suelta y reorganiza con facilidad.',
  },
  {
    icon: Users,
    color: 'text-success',
    bg: 'bg-success/10 dark:bg-success/20',
    title: 'Gestión de Clientes',
    description:
      'CRM integrado para mantener el historial completo de cada cliente: contratos, pagos y más.',
  },
  {
    icon: Package,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    title: 'Control de Inventario',
    description:
      'Administra equipos y recursos. Evita dobles reservas y asegura disponibilidad.',
  },
  {
    icon: BarChart3,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'Reportes y Análisis',
    description:
      'Dashboards en tiempo real con métricas de ingresos, eventos y tendencias.',
  },
  {
    icon: DollarSign,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    title: 'Cotizaciones y Pagos',
    description:
      'Genera cotizaciones profesionales. Registra anticipos y pagos automáticamente.',
  },
  {
    icon: Bell,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    title: 'Recordatorios',
    description:
      'Notificaciones automáticas: confirmaciones, recordatorios de pago y seguimiento.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Regístrate gratis en menos de 2 minutos. Sin tarjeta de crédito requerida.',
    icon: Zap,
  },
  {
    number: '02',
    title: 'Agrega tus clientes y eventos',
    description: 'Importa tus contactos existentes o agrégalos manualmente. Crea tu primer evento en segundos.',
    icon: Users,
  },
  {
    number: '03',
    title: 'Gestiona tu inventario',
    description: 'Registra todos tus equipos y recursos. El sistema evitará conflictos de disponibilidad automáticamente.',
    icon: Package,
  },
  {
    number: '04',
    title: 'Crece tu negocio',
    description: 'Usa los reportes para identificar oportunidades, optimizar precios y escalar tu operación.',
    icon: TrendingUp,
  },
];

const stats = [
  { value: '500+', label: 'Organizadores activos' },
  { value: '12,000+', label: 'Eventos gestionados' },
  { value: '98%', label: 'Satisfacción de clientes' },
  { value: '40%', label: 'Ahorro de tiempo promedio' },
];

const testimonials = [
  {
    name: 'María González',
    role: 'Organizadora de Bodas',
    location: 'Ciudad de México',
    avatar: 'MG',
    avatarColor: 'bg-pink-500',
    rating: 5,
    text: 'Antes usaba hojas de cálculo y me volvía loca. Ahora con Eventos tengo todo centralizado: clientes, inventario, pagos. ¡Recuperé 10 horas a la semana!',
  },
  {
    name: 'Carlos Mendoza',
    role: 'Productor de Eventos Corporativos',
    location: 'Monterrey',
    avatar: 'CM',
    avatarColor: 'bg-blue-500',
    rating: 5,
    text: 'El control de inventario es increíble. Ya no tenemos dobles reservas de equipo y el equipo de logística trabaja mucho más coordinado.',
  },
  {
    name: 'Ana Rodríguez',
    role: 'DJ y Animadora',
    location: 'Guadalajara',
    avatar: 'AR',
    avatarColor: 'bg-purple-500',
    rating: 5,
    text: 'Las cotizaciones automáticas me ahorran tiempo y se ven muy profesionales. Mis clientes quedan impresionados desde el primer contacto.',
  },
];

const plans = [
  {
    name: 'Básico',
    price: 'Gratis',
    originalPrice: null,
    period: '',
    description: 'Perfecto para empezar',
    promo: null,
    features: [
      'Hasta 3 eventos por mes',
      'Hasta 50 clientes registrados',
      'Hasta 20 ítems en catálogo',
      'Gestión básica de clientes',
      'Calendario de eventos',
    ],
    cta: 'Comenzar Gratis',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$99',
    originalPrice: '$199',
    period: 'MXN/mes',
    description: 'Para profesionales en crecimiento',
    promo: '🎉 Precio de lanzamiento',
    features: [
      'Eventos, clientes y catálogo ilimitados',
      'Generación de cotizaciones PDF',
      'Control de pagos en múltiples plazos',
      'Reportes y analíticas avanzadas',
      'Soporte prioritario',
    ],
    cta: 'Comenzar Ahora',
    href: '/register',
    highlighted: true,
    ctaClass: 'premium-gradient text-white dark:text-white',
  },
];


const faqs = [
  {
    question: '¿Necesito tarjeta de crédito para registrarme?',
    answer: 'No. El plan Básico es completamente gratuito y no requiere tarjeta de crédito. Solo necesitas un correo electrónico.',
  },
  {
    question: '¿Puedo importar mis datos existentes?',
    answer: 'Sí. Puedes importar clientes desde CSV o Excel. También ofrecemos migración asistida para cuentas Pro.',
  },
  {
    question: '¿Mis datos están seguros?',
    answer: 'Absolutamente. Usamos encriptación de extremo a extremo, backups automáticos diarios y servidores con certificación SOC 2.',
  },
  {
    question: '¿Puedo cancelar en cualquier momento?',
    answer: 'Sí, sin penalizaciones ni contratos de permanencia. Puedes cancelar cuando quieras y conservar acceso hasta el final del período pagado.',
  },
];

// Mini dashboard mockup data
const mockEvents = [
  { name: 'Boda Martínez', date: 'Sáb 15 Mar', guests: 180, status: 'confirmed', amount: '$45,000' },
  { name: 'Cumpleaños VIP', date: 'Dom 16 Mar', guests: 60, status: 'quoted', amount: '$12,500' },
  { name: 'Evento Corporativo', date: 'Vie 21 Mar', guests: 250, status: 'confirmed', amount: '$78,000' },
];

const mockKpis = [
  { label: 'Ingresos del mes', value: '$135,500', delta: '+18%', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { label: 'Eventos activos', value: '8', delta: '+3', color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Clientes totales', value: '47', delta: '+5', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
];

function AppMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none pointer-events-none">
      {/* Browser chrome */}
      <div className="bg-gray-200 dark:bg-gray-700 rounded-t-2xl px-4 py-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-yellow-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 bg-white/60 dark:bg-gray-600/60 rounded-md px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
          app.eventosapp.com/dashboard
        </div>
      </div>

      {/* App window */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-b-2xl border-x border-b border-gray-300 dark:border-gray-600 shadow-2xl overflow-hidden">
        {/* Sidebar + content layout */}
        <div className="flex h-[340px]">
          {/* Sidebar */}
          <div className="w-14 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-4">
            <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="mt-2 flex flex-col gap-3">
              {[BarChart3, Calendar, Users, Package].map((Icon, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-primary/10 text-primary' : 'text-gray-400 dark:text-gray-500'}`}
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
              {mockKpis.map((kpi) => (
                <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{kpi.label}</div>
                  <div className="text-sm font-black text-gray-900 dark:text-white">{kpi.value}</div>
                  <div className={`text-[10px] font-bold ${kpi.color} mt-0.5`}>{kpi.delta} este mes</div>
                </div>
              ))}
            </div>

            {/* Events list */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex-1">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Próximos eventos</span>
                <span className="text-[10px] text-primary font-semibold">Ver todos →</span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {mockEvents.map((event) => (
                  <div key={event.name} className="px-3 py-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">{event.name}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {event.date} · {event.guests} personas
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-bold text-gray-800 dark:text-white">{event.amount}</div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${event.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                        {event.status === 'confirmed' ? 'Confirmado' : 'Cotizado'}
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
  const faqRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-between items-center h-20">
            <Logo size={40} />

            <div className="hidden md:flex items-center space-x-10">
              <a href="#features" className="text-[15px] font-medium text-text-secondary hover:text-primary transition-colors">Características</a>
              <a href="#how-it-works" className="text-[15px] font-medium text-text-secondary hover:text-primary transition-colors">Cómo funciona</a>
              <a href="#pricing" className="text-[15px] font-medium text-text-secondary hover:text-primary transition-colors">Precios</a>
              <a href="#faq" className="text-[15px] font-medium text-text-secondary hover:text-primary transition-colors">FAQ</a>
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors border border-transparent hover:border-border"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors border border-transparent hover:border-border"
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <Link to="/login" className="hidden sm:inline-flex text-[15px] font-semibold text-text hover:text-primary transition-colors">
                Ingresar
              </Link>
              <Link to="/register" className="premium-gradient text-white text-[15px] px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02]">
                Probar Gratis
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-64 py-4 opacity-100' : 'max-h-0 py-0 opacity-0'}`}
      >
        <div className="space-y-3">
          <a href="#features" className="block text-sm text-gray-700 dark:text-gray-300 py-2" onClick={() => setMobileMenuOpen(false)}>Características</a>
          <a href="#how-it-works" className="block text-sm text-gray-700 dark:text-gray-300 py-2" onClick={() => setMobileMenuOpen(false)}>Cómo funciona</a>
          <a href="#pricing" className="block text-sm text-gray-700 dark:text-gray-300 py-2" onClick={() => setMobileMenuOpen(false)}>Precios</a>
          <a href="#faq" className="block text-sm text-gray-700 dark:text-gray-300 py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <Link to="/login" className="block text-sm text-gray-700 dark:text-gray-300 py-2">Iniciar Sesión</Link>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Background mesh */}
        <div className="absolute inset-0 z-[-1] opacity-30 dark:opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Text centered on top */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-[13px] font-bold px-5 py-2 rounded-full mb-10 tracking-wide uppercase">
              <Zap className="h-4 w-4" />
              <span>Diseñado para organizadores de eventos</span>
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-text mb-8 leading-[1.05] tracking-tight">
              Gestiona eventos
              <br />
              <span className="text-transparent bg-clip-text premium-gradient animate-gradient">profesionales</span>
            </h1>

            <p className="text-xl sm:text-2xl text-text-secondary mb-12 max-w-3xl mx-auto leading-relaxed">
              Organiza, gestiona y escala tu negocio con la plataforma diseñada específicamente para la industria de eventos.
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

            <div className="flex flex-wrap items-center justify-center gap-10 text-[15px] font-semibold text-text-secondary opacity-80">
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
          </div>

          {/* App mockup */}
          <AppMockup />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="premium-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-extrabold mb-1">{stat.value}</div>
                <div className="text-white/80 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>✨ Características</span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Deja de usar hojas de cálculo, WhatsApp y notas dispersas. Centraliza toda tu operación en una plataforma diseñada para organizadores de eventos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-brand-orange/30 dark:hover:border-brand-orange/30 hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900"
              >
                <div className={`${feature.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-32 bg-surface-grouped relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-[13px] font-bold px-5 py-2 rounded-full mb-6 uppercase tracking-wider">
              <span>🚀 Cómo funciona</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-text mb-6 tracking-tight">
              Empieza en minutos, no en días
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Diseñamos la plataforma para que sea intuitiva y potente desde el primer segundo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative group">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-[44px] left-[calc(50%+40px)] w-[calc(100%-80px)] h-1 bg-border/40 rounded-full" />
                )}
                <div className="relative text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] premium-gradient text-white font-black text-2xl mb-8 shadow-xl shadow-primary/25 transform group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-text mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-text-secondary text-[15px] leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>💬 Testimonios</span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Lo que dicen nuestros usuarios
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Más de 500 organizadores ya confían en Eventos para gestionar su negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1 mb-4" role="img" aria-label={`${t.rating} estrellas de 5`}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`${t.avatarColor} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{t.name}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
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
      <section id="pricing" className="py-32 bg-surface-grouped relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-[13px] font-bold px-5 py-2 rounded-full mb-6 uppercase tracking-wider">
              <span>💰 Precios</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-text mb-6 tracking-tight">
              Planes para cada etapa
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Comienza gratis y activa el plan Pro cuando lo necesites.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-stretch max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-10 flex flex-col transition-all duration-300 border-2 ${
                  plan.highlighted
                    ? 'border-primary bg-card dark:bg-card shadow-2xl shadow-primary/10 dark:shadow-primary/5 scale-[1.02] z-10'
                    : 'border-border bg-card shadow-sm hover:shadow-md'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-2">
                    <span className="bg-primary text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/30">
                      Más popular
                    </span>
                    {plan.promo && (
                      <span className="bg-success text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-success/30">
                        {plan.promo}
                      </span>
                    )}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-black text-text mb-2 tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-text-secondary text-[15px] leading-relaxed">
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

                <ul className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <div className={`p-1 rounded-full ${plan.highlighted ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
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
                      ? 'premium-gradient text-white shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02]'
                      : 'bg-surface-alt text-text hover:bg-border transition-colors border border-border'
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
      <section id="faq" className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>❓ Preguntas frecuentes</span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Resolvemos tus dudas
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-5 text-left bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  aria-expanded={openFaq === index}
                  aria-label={`${faq.question} - ${openFaq === index ? 'Cerrar' : 'Abrir'} respuesta`}
                >
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 shrink-0 ml-4 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  ref={(el) => { faqRefs.current[index] = el; }}
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openFaq === index ? `${faqRefs.current[index]?.scrollHeight ?? 200}px` : '0px',
                  }}
                >
                  <div className="px-5 pb-5 pt-1 bg-white dark:bg-gray-900">
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden premium-gradient rounded-[3rem] p-12 sm:p-20 text-center premium-shadow">
            {/* Background decorative elements */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20" />

            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-4xl sm:text-7xl font-black text-white mb-8 tracking-tight leading-[1.1]">
                ¿Listo para escalar <br />tu negocio?
              </h2>
              <p className="text-xl sm:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                Únete a la nueva generación de organizadores que ya profesionalizaron su operación.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link
                  to="/register"
                  className="bg-white text-primary px-12 py-6 rounded-2xl font-black text-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-[1.05] flex items-center justify-center gap-3 w-full sm:w-auto"
                >
                  Comenzar Gratis
                  <ArrowRight className="h-7 w-7" />
                </Link>
                <Link
                  to="/login"
                  className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-12 py-6 rounded-2xl font-black text-2xl hover:bg-white/20 transition-all flex items-center justify-center w-full sm:w-auto"
                >
                  Ya tengo cuenta
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-white/80 text-sm font-bold uppercase tracking-wider">
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
      <footer className="bg-gray-900 dark:bg-black text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-10">
            <div className="md:col-span-2">
              <Logo size={40} className="mb-4" />
              <p className="text-sm leading-relaxed max-w-xs">
                La plataforma todo-en-uno para organizadores de eventos profesionales en México y Latinoamérica.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Cómo funciona</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Cuenta</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/register" className="hover:text-white transition-colors">Registrarse</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link></li>
                <li><Link to="/forgot-password" className="hover:text-white transition-colors">Recuperar contraseña</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">Acerca de</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 Eventos. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Datos protegidos con encriptación de extremo a extremo</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── SCROLL TO TOP ── */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Volver al inicio"
        className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full premium-gradient text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/40 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
};
