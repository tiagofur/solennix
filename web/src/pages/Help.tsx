import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  BookOpen,
  AlertCircle,
  MessageSquare,
  History,
  CheckCircle,
} from "lucide-react";

type FAQCategory = "all" | "general" | "technical" | "billing" | "changelog";

interface FAQItem {
  id: string;
  question: string;
  category: Exclude<FAQCategory, "all">;
  paragraphs: string[];
  bullets?: string[];
  note?: string;
}

interface GuideItem {
  id: string;
  title: string;
  description: string;
  topics: string[];
}

const COPY = {
  es: {
    back: "Atrás",
    title: "Centro de Ayuda",
    subtitle: "Respuestas rápidas, guías y soporte.",
    changelogTitle: "Changelog — Qué hay de nuevo",
    changelogDesc:
      "Revisa las últimas versiones y cambios de Web, iOS, Android y Backend.",
    changelogCta: "Ver Changelog",
    guidesTitle: "Guías rápidas",
    faqTitle: "Preguntas frecuentes",
    categories: {
      all: "Todas",
      general: "General",
      technical: "Técnico",
      billing: "Facturación",
      changelog: "Changelog",
    } as Record<FAQCategory, string>,
    contactTitle: "¿No encontraste lo que buscas?",
    contactSubtitle: "Contacta a nuestro equipo de soporte para ayuda personalizada.",
    contactSupport: "Contactar soporte",
    contactGithub: "Abrir issue en GitHub",
    guides: [
      {
        id: "getting-started",
        title: "Empezar",
        description: "Crea tu primer evento y aprende los conceptos básicos.",
        topics: [
          "Crear una cuenta",
          "Crear tu primer evento",
          "Invitar clientes",
          "Agregar productos",
        ],
      },
      {
        id: "events",
        title: "Gestión de eventos",
        description: "Organiza eventos desde la propuesta hasta la liquidación.",
        topics: [
          "Crear y editar eventos",
          "Presupuesto y cotizaciones",
          "Contratos y confirmaciones",
          "Pagos y liquidación",
        ],
      },
      {
        id: "inventory",
        title: "Inventario",
        description: "Gestiona productos, equipamiento e insumos.",
        topics: [
          "Agregar productos",
          "Categorizar equipamiento e insumos",
          "Controlar stock",
          "Alertas de disponibilidad",
        ],
      },
      {
        id: "clients",
        title: "Clientes",
        description: "Administra contactos y el historial de cada cliente.",
        topics: [
          "Crear perfiles de cliente",
          "Historial de eventos",
          "Comunicación",
          "Notas privadas",
        ],
      },
    ] as GuideItem[],
    faqs: [
      {
        id: "what-is-solennix",
        question: "¿Qué es Solennix?",
        category: "general",
        paragraphs: [
          "Solennix es una plataforma integral para organizar eventos. Gestiona clientes, eventos, productos, inventario, cotizaciones, contratos y pagos en una sola suite.",
        ],
        note: "Disponible en Web, iOS y Android con sincronización en tiempo real.",
      },
      {
        id: "platforms",
        question: "¿En qué plataformas está disponible Solennix?",
        category: "general",
        paragraphs: ["Solennix está disponible en:"],
        bullets: [
          "Web — acceso desde navegador en desktop/laptop",
          "iOS — iPhone y iPad vía App Store",
          "Android — teléfono/tablet vía Google Play Store",
        ],
        note: "Todos los datos se sincronizan automáticamente entre plataformas.",
      },
      {
        id: "sync",
        question: "¿Se sincronizan los datos entre plataformas?",
        category: "technical",
        paragraphs: [
          "Sí. Cualquier cambio que hagas en una plataforma (Web, iOS o Android) se refleja automáticamente en las otras en tiempo real (o dentro de pocos segundos).",
        ],
        note:
          "Esto incluye clientes, eventos, productos, inventario, cotizaciones, pagos y contratos.",
      },
      {
        id: "offline",
        question: "¿Qué pasa si no tengo conexión a internet?",
        category: "technical",
        paragraphs: [
          "En mobile (iOS/Android), puedes ver datos que ya hayas cargado offline, pero no puedes crear ni editar sin conexión.",
          "En Web, necesitas conexión activa. Los datos se sincronizan cuando reconectes.",
        ],
      },
      {
        id: "teams",
        question: "¿Puedo invitar a mi equipo a usar Solennix?",
        category: "general",
        paragraphs: [
          "La gestión de equipos y permisos depende de tu plan. Consulta Configuración → Equipo en Solennix para invitar usuarios.",
        ],
        note: "Contacta a soporte@solennix.com si tienes dudas sobre roles y permisos.",
      },
      {
        id: "data-security",
        question: "¿Mis datos están seguros?",
        category: "technical",
        paragraphs: [
          "Sí. Usamos cifrado en tránsito (HTTPS/TLS) para transmisión y almacenamiento en bases de datos protegidas.",
        ],
        note: "Lee nuestra política de privacidad en solennix.com/privacy-policy/ para detalles completos.",
      },
      {
        id: "backup",
        question: "¿Cuál es la política de backup?",
        category: "technical",
        paragraphs: [
          "Hacemos backup automático diario de todos los datos. Si necesitas una copia de seguridad manual, contacta a soporte@solennix.com.",
        ],
      },
      {
        id: "billing-plans",
        question: "¿Cuál es la diferencia entre los planes?",
        category: "billing",
        paragraphs: ["Solennix ofrece 3 planes:"],
        bullets: [
          "Gratis — funciones básicas, 1 usuario",
          "Pro — funciones avanzadas, hasta 3 usuarios",
          "Business — acceso completo, equipos ilimitados",
        ],
        note: "Visita Configuración → Planes para ver el detalle por tier.",
      },
      {
        id: "downgrade",
        question: "¿Puedo cambiar de plan?",
        category: "billing",
        paragraphs: [
          "Sí. Puedes subir o bajar de plan en cualquier momento desde Configuración → Facturación.",
        ],
        note:
          "Los cambios entran en vigor inmediatamente. Si bajas de plan, algunas funciones pueden quedar desactivadas.",
      },
      {
        id: "payment-methods",
        question: "¿Qué métodos de pago aceptan?",
        category: "billing",
        paragraphs: [
          "Aceptamos tarjetas de crédito (Visa, Mastercard, American Express) y transferencia bancaria para planes anuales.",
        ],
        note: "Configura tu método en Configuración → Facturación.",
      },
      {
        id: "changelog-what",
        question: "¿Qué contiene el changelog?",
        category: "changelog",
        paragraphs: [
          "El changelog documenta todas las versiones de Solennix (Web, iOS, Android, Backend) con un resumen de cambios por plataforma:",
        ],
        bullets: [
          "Nuevas funcionalidades",
          "Bug fixes",
          "Mejoras de rendimiento",
          "Cambios de UI/UX",
        ],
      },
      {
        id: "changelog-when",
        question: "¿Con qué frecuencia se actualiza el changelog?",
        category: "changelog",
        paragraphs: [
          "Publicamos un release cada 1-2 semanas con mejoras y fixes. El changelog se actualiza automáticamente cuando hay nuevas versiones.",
        ],
      },
      {
        id: "feature-request",
        question: "¿Cómo pido una nueva funcionalidad?",
        category: "general",
        paragraphs: [
          "Nos encanta recibir feedback. Contacta a soporte@solennix.com con tu idea o abre un issue en nuestro repositorio de GitHub.",
        ],
        note: "Revisa el changelog para validar si ya está en progreso o planeado.",
      },
      {
        id: "bug-report",
        question: "¿Cómo reporto un bug?",
        category: "technical",
        paragraphs: ["Si encuentras un bug, comparte:"],
        bullets: [
          "Qué hiciste",
          "Qué esperabas que pasara",
          "Qué pasó en realidad",
          "En qué plataforma ocurrió (Web, iOS, Android)",
          "Screenshots o video, si es posible",
        ],
        note: "Envíalo a soporte@solennix.com o GitHub Issues.",
      },
    ] as FAQItem[],
  },
  en: {
    back: "Back",
    title: "Help Center",
    subtitle: "Quick answers, guides, and support.",
    changelogTitle: "Changelog — What's New",
    changelogDesc:
      "Review the latest versions and changes across Web, iOS, Android, and Backend.",
    changelogCta: "View Changelog",
    guidesTitle: "Quick Guides",
    faqTitle: "Frequently Asked Questions",
    categories: {
      all: "All",
      general: "General",
      technical: "Technical",
      billing: "Billing",
      changelog: "Changelog",
    } as Record<FAQCategory, string>,
    contactTitle: "Couldn't find what you need?",
    contactSubtitle: "Contact our support team for personalized help.",
    contactSupport: "Contact support",
    contactGithub: "Open issue on GitHub",
    guides: [
      {
        id: "getting-started",
        title: "Getting Started",
        description: "Create your first event and learn the basics.",
        topics: [
          "Create an account",
          "Create your first event",
          "Invite clients",
          "Add products",
        ],
      },
      {
        id: "events",
        title: "Event Management",
        description: "Manage events from proposal to final settlement.",
        topics: [
          "Create and edit events",
          "Budgets and quotes",
          "Contracts and confirmations",
          "Payments and settlement",
        ],
      },
      {
        id: "inventory",
        title: "Inventory",
        description: "Manage products, equipment, and supplies.",
        topics: [
          "Add products",
          "Classify equipment and supplies",
          "Track stock",
          "Availability alerts",
        ],
      },
      {
        id: "clients",
        title: "Clients",
        description: "Manage contacts and each client's history.",
        topics: [
          "Create client profiles",
          "Event history",
          "Communication",
          "Private notes",
        ],
      },
    ] as GuideItem[],
    faqs: [
      {
        id: "what-is-solennix",
        question: "What is Solennix?",
        category: "general",
        paragraphs: [
          "Solennix is an all-in-one event operations platform. Manage clients, events, products, inventory, quotes, contracts, and payments in one suite.",
        ],
        note: "Available on Web, iOS, and Android with real-time sync.",
      },
      {
        id: "platforms",
        question: "Which platforms is Solennix available on?",
        category: "general",
        paragraphs: ["Solennix is available on:"],
        bullets: [
          "Web — browser access on desktop/laptop",
          "iOS — iPhone and iPad via App Store",
          "Android — phone/tablet via Google Play Store",
        ],
        note: "All data syncs automatically across platforms.",
      },
      {
        id: "sync",
        question: "Does data sync across platforms?",
        category: "technical",
        paragraphs: [
          "Yes. Any change made on one platform (Web, iOS, Android) is automatically reflected on the others in real time (or within a few seconds).",
        ],
        note:
          "This includes clients, events, products, inventory, quotes, payments, and contracts.",
      },
      {
        id: "offline",
        question: "What if I don't have an internet connection?",
        category: "technical",
        paragraphs: [
          "On mobile (iOS/Android), you can view data that was already loaded offline, but you can't create or edit without connection.",
          "On Web, you need an active connection. Data syncs when you reconnect.",
        ],
      },
      {
        id: "teams",
        question: "Can I invite my team to Solennix?",
        category: "general",
        paragraphs: [
          "Team management and permissions depend on your plan. Go to Settings → Team in Solennix to invite users.",
        ],
        note: "Contact soporte@solennix.com if you have role/permission questions.",
      },
      {
        id: "data-security",
        question: "Is my data secure?",
        category: "technical",
        paragraphs: [
          "Yes. We use in-transit encryption (HTTPS/TLS) and protected database storage.",
        ],
        note: "Read our privacy policy at solennix.com/privacy-policy/ for full details.",
      },
      {
        id: "backup",
        question: "What is your backup policy?",
        category: "technical",
        paragraphs: [
          "We run automatic daily backups for all data. If you need a manual backup copy, contact soporte@solennix.com.",
        ],
      },
      {
        id: "billing-plans",
        question: "What's the difference between plans?",
        category: "billing",
        paragraphs: ["Solennix offers 3 plans:"],
        bullets: [
          "Free — basic features, 1 user",
          "Pro — advanced features, up to 3 users",
          "Business — full access, unlimited teams",
        ],
        note: "Visit Settings → Plans for complete tier details.",
      },
      {
        id: "downgrade",
        question: "Can I change plans?",
        category: "billing",
        paragraphs: [
          "Yes. You can upgrade or downgrade at any time from Settings → Billing.",
        ],
        note:
          "Changes are applied immediately. If you downgrade, some features may be disabled.",
      },
      {
        id: "payment-methods",
        question: "What payment methods do you accept?",
        category: "billing",
        paragraphs: [
          "We accept credit cards (Visa, Mastercard, American Express) and bank transfer for annual plans.",
        ],
        note: "Configure your payment method in Settings → Billing.",
      },
      {
        id: "changelog-what",
        question: "What does the changelog include?",
        category: "changelog",
        paragraphs: [
          "The changelog documents every Solennix release (Web, iOS, Android, Backend) with per-platform changes:",
        ],
        bullets: [
          "New features",
          "Bug fixes",
          "Performance improvements",
          "UI/UX updates",
        ],
      },
      {
        id: "changelog-when",
        question: "How often is the changelog updated?",
        category: "changelog",
        paragraphs: [
          "We ship every 1-2 weeks with improvements and fixes. The changelog is updated whenever a new version is published.",
        ],
      },
      {
        id: "feature-request",
        question: "How can I request a new feature?",
        category: "general",
        paragraphs: [
          "We love feedback. Send your idea to soporte@solennix.com or open an issue in our GitHub repository.",
        ],
        note: "Check the changelog to confirm whether it's already planned or in progress.",
      },
      {
        id: "bug-report",
        question: "How do I report a bug?",
        category: "technical",
        paragraphs: ["If you find a bug, share:"],
        bullets: [
          "What you did",
          "What you expected",
          "What actually happened",
          "Where it happened (Web, iOS, Android)",
          "Screenshots or video, if possible",
        ],
        note: "Send it to soporte@solennix.com or GitHub Issues.",
      },
    ] as FAQItem[],
  },
};

const GUIDE_ICONS: Record<string, React.ReactNode> = {
  "getting-started": <CheckCircle className="w-6 h-6" />,
  events: <BookOpen className="w-6 h-6" />,
  inventory: <AlertCircle className="w-6 h-6" />,
  clients: <MessageSquare className="w-6 h-6" />,
};

export function Help() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "es";
  const copy = COPY[lang];

  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory>("general");

  const filteredFAQ = copy.faqs.filter(
    (item) => selectedCategory === "all" || item.category === selectedCategory
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            ← {copy.back}
          </button>
          <div className="flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {copy.title}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{copy.subtitle}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          to="/changelog"
          className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 sm:p-6 cursor-pointer hover:shadow-lg transition"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <History className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {copy.changelogTitle}
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {copy.changelogDesc}
              </p>
              <span className="mt-3 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline">
                {copy.changelogCta} →
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {copy.guidesTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {copy.guides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0 text-gray-400 dark:text-gray-500">
                  {GUIDE_ICONS[guide.id]}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {guide.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {guide.description}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {guide.topics.map((topic) => (
                  <li key={topic} className="text-sm text-gray-500 dark:text-gray-400">
                    • {topic}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {copy.faqTitle}
        </h2>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "general", "technical", "billing", "changelog"] as FAQCategory[]).map(
            (category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {copy.categories[category]}
              </button>
            )
          )}
        </div>

        <div className="space-y-3">
          {filteredFAQ.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition"
            >
              <button
                onClick={() => toggleFAQ(item.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <h3 className="text-left font-semibold text-gray-900 dark:text-white">
                  {item.question}
                </h3>
                {expandedFAQ === item.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" />
                )}
              </button>

              {expandedFAQ === item.id && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 text-sm space-y-2">
                  {item.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {item.bullets && (
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      {item.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {item.note && <p className="text-sm text-gray-600 dark:text-gray-400">{item.note}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {copy.contactTitle}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{copy.contactSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:soporte@solennix.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <MessageSquare className="w-5 h-5" />
              {copy.contactSupport}
            </a>
            <a
              href="https://github.com/tiagofur/solennix/issues"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <BookOpen className="w-5 h-5" />
              {copy.contactGithub}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
