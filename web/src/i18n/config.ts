import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// --- Locale bundles ---------------------------------------------------
import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";

import esAuth from "./locales/es/auth.json";
import enAuth from "./locales/en/auth.json";

import esCalendar from "./locales/es/calendar.json";
import enCalendar from "./locales/en/calendar.json";

import esDashboard from "./locales/es/dashboard.json";
import enDashboard from "./locales/en/dashboard.json";

import esClients from "./locales/es/clients.json";
import enClients from "./locales/en/clients.json";

import esProducts from "./locales/es/products.json";
import enProducts from "./locales/en/products.json";

import esInventory from "./locales/es/inventory.json";
import enInventory from "./locales/en/inventory.json";

import esEvents from "./locales/es/events.json";
import enEvents from "./locales/en/events.json";

import esQuotes from "./locales/es/quotes.json";
import enQuotes from "./locales/en/quotes.json";

import esStaff from "./locales/es/staff.json";
import enStaff from "./locales/en/staff.json";

import esAdmin from "./locales/es/admin.json";
import enAdmin from "./locales/en/admin.json";

import esSettings from "./locales/es/settings.json";
import enSettings from "./locales/en/settings.json";

import esSearch from "./locales/es/search.json";
import enSearch from "./locales/en/search.json";

import esPricing from "./locales/es/pricing.json";
import enPricing from "./locales/en/pricing.json";

import esStatic from "./locales/es/static.json";
import enStatic from "./locales/en/static.json";

import esPublic from "./locales/es/public.json";
import enPublic from "./locales/en/public.json";

const isTest = import.meta.env.MODE === "test";

if (!isTest) {
  i18n.use(LanguageDetector);
}

/**
 * i18next setup — namespaces are added incrementally as each screen is
 * internationalised. `common` holds shared strings (buttons, nav, errors).
 */
void i18n
  .use(initReactI18next)
  .init({
    initAsync: false,
    lng: isTest ? "es" : undefined,
    resources: {
      es: {
        common: esCommon,
        auth: esAuth,
        calendar: esCalendar,
        dashboard: esDashboard,
        clients: esClients,
        products: esProducts,
        inventory: esInventory,
        events: esEvents,
        quotes: esQuotes,
        staff: esStaff,
        admin: esAdmin,
        settings: esSettings,
        search: esSearch,
        pricing: esPricing,
        static: esStatic,
        public: esPublic,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        calendar: enCalendar,
        dashboard: enDashboard,
        clients: enClients,
        products: enProducts,
        inventory: enInventory,
        events: enEvents,
        quotes: enQuotes,
        staff: enStaff,
        admin: enAdmin,
        settings: enSettings,
        search: enSearch,
        pricing: enPricing,
        static: enStatic,
        public: enPublic,
      },
    },
    fallbackLng: "es",
    load: "languageOnly",
    supportedLngs: ["es", "en"],
    ns: [
      "common",
      "auth",
      "calendar",
      "dashboard",
      "clients",
      "products",
      "inventory",
      "events",
      "quotes",
      "staff",
      "admin",
      "settings",
      "search",
      "pricing",
      "static",
      "public",
    ],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: isTest ? undefined : {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
