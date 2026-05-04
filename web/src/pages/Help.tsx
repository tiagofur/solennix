import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface FAQItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
  category: "general" | "technical" | "billing" | "changelog";
}

const faqItems: FAQItem[] = [
  {
    id: "what-is-solennix",
    question: "¿Qué es Solennix?",
    category: "general",
    answer: (
      <div className="space-y-2">
        <p>
          Solennix es una plataforma integral para organizar eventos. Gestiona
          clientes, eventos, productos, inventario, cotizaciones, contratos y
          pagos en una sola suite.
        </p>
        <p className="text-sm text-gray-600">
          Disponible en Web, iOS y Android con sincronización en tiempo real.
        </p>
      </div>
    ),
  },
  {
    id: "platforms",
    question: "¿En qué plataformas está disponible Solennix?",
    category: "general",
    answer: (
      <div className="space-y-2">
        <p>
          Solennix está disponible en:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Web</strong> — acceso desde navegador en desktop/laptop
          </li>
          <li>
            <strong>iOS</strong> — iPhone y iPad via App Store
          </li>
          <li>
            <strong>Android</strong> — teléfono/tablet via Google Play Store
          </li>
        </ul>
        <p className="text-sm text-gray-600">
          Todos los datos se sincronizan automáticamente entre plataformas.
        </p>
      </div>
    ),
  },
  {
    id: "sync",
    question: "¿Se sincronizan los datos entre plataformas?",
    category: "technical",
    answer: (
      <div className="space-y-2">
        <p>
          Sí. Cualquier cambio que hagas en una plataforma (Web, iOS o Android)
          se refleja automáticamente en las otras en tiempo real (o dentro de
          pocos segundos).
        </p>
        <p className="text-sm text-gray-600">
          Esto incluye clientes, eventos, productos, inventario, cotizaciones,
          pagos y contratos.
        </p>
      </div>
    ),
  },
  {
    id: "offline",
    question: "¿Qué pasa si no tengo conexión a internet?",
    category: "technical",
    answer: (
      <div className="space-y-2">
        <p>
          En mobile (iOS/Android), puedes ver datos que ya hayas cargado
          offline, pero no puedes crear ni editar sin conexión.
        </p>
        <p>
          En Web, necesitas conexión activa. Los datos se sincronizan cuando
          reconectes.
        </p>
      </div>
    ),
  },
  {
    id: "teams",
    question: "¿Puedo invitar a mi equipo a usar Solennix?",
    category: "general",
    answer: (
      <div className="space-y-2">
        <p>
          La gestión de equipos y permisos depende de tu plan. Consulta la
          sección de <strong>Configuración</strong> → <strong>Equipo</strong> en
          Solennix para invitar usuarios.
        </p>
        <p className="text-sm text-gray-600">
          Contacta a soporte@solennix.com si tienes dudas sobre roles y
          permisos.
        </p>
      </div>
    ),
  },
  {
    id: "data-security",
    question: "¿Mis datos están seguros?",
    category: "technical",
    answer: (
      <div className="space-y-2">
        <p>
          Sí. Usamos cifrado end-to-end (HTTPS/TLS) para transmisión y almacenamiento
          en bases de datos protegidas.
        </p>
        <p className="text-sm text-gray-600">
          Lee nuestra política de privacidad en solennix.com/privacy-policy/ para
          detalles completos.
        </p>
      </div>
    ),
  },
  {
    id: "backup",
    question: "¿Cuál es la política de backup?",
    category: "technical",
    answer: (
      <div className="space-y-2">
        <p>
          Hacemos backup automático diario de todos los datos. Si necesitas una
          copia de seguridad manual, contacta a soporte@solennix.com.
        </p>
      </div>
    ),
  },
  {
    id: "billing-plans",
    question: "¿Cuál es la diferencia entre los planes?",
    category: "billing",
    answer: (
      <div className="space-y-2">
        <p>
          Solennix ofrece 3 planes:
        </p>
        <ul className="space-y-1 ml-2">
          <li>
            <strong>Gratis</strong> — features básicas, 1 usuario
          </li>
          <li>
            <strong>Pro</strong> — funciones avanzadas, hasta 3 usuarios
          </li>
          <li>
            <strong>Business</strong> — acceso completo, equipos ilimitados
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Visita Configuración → Planes para detalles de features por tier.
        </p>
      </div>
    ),
  },
  {
    id: "downgrade",
    question: "¿Puedo cambiar de plan?",
    category: "billing",
    answer: (
      <div className="space-y-2">
        <p>
          Sí. Puedes upgradear o downgradejar en cualquier momento desde
          Configuración → Facturación.
        </p>
        <p className="text-sm text-gray-600">
          Los cambios entran en vigor inmediatamente. Si downgradeas, algunos
          features pueden quedar desactivados.
        </p>
      </div>
    ),
  },
  {
    id: "payment-methods",
    question: "¿Qué métodos de pago aceptan?",
    category: "billing",
    answer: (
      <div className="space-y-2">
        <p>
          Aceptamos tarjetas de crédito (Visa, Mastercard, American Express) y
          transferencia bancaria para planes anuales.
        </p>
        <p className="text-sm text-gray-600">
          Configura tu método en Configuración → Facturación.
        </p>
      </div>
    ),
  },
  {
    id: "changelog-what",
    question: "¿Qué contiene el changelog?",
    category: "changelog",
    answer: (
      <div className="space-y-2">
        <p>
          El changelog documenta todas las versiones de Solennix (Web, iOS,
          Android, Backend) con un resumen de cambios por plataforma:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Features nuevas</li>
          <li>Bug fixes</li>
          <li>Mejoras de rendimiento</li>
          <li>Cambios de UI/UX</li>
        </ul>
      </div>
    ),
  },
  {
    id: "changelog-when",
    question: "¿Con qué frecuencia se actualiza el changelog?",
    category: "changelog",
    answer: (
      <div className="space-y-2">
        <p>
          Publicamos un release cada 1-2 semanas con mejoras y fixes. El
          changelog se actualiza automáticamente cuando hay nuevas versiones.
        </p>
      </div>
    ),
  },
  {
    id: "feature-request",
    question: "¿Cómo pido un feature nuevo?",
    category: "general",
    answer: (
      <div className="space-y-2">
        <p>
          Nos encanta recibir feedback. Contacta a soporte@solennix.com con tu
          idea o abre un issue en nuestro repositorio GitHub.
        </p>
        <p className="text-sm text-gray-600">
          Revisa el changelog para ver si el feature ya está en progreso o
          planeado.
        </p>
      </div>
    ),
  },
  {
    id: "bug-report",
    question: "¿Cómo reporto un bug?",
    category: "technical",
    answer: (
      <div className="space-y-2">
        <p>
          Si encuentras un bug, describe:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Qué hiciste</li>
          <li>Qué esperabas que pasara</li>
          <li>Qué pasó en realidad</li>
          <li>En qué plataforma (Web, iOS, Android)</li>
          <li>Screenshots o video si es posible</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Envía a soporte@solennix.com o GitHub Issues.
        </p>
      </div>
    ),
  },
];

interface GuideItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  topics: string[];
}

const guides: GuideItem[] = [
  {
    id: "getting-started",
    title: "Empezar",
    description: "Crea tu primer evento y aprende los conceptos básicos.",
    icon: <CheckCircle className="w-6 h-6" />,
    topics: [
      "Crear una cuenta",
      "Crear tu primer evento",
      "Invitar clientes",
      "Agregar productos",
    ],
  },
  {
    id: "events",
    title: "Gestión de Eventos",
    description: "Organiza eventos desde la propuesta hasta la liquidación.",
    icon: <BookOpen className="w-6 h-6" />,
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
    icon: <AlertCircle className="w-6 h-6" />,
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
    description: "Administra contactos y historial de clientes.",
    icon: <MessageSquare className="w-6 h-6" />,
    topics: [
      "Crear perfiles de cliente",
      "Historial de eventos",
      "Comunicación",
      "Notas privadas",
    ],
  },
];

export function Help() {
  const navigate = useNavigate();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("general");

  const filteredFAQ = faqItems.filter(
    (item) =>
      selectedCategory === "all" || item.category === selectedCategory
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            ← Atrás
          </button>
          <div className="flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Centro de Ayuda
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Respuestas rápidas, guías y soporte.
          </p>
        </div>
      </div>

      {/* Changelog Quick Link */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div
          className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 sm:p-6 cursor-pointer hover:shadow-lg transition"
          onClick={() => navigate("/changelog")}
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <History className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Changelog — Qué Hay de Nuevo
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                Revisa las últimas versiones y cambios de Web, iOS, Android y
                Backend.
              </p>
              <button className="mt-3 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline">
                Ver Changelog →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links / Guides */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Guías Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0 text-gray-400 dark:text-gray-500">
                  {guide.icon}
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
                {guide.topics.map((topic, idx) => (
                  <li key={idx} className="text-sm text-gray-500 dark:text-gray-400">
                    • {topic}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Preguntas Frecuentes
        </h2>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedCategory("general")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              selectedCategory === "general"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setSelectedCategory("technical")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              selectedCategory === "technical"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Técnico
          </button>
          <button
            onClick={() => setSelectedCategory("billing")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              selectedCategory === "billing"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Facturación
          </button>
          <button
            onClick={() => setSelectedCategory("changelog")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              selectedCategory === "changelog"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Changelog
          </button>
        </div>

        {/* FAQ Items */}
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
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            ¿No encontraste lo que buscas?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Contacta a nuestro equipo de soporte para ayuda personalizada.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:soporte@solennix.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <MessageSquare className="w-5 h-5" />
              Contactar Soporte
            </a>
            <a
              href="https://github.com/tiagofur/solennix/issues"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <BookOpen className="w-5 h-5" />
              Abrir Issue en GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
