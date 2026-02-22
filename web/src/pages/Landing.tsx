import React, { useState } from 'react';
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
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const features = [
  {
    icon: Calendar,
    color: 'text-brand-orange',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    title: 'Calendario Inteligente',
    description:
      'Visualiza todos tus eventos en un calendario interactivo. Arrastra, suelta y reorganiza con facilidad. Vista diaria, semanal y mensual.',
  },
  {
    icon: Users,
    color: 'text-brand-green',
    bg: 'bg-green-50 dark:bg-green-900/20',
    title: 'Gestión de Clientes',
    description:
      'CRM integrado para mantener el historial completo de cada cliente: contratos, pagos, comunicaciones y eventos anteriores.',
  },
  {
    icon: Package,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    title: 'Control de Inventario',
    description:
      'Administra equipos, decoraciones y recursos. Evita dobles reservas y asegura disponibilidad para cada evento.',
  },
  {
    icon: BarChart3,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'Reportes y Análisis',
    description:
      'Dashboards en tiempo real con métricas de ingresos, eventos por mes, clientes recurrentes y tendencias de crecimiento.',
  },
  {
    icon: DollarSign,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    title: 'Cotizaciones y Pagos',
    description:
      'Genera cotizaciones profesionales en segundos. Registra anticipos, pagos parciales y saldos pendientes automáticamente.',
  },
  {
    icon: Bell,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    title: 'Recordatorios Automáticos',
    description:
      'Notificaciones automáticas para ti y tus clientes: confirmaciones de evento, recordatorios de pago y seguimiento post-evento.',
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
    name: 'Starter',
    price: 'Gratis',
    period: '',
    description: 'Perfecto para empezar',
    features: [
      'Hasta 10 eventos/mes',
      '50 clientes',
      'Calendario básico',
      'Soporte por email',
    ],
    cta: 'Comenzar Gratis',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$299',
    period: '/mes',
    description: 'Para profesionales en crecimiento',
    features: [
      'Eventos ilimitados',
      'Clientes ilimitados',
      'Control de inventario',
      'Reportes avanzados',
      'Cotizaciones PDF',
      'Soporte prioritario',
    ],
    cta: 'Comenzar Prueba Gratis',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '$699',
    period: '/mes',
    description: 'Para agencias y equipos',
    features: [
      'Todo lo de Pro',
      'Múltiples usuarios',
      'API access',
      'Reportes personalizados',
      'Integraciones avanzadas',
      'Gerente de cuenta dedicado',
    ],
    cta: 'Contactar Ventas',
    href: '/register',
    highlighted: false,
  },
];

const faqs = [
  {
    question: '¿Necesito tarjeta de crédito para registrarme?',
    answer: 'No. El plan Starter es completamente gratuito y no requiere tarjeta de crédito. Solo necesitas un correo electrónico.',
  },
  {
    question: '¿Puedo importar mis datos existentes?',
    answer: 'Sí. Puedes importar clientes desde CSV o Excel. También ofrecemos migración asistida para cuentas Pro y Business.',
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

export const Landing: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="bg-brand-orange p-1.5 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Eventos</span>
              <span className="hidden sm:inline-block text-xs font-medium bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full">Pro</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-orange transition-colors">Características</a>
              <a href="#how-it-works" className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-orange transition-colors">Cómo funciona</a>
              <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-orange transition-colors">Precios</a>
              <a href="#faq" className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-orange dark:hover:text-brand-orange transition-colors">FAQ</a>
            </div>

            {/* Right actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-brand-orange dark:hover:text-brand-orange transition-colors">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="bg-brand-orange hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg font-medium shadow-xs hover:shadow-md transition-all">
                Comenzar Gratis
              </Link>
              <button
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-700 dark:text-gray-300 py-2" onClick={() => setMobileMenuOpen(false)}>Características</a>
            <a href="#how-it-works" className="block text-sm text-gray-700 dark:text-gray-300 py-2" onClick={() => setMobileMenuOpen(false)}>Cómo funciona</a>
            <a href="#pricing" className="block text-sm text-gray-700 dark:text-gray-300 py-2" onClick={() => setMobileMenuOpen(false)}>Precios</a>
            <a href="#faq" className="block text-sm text-gray-700 dark:text-gray-300 py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <Link to="/login" className="block text-sm text-gray-700 dark:text-gray-300 py-2">Iniciar Sesión</Link>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-linear-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 pt-20 pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-300/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <Zap className="h-3.5 w-3.5" />
            <span>La plataforma #1 para organizadores de eventos en México</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            Gestiona tus eventos
            <br />
            <span className="text-brand-orange">de manera profesional</span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            La plataforma todo-en-uno para organizar eventos, gestionar clientes, controlar inventario y maximizar tus ingresos. Diseñada para organizadores como tú.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Comenzar Gratis
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-8 py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
            >
              Ya tengo cuenta
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-brand-green" />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-brand-green" />
              <span>Configuración en 2 minutos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-brand-green" />
              <span>Cancela cuando quieras</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-brand-orange py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-extrabold mb-1">{stat.value}</div>
                <div className="text-orange-100 text-sm">{stat.label}</div>
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
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>🚀 Cómo funciona</span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Empieza en minutos, no en días
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Sin instalaciones complicadas. Sin capacitación extensa. Comienza a gestionar eventos desde el primer día.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-linear-to-r from-brand-orange/40 to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-orange text-white font-extrabold text-xl mb-5 shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
                  {step.number}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{step.description}</p>
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
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
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
                      <MapPin className="h-3 w-3" />
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
      <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>💰 Precios</span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Planes para cada etapa de tu negocio
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Comienza gratis y escala cuando lo necesites. Sin sorpresas en tu factura.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border-2 transition-all ${
                  plan.highlighted
                    ? 'border-brand-orange bg-brand-orange shadow-2xl shadow-orange-200 dark:shadow-orange-900/30 text-white scale-105'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                    ⭐ Más popular
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 shrink-0 ${plan.highlighted ? 'text-white' : 'text-brand-green'}`} />
                      <span className={plan.highlighted ? 'text-orange-50' : 'text-gray-700 dark:text-gray-300'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className={`block text-center py-3 px-6 rounded-xl font-bold text-sm transition-all ${
                    plan.highlighted
                      ? 'bg-white text-brand-orange hover:bg-orange-50'
                      : 'bg-brand-orange hover:bg-orange-600 text-white'
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
                  className="w-full flex items-center justify-between p-5 text-left bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 shrink-0 ml-4 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 bg-white dark:bg-gray-900">
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 bg-linear-to-br from-brand-orange to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            ¿Listo para profesionalizar tu negocio?
          </h2>
          <p className="text-xl text-orange-100 mb-10 max-w-2xl mx-auto">
            Únete a más de 500 organizadores que ya gestionan sus eventos con Eventos. Comienza gratis hoy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-orange hover:bg-orange-50 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Comenzar Gratis Ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/40 hover:border-white text-white px-8 py-4 rounded-xl font-bold text-lg transition-all"
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-6 text-orange-200 text-sm">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 dark:bg-black text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-brand-orange p-1.5 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Eventos</span>
              </div>
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
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 Eventos. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-brand-green" />
              <span>Datos protegidos con encriptación de extremo a extremo</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
