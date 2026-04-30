import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import esCommon from '../src/i18n/locales/es/common.json';
import enCommon from '../src/i18n/locales/en/common.json';
import esAuth from '../src/i18n/locales/es/auth.json';
import enAuth from '../src/i18n/locales/en/auth.json';
import esCalendar from '../src/i18n/locales/es/calendar.json';
import enCalendar from '../src/i18n/locales/en/calendar.json';
import esDashboard from '../src/i18n/locales/es/dashboard.json';
import enDashboard from '../src/i18n/locales/en/dashboard.json';
import esClients from '../src/i18n/locales/es/clients.json';
import enClients from '../src/i18n/locales/en/clients.json';
import esProducts from '../src/i18n/locales/es/products.json';
import enProducts from '../src/i18n/locales/en/products.json';
import esInventory from '../src/i18n/locales/es/inventory.json';
import enInventory from '../src/i18n/locales/en/inventory.json';
import esEvents from '../src/i18n/locales/es/events.json';
import enEvents from '../src/i18n/locales/en/events.json';
import esQuotes from '../src/i18n/locales/es/quotes.json';
import enQuotes from '../src/i18n/locales/en/quotes.json';
import esStaff from '../src/i18n/locales/es/staff.json';
import enStaff from '../src/i18n/locales/en/staff.json';
import esAdmin from '../src/i18n/locales/es/admin.json';
import enAdmin from '../src/i18n/locales/en/admin.json';
import esSettings from '../src/i18n/locales/es/settings.json';
import enSettings from '../src/i18n/locales/en/settings.json';
import esSearch from '../src/i18n/locales/es/search.json';
import enSearch from '../src/i18n/locales/en/search.json';
import esPricing from '../src/i18n/locales/es/pricing.json';
import enPricing from '../src/i18n/locales/en/pricing.json';
import esStatic from '../src/i18n/locales/es/static.json';
import enStatic from '../src/i18n/locales/en/static.json';
import esPublic from '../src/i18n/locales/es/public.json';
import enPublic from '../src/i18n/locales/en/public.json';

export const TEST_NAMESPACES = [
  'common',
  'auth',
  'calendar',
  'dashboard',
  'clients',
  'products',
  'inventory',
  'events',
  'quotes',
  'staff',
  'admin',
  'settings',
  'search',
  'pricing',
  'static',
  'public',
] as const;

const testI18n = i18next.createInstance();

export const i18nReady = testI18n.use(initReactI18next).init({
  initAsync: false,
  lng: 'es',
  fallbackLng: 'es',
  load: 'languageOnly',
  supportedLngs: ['es', 'en'],
  ns: [...TEST_NAMESPACES],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
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
});

export default testI18n;
