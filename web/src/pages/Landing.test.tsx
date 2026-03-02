import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Landing } from './Landing';

const mockToggleTheme = vi.fn();
let mockTheme = 'light';

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: mockTheme, toggleTheme: mockToggleTheme }),
}));

const renderLanding = () =>
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
  });

  it('renders hero and navigation links', () => {
    renderLanding();
    expect(screen.getByText(/Gestiona eventos/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /iniciar sesión/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /comenzar/i })[0]).toBeInTheDocument();
  });

  it('toggles theme', () => {
    mockTheme = 'light';
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: /cambiar a modo oscuro/i }));
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('renders dark theme icon when active', () => {
    mockTheme = 'dark';
    renderLanding();
    expect(screen.getByRole('button', { name: /cambiar a modo claro/i })).toBeInTheDocument();
  });

  // --- Mobile menu tests (covers lines 241-257) ---

  it('opens mobile menu when hamburger button is clicked', async () => {
    renderLanding();

    // Desktop nav + footer = initial count
    const initialCount = screen.getAllByText('Características').length;

    // Click the hamburger button to open the mobile menu
    const menuButton = screen.getByRole('button', { name: /abrir menú/i });
    fireEvent.click(menuButton);

    // After opening, mobile menu adds 1 more link
    expect(screen.getAllByText('Características').length).toBe(initialCount + 1);
  });

  it('closes mobile menu when close button is clicked', () => {
    renderLanding();

    // Open the mobile menu
    const openButton = screen.getByRole('button', { name: /abrir menú/i });
    fireEvent.click(openButton);

    // Now the close button should be visible
    const closeButton = screen.getByRole('button', { name: /cerrar menú/i });
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);

    // After closing, the mobile menu should not render the extra links
    // The close button should no longer be in the document
    expect(screen.queryByRole('button', { name: /cerrar menú/i })).not.toBeInTheDocument();
  });

  it('closes mobile menu when a mobile nav link is clicked', async () => {
    const user = userEvent.setup();
    renderLanding();

    // Open the mobile menu
    await user.click(screen.getByRole('button', { name: /abrir menú/i }));
    expect(screen.getByRole('button', { name: /cerrar menú/i })).toBeInTheDocument();

    // Mobile link is at index 1 (desktop=0, mobile=1, footer=2)
    const links = screen.getAllByText('Características');
    await user.click(links[1]);

    // Mobile menu should close
    expect(screen.queryByRole('button', { name: /cerrar menú/i })).not.toBeInTheDocument();
  });

  it('closes mobile menu when "Cómo funciona" link is clicked', async () => {
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getByRole('button', { name: /abrir menú/i }));
    expect(screen.getByRole('button', { name: /cerrar menú/i })).toBeInTheDocument();

    // Mobile link is at index 1 (desktop=0, mobile=1, footer=2)
    const links = screen.getAllByText('Cómo funciona');
    await user.click(links[1]);

    expect(screen.queryByRole('button', { name: /cerrar menú/i })).not.toBeInTheDocument();
  });

  it('closes mobile menu when "Precios" link is clicked', async () => {
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getByRole('button', { name: /abrir menú/i }));
    expect(screen.getByRole('button', { name: /cerrar menú/i })).toBeInTheDocument();

    // Mobile link is at index 1 (desktop=0, mobile=1, footer=2)
    const links = screen.getAllByText('Precios');
    await user.click(links[1]);

    expect(screen.queryByRole('button', { name: /cerrar menú/i })).not.toBeInTheDocument();
  });

  it('closes mobile menu when mobile "FAQ" link is clicked', async () => {
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getByRole('button', { name: /abrir menú/i }));
    expect(screen.getByRole('button', { name: /cerrar menú/i })).toBeInTheDocument();

    // Mobile link is at index 0 (mobile=0, footer=1) — no desktop FAQ link
    const links = screen.getAllByText('FAQ');
    await user.click(links[0]);

    expect(screen.queryByRole('button', { name: /cerrar menú/i })).not.toBeInTheDocument();
  });

  it('shows aria-expanded true when mobile menu is open', () => {
    renderLanding();

    const openButton = screen.getByRole('button', { name: /abrir menú/i });
    expect(openButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(openButton);

    // Now the button label changes to "Cerrar menú" and aria-expanded is true
    const closeButton = screen.getByRole('button', { name: /cerrar menú/i });
    expect(closeButton).toHaveAttribute('aria-expanded', 'true');
  });

  // --- FAQ accordion tests (covers line 541) ---

  it('opens an FAQ item when clicked', () => {
    renderLanding();

    // FAQ answer should not be visible initially
    expect(
      screen.queryByText(/El plan Starter es completamente gratuito/i)
    ).not.toBeInTheDocument();

    // Click the first FAQ question
    const firstFaqButton = screen.getByRole('button', {
      name: /necesito tarjeta de crédito.*abrir/i,
    });
    fireEvent.click(firstFaqButton);

    // The answer should now be visible
    expect(
      screen.getByText(/El plan Starter es completamente gratuito/i)
    ).toBeInTheDocument();
  });

  it('closes an open FAQ item when clicked again', () => {
    renderLanding();

    // Open the first FAQ
    const firstFaqButton = screen.getByRole('button', {
      name: /necesito tarjeta de crédito.*abrir/i,
    });
    fireEvent.click(firstFaqButton);

    expect(
      screen.getByText(/El plan Starter es completamente gratuito/i)
    ).toBeInTheDocument();

    // Click again to close - now the label says "Cerrar"
    const closeFaqButton = screen.getByRole('button', {
      name: /necesito tarjeta de crédito.*cerrar/i,
    });
    fireEvent.click(closeFaqButton);

    expect(
      screen.queryByText(/El plan Starter es completamente gratuito/i)
    ).not.toBeInTheDocument();
  });

  it('closes previously open FAQ when a different one is opened', () => {
    renderLanding();

    // Open the first FAQ
    const firstFaqButton = screen.getByRole('button', {
      name: /necesito tarjeta de crédito.*abrir/i,
    });
    fireEvent.click(firstFaqButton);

    expect(
      screen.getByText(/El plan Starter es completamente gratuito/i)
    ).toBeInTheDocument();

    // Open the second FAQ
    const secondFaqButton = screen.getByRole('button', {
      name: /puedo importar mis datos.*abrir/i,
    });
    fireEvent.click(secondFaqButton);

    // First FAQ answer should be closed
    expect(
      screen.queryByText(/El plan Starter es completamente gratuito/i)
    ).not.toBeInTheDocument();

    // Second FAQ answer should be visible
    expect(
      screen.getByText(/Puedes importar clientes desde CSV/i)
    ).toBeInTheDocument();
  });

  it('sets aria-expanded correctly on FAQ items', () => {
    renderLanding();

    const firstFaqButton = screen.getByRole('button', {
      name: /necesito tarjeta de crédito.*abrir/i,
    });
    expect(firstFaqButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(firstFaqButton);

    // After opening, aria-expanded should be true
    const openFaqButton = screen.getByRole('button', {
      name: /necesito tarjeta de crédito.*cerrar/i,
    });
    expect(openFaqButton).toHaveAttribute('aria-expanded', 'true');
  });

  // --- Content verification ---

  it('renders all feature cards', () => {
    renderLanding();
    expect(screen.getByText('Calendario Inteligente')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Clientes')).toBeInTheDocument();
    expect(screen.getByText('Control de Inventario')).toBeInTheDocument();
    expect(screen.getByText('Reportes y Análisis')).toBeInTheDocument();
    expect(screen.getByText('Cotizaciones y Pagos')).toBeInTheDocument();
    expect(screen.getByText('Recordatorios')).toBeInTheDocument();
  });

  it('renders how-it-works steps', () => {
    renderLanding();
    expect(screen.getByText('Crea tu cuenta')).toBeInTheDocument();
    expect(screen.getByText('Agrega tus clientes y eventos')).toBeInTheDocument();
    expect(screen.getByText('Gestiona tu inventario')).toBeInTheDocument();
    expect(screen.getByText('Crece tu negocio')).toBeInTheDocument();
  });

  it('renders stats section', () => {
    renderLanding();
    expect(screen.getByText('500+')).toBeInTheDocument();
    expect(screen.getByText('12,000+')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders testimonials', () => {
    renderLanding();
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument();
    expect(screen.getByText('Ana Rodríguez')).toBeInTheDocument();
  });

  it('renders pricing plans', () => {
    renderLanding();
    expect(screen.getByText('Básico')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Gratis')).toBeInTheDocument();
    expect(screen.getByText('$99')).toBeInTheDocument();
  });

  it('renders all FAQ questions', () => {
    renderLanding();
    expect(
      screen.getByText('¿Necesito tarjeta de crédito para registrarme?')
    ).toBeInTheDocument();
    expect(
      screen.getByText('¿Puedo importar mis datos existentes?')
    ).toBeInTheDocument();
    expect(screen.getByText('¿Mis datos están seguros?')).toBeInTheDocument();
    expect(
      screen.getByText('¿Puedo cancelar en cualquier momento?')
    ).toBeInTheDocument();
  });

  it('renders footer with copyright and links', () => {
    renderLanding();
    expect(
      screen.getByText(/2026 Eventos. Todos los derechos reservados/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText('Datos protegidos con encriptación de extremo a extremo')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recuperar contraseña/i })).toBeInTheDocument();
  });

  it('renders the mobile menu "Iniciar Sesión" link', () => {
    renderLanding();

    // Open mobile menu
    const openButton = screen.getByRole('button', { name: /abrir menú/i });
    fireEvent.click(openButton);

    // There should be multiple "Iniciar Sesión" links now (desktop + mobile)
    const loginLinks = screen.getAllByText('Iniciar Sesión');
    expect(loginLinks.length).toBeGreaterThanOrEqual(2);
  });
});
