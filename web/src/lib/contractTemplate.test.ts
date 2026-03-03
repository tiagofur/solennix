import { describe, it, expect } from 'vitest';
import {
  CONTRACT_TEMPLATE_TOKENS,
  CONTRACT_TEMPLATE_PLACEHOLDERS,
  DEFAULT_CONTRACT_TEMPLATE,
  getMaskedPlaceholder,
  validateContractTemplate,
  renderContractTemplate,
  ContractTemplateError,
} from './contractTemplate';

const mockEvent = {
  event_date: '2026-06-15',
  start_time: '14:00',
  end_time: '22:00',
  service_type: 'Banquete',
  num_people: 100,
  location: 'Salón Real',
  city: 'Guadalajara',
  deposit_percent: 40,
  cancellation_days: 10,
  refund_percent: 80,
  total_amount: 25000,
  requires_invoice: true,
  tax_rate: 16,
  client: {
    name: 'Juan Pérez',
    phone: '555-000-1111',
    email: 'juan@test.com',
    address: 'Calle 123',
    city: 'Guadalajara',
  },
} as any;

const mockProfile = {
  name: 'Ana López',
  business_name: 'Catering Pro',
  email: 'ana@test.com',
} as any;

describe('contractTemplate', () => {
  describe('CONTRACT_TEMPLATE_TOKENS', () => {
    it('has token entries for all placeholders', () => {
      for (const { token } of CONTRACT_TEMPLATE_PLACEHOLDERS) {
        expect(CONTRACT_TEMPLATE_TOKENS).toContain(token);
      }
    });
  });

  describe('DEFAULT_CONTRACT_TEMPLATE', () => {
    it('contains key placeholders', () => {
      expect(DEFAULT_CONTRACT_TEMPLATE).toContain('[Tipo de servicio]');
      expect(DEFAULT_CONTRACT_TEMPLATE).toContain('[Nombre del cliente]');
      expect(DEFAULT_CONTRACT_TEMPLATE).toContain('[Fecha del evento]');
      expect(DEFAULT_CONTRACT_TEMPLATE).toContain('[Monto total del evento]');
    });
  });

  describe('getMaskedPlaceholder', () => {
    it('returns bracketed label for a token', () => {
      const result = getMaskedPlaceholder('client_name');
      expect(result).toBe('[Nombre del cliente]');
    });
  });

  describe('validateContractTemplate', () => {
    it('returns no invalid tokens for valid template', () => {
      const result = validateContractTemplate(DEFAULT_CONTRACT_TEMPLATE);
      expect(result.invalidTokens).toHaveLength(0);
    });

    it('detects invalid tokens', () => {
      const result = validateContractTemplate('Hello [Invalid Token Here]');
      expect(result.invalidTokens).toContain('Invalid Token Here');
    });
  });

  describe('renderContractTemplate', () => {
    it('replaces all placeholders in the default template', () => {
      const rendered = renderContractTemplate({
        event: mockEvent,
        profile: mockProfile,
        strict: false,
      });
      expect(rendered).toContain('Juan Pérez');
      expect(rendered).toContain('Catering Pro');
      expect(rendered).toContain('Banquete');
    });

    it('throws ContractTemplateError in strict mode when data is missing', () => {
      expect(() =>
        renderContractTemplate({
          event: { ...mockEvent, client: null } as any,
          profile: mockProfile,
          strict: true,
        })
      ).toThrow(ContractTemplateError);
    });

    it('does not throw in non-strict mode when data is missing', () => {
      expect(() =>
        renderContractTemplate({
          event: { ...mockEvent, client: null } as any,
          profile: mockProfile,
          strict: false,
        })
      ).not.toThrow();
    });

    it('preserves inline formatting markers through variable resolution', () => {
      const rendered = renderContractTemplate({
        event: mockEvent,
        profile: mockProfile,
        template: '**[Nombre del cliente]** acepta los *términos* del __contrato__',
        strict: false,
      });
      expect(rendered).toContain('**Juan Pérez**');
      expect(rendered).toContain('*términos*');
      expect(rendered).toContain('__contrato__');
    });

    it('uses custom template when provided', () => {
      const rendered = renderContractTemplate({
        event: mockEvent,
        profile: mockProfile,
        template: 'Cliente: [Nombre del cliente]',
        strict: false,
      });
      expect(rendered).toBe('Cliente: Juan Pérez');
    });

    it('falls back to default template when template is null', () => {
      const rendered = renderContractTemplate({
        event: mockEvent,
        profile: mockProfile,
        template: null,
        strict: false,
      });
      expect(rendered).toContain('Juan Pérez');
      expect(rendered.length).toBeGreaterThan(100);
    });
  });
});
