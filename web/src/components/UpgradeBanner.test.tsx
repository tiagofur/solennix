import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UpgradeBanner } from './UpgradeBanner';

const renderBanner = (props: Parameters<typeof UpgradeBanner>[0]) =>
  render(
    <MemoryRouter>
      <UpgradeBanner {...props} />
    </MemoryRouter>
  );

describe('UpgradeBanner', () => {
  describe('limit-reached type', () => {
    it('renders limit reached heading and description', () => {
      renderBanner({ type: 'limit-reached', resource: 'events', currentUsage: 3, limit: 3 });

      expect(screen.getByText('Límite de Eventos Alcanzado')).toBeInTheDocument();
      expect(screen.getByText(/Has alcanzado el límite de 3 eventos mensuales/i)).toBeInTheDocument();
    });

    it('shows usage metric and progress bar', () => {
      renderBanner({ type: 'limit-reached', resource: 'events', currentUsage: 3, limit: 3 });

      expect(screen.getByText('Eventos este mes')).toBeInTheDocument();
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('renders upgrade link', () => {
      renderBanner({ type: 'limit-reached', resource: 'events' });

      const link = screen.getByRole('link', { name: /mejorar al plan pro/i });
      expect(link).toHaveAttribute('href', '/pricing');
    });

    it('renders clients resource correctly', () => {
      renderBanner({ type: 'limit-reached', resource: 'clients', currentUsage: 50, limit: 50 });

      expect(screen.getByText('Límite de Clientes Alcanzado')).toBeInTheDocument();
      expect(screen.getByText('Clientes registrados')).toBeInTheDocument();
      expect(screen.getByText('50 / 50')).toBeInTheDocument();
    });

    it('renders catalog resource correctly', () => {
      renderBanner({ type: 'limit-reached', resource: 'catalog', currentUsage: 20, limit: 20 });

      expect(screen.getByText('Límite de Catálogo Alcanzado')).toBeInTheDocument();
      expect(screen.getByText('Ítems en catálogo')).toBeInTheDocument();
    });

    it('uses default values for currentUsage and limit', () => {
      renderBanner({ type: 'limit-reached' });

      expect(screen.getByText('0 / 3')).toBeInTheDocument();
    });
  });

  describe('upsell type', () => {
    it('renders upsell heading and description', () => {
      renderBanner({ type: 'upsell' });

      expect(screen.getByText(/Desbloquea el poder de EventosApp/i)).toBeInTheDocument();
      expect(screen.getByText(/Lleva tu control de eventos al siguiente nivel/i)).toBeInTheDocument();
    });

    it('shows current usage info', () => {
      renderBanner({ type: 'upsell', currentUsage: 2, limit: 3 });

      expect(screen.getByText(/En Plan Gratis: 2 de 3 eventos mensuales usados/i)).toBeInTheDocument();
    });

    it('renders View Plans link', () => {
      renderBanner({ type: 'upsell' });

      const link = screen.getByRole('link', { name: /ver planes pro/i });
      expect(link).toHaveAttribute('href', '/pricing');
    });

    it('shows Pro badge', () => {
      renderBanner({ type: 'upsell' });

      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });
});
