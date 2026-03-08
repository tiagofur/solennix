import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Client, Event, EventProduct, User } from '@/types/entities';

type EventWithClient = Event & {
  client?: Client | null;
};

type UserProfile = User | null;

type ProductWithName = EventProduct & {
  products?: { name: string } | null;
  product_name?: string | null;
};

export const CONTRACT_TEMPLATE_TOKENS = [
  'provider_name',
  'provider_business_name',
  'provider_email',
  'current_date',
  'event_date',
  'event_start_time',
  'event_end_time',
  'event_time_range',
  'event_service_type',
  'event_num_people',
  'event_location',
  'event_city',
  'event_total_amount',
  'event_deposit_percent',
  'event_refund_percent',
  'event_cancellation_days',
  'client_name',
  'client_phone',
  'client_email',
  'client_address',
  'client_city',
  'contract_city',
  'event_services_list',
  'event_paid_amount',
] as const;

type ContractToken = (typeof CONTRACT_TEMPLATE_TOKENS)[number];

export const CONTRACT_TEMPLATE_PLACEHOLDERS: Array<{ token: ContractToken; label: string }> = [
  { token: 'provider_name', label: 'Nombre del proveedor' },
  { token: 'provider_business_name', label: 'Nombre comercial del proveedor' },
  { token: 'provider_email', label: 'Email del proveedor' },
  { token: 'current_date', label: 'Fecha actual' },
  { token: 'event_date', label: 'Fecha del evento' },
  { token: 'event_start_time', label: 'Hora de inicio' },
  { token: 'event_end_time', label: 'Hora de fin' },
  { token: 'event_time_range', label: 'Horario del evento' },
  { token: 'event_service_type', label: 'Tipo de servicio' },
  { token: 'event_num_people', label: 'Número de personas' },
  { token: 'event_location', label: 'Lugar del evento' },
  { token: 'event_city', label: 'Ciudad del evento' },
  { token: 'event_total_amount', label: 'Monto total del evento' },
  { token: 'event_deposit_percent', label: 'Porcentaje de anticipo' },
  { token: 'event_refund_percent', label: 'Porcentaje de reembolso' },
  { token: 'event_cancellation_days', label: 'Días de cancelación' },
  { token: 'client_name', label: 'Nombre del cliente' },
  { token: 'client_phone', label: 'Teléfono del cliente' },
  { token: 'client_email', label: 'Email del cliente' },
  { token: 'client_address', label: 'Dirección del cliente' },
  { token: 'client_city', label: 'Ciudad del cliente' },
  { token: 'contract_city', label: 'Ciudad del contrato' },
  { token: 'event_services_list', label: 'Servicios del evento' },
  { token: 'event_paid_amount', label: 'Total pagado' },
];

const TOKEN_LABEL_BY_TOKEN: Record<ContractToken, string> = Object.fromEntries(
  CONTRACT_TEMPLATE_PLACEHOLDERS.map(({ token, label }) => [token, label]),
) as Record<ContractToken, string>;

const normalizePlaceholder = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');

const PLACEHOLDER_TO_TOKEN: Record<string, ContractToken> = (() => {
  const map: Record<string, ContractToken> = {};
  CONTRACT_TEMPLATE_TOKENS.forEach((token) => {
    map[normalizePlaceholder(token)] = token;
  });
  CONTRACT_TEMPLATE_PLACEHOLDERS.forEach(({ token, label }) => {
    map[normalizePlaceholder(label)] = token;
  });
  return map;
})();

const resolvePlaceholderToken = (rawToken: string): ContractToken | undefined =>
  PLACEHOLDER_TO_TOKEN[normalizePlaceholder(rawToken)];

export const getMaskedPlaceholder = (token: ContractToken) => `[${TOKEN_LABEL_BY_TOKEN[token]}]`;

export const DEFAULT_CONTRACT_TEMPLATE = `1. El Proveedor es una empresa dedicada a [Tipo de servicio], [Nombre comercial del proveedor], y cuenta con la capacidad para la prestación de dicho servicio.
2. El Cliente: [Nombre del cliente] desea contratar los servicios del Proveedor para el evento que se llevará a cabo el [Fecha del evento], en [Lugar del evento].
3. Servicio contratados: [Servicios del evento]

Por lo tanto, las partes acuerdan las siguientes cláusulas:

CLÁUSULAS:
Primera. Objeto del Contrato
El Proveedor se compromete a prestar los servicios de [Tipo de servicio] para [Número de personas] personas.

Segunda. Horarios de Servicio
El servicio será prestado en el evento en un horario de [Horario del evento].

Tercera. Costo Total/Anticipo
El costo total del servicio contratado será de [Monto total del evento] con un anticipo de [Total pagado].

Cuarta. Condiciones de Pago
El Cliente deberá cubrir un anticipo del [Porcentaje de anticipo]% para reservar la fecha. El resto deberá liquidarse antes del inicio del evento.

Quinta. Condiciones del Servicio
El Cliente se compromete a facilitar un espacio adecuado para la instalación del equipo necesario, que deberá contar con una superficie plana y conexión de luz.

Sexta. Cancelaciones y Reembolsos
En caso de cancelación por parte del Cliente con menos de [Días de cancelación] días de anticipación, no se realizará reembolso del apartado.
Cuando la cancelación se realice dentro del plazo permitido, se reembolsará el [Porcentaje de reembolso]% del apartado.

Octava. Jurisdicción
Para cualquier disputa derivada de este contrato, las partes se someten a la jurisdicción de los tribunales competentes de [Ciudad del contrato].

Novena. Modificaciones
Cualquier modificación a este contrato deberá ser acordada por ambas partes por escrito.

Firmas:
Proveedor: [Nombre del proveedor]
Cliente: [Nombre del cliente]`;

export const TOKEN_REGEX = /\[([^[\]]+)\]/g;

export class ContractTemplateError extends Error {
  invalidTokens: string[];
  missingTokens: string[];

  constructor(message: string, invalidTokens: string[] = [], missingTokens: string[] = []) {
    super(message);
    this.name = 'ContractTemplateError';
    this.invalidTokens = invalidTokens;
    this.missingTokens = missingTokens;
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

const asText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const getEventDateText = (eventDate: string): string => {
  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return eventDate;
  const userTimezoneOffset = parsed.getTimezoneOffset() * 60000;
  const localDate = new Date(parsed.getTime() + userTimezoneOffset);
  return format(localDate, "d 'de' MMMM 'de' yyyy", { locale: es });
};

const getCurrentDateText = (): string => {
  return format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
};

export const validateContractTemplate = (template: string) => {
  const foundTokens = Array.from(template.matchAll(TOKEN_REGEX)).map((match) => match[1].trim());
  const invalidTokens = Array.from(
    new Set(foundTokens.filter((token) => !resolvePlaceholderToken(token))),
  );

  return {
    invalidTokens,
  };
};

const buildTokenValues = (
  event: EventWithClient, 
  profile: UserProfile, 
  products?: ProductWithName[],
  payments?: { amount: number }[]
): Record<ContractToken, string | undefined> => {
  const providerName = asText(profile?.name);
  const providerBusinessName = asText(profile?.business_name) || providerName;
  const eventStart = asText(event.start_time);
  const eventEnd = asText(event.end_time);
  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  return {
    provider_name: providerName,
    provider_business_name: providerBusinessName,
    provider_email: asText(profile?.email),
    current_date: getCurrentDateText(),
    event_date: getEventDateText(event.event_date),
    event_start_time: eventStart,
    event_end_time: eventEnd,
    event_time_range: eventStart && eventEnd ? `${eventStart} - ${eventEnd}` : eventStart || eventEnd,
    event_service_type: asText(event.service_type),
    event_num_people: asText(event.num_people),
    event_location: asText(event.location),
    event_city: asText(event.city),
    event_total_amount: formatCurrency(event.total_amount || 0),
    event_deposit_percent: asText(event.deposit_percent ?? profile?.default_deposit_percent),
    event_refund_percent: asText(event.refund_percent ?? profile?.default_refund_percent),
    event_cancellation_days: asText(event.cancellation_days ?? profile?.default_cancellation_days),
    client_name: asText(event.client?.name),
    client_phone: asText(event.client?.phone),
    client_email: asText(event.client?.email),
    client_address: asText(event.client?.address),
    client_city: asText(event.client?.city),
    contract_city: asText(event.city) || asText(event.client?.city),
    event_services_list: products && products.length > 0
      ? products.map(p => `${p.quantity ?? 1} ${p.products?.name || p.product_name || 'Producto'}`).join(', ')
      : undefined,
    event_paid_amount: formatCurrency(totalPaid),
  };
};

export const renderContractTemplate = ({
  event,
  profile,
  template,
  strict = true,
  products,
  payments,
}: {
  event: EventWithClient;
  profile: UserProfile;
  template?: string | null;
  strict?: boolean;
  products?: ProductWithName[];
  payments?: { amount: number }[];
}) => {
  const sourceTemplate = asText(template) || DEFAULT_CONTRACT_TEMPLATE;
  const { invalidTokens } = validateContractTemplate(sourceTemplate);
  if (invalidTokens.length > 0) {
    throw new ContractTemplateError('La plantilla contiene placeholders no soportados.', invalidTokens, []);
  }

  const values = buildTokenValues(event, profile, products, payments);
  const missingTokens = new Set<string>();

  const rendered = sourceTemplate.replace(TOKEN_REGEX, (_, tokenText: string) => {
    const token = resolvePlaceholderToken(tokenText.trim());
    if (!token) {
      return `[${tokenText}]`;
    }
    const value = values[token];
    if (!value) {
      missingTokens.add(token);
      return `[${tokenText.trim()}]`;
    }
    return value;
  });

  if (strict && missingTokens.size > 0) {
    throw new ContractTemplateError('Faltan datos para completar la plantilla del contrato.', [], Array.from(missingTokens));
  }

  return rendered;
};
