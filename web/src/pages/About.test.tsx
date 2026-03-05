import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { About } from './About';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderAbout() {
  return render(
    <MemoryRouter>
      <About />
    </MemoryRouter>
  );
}

describe('About', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  describe('rendering', () => {
    it('renders the app name and version', () => {
      renderAbout();

      expect(screen.getByText('Solennix')).toBeInTheDocument();
      expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    });

    it('renders the developer info section', () => {
      renderAbout();

      expect(screen.getByText('Desarrollado por')).toBeInTheDocument();
      expect(screen.getByText('Creapolis.Dev')).toBeInTheDocument();
    });

    it('renders the website link with correct href', () => {
      renderAbout();

      const websiteLink = screen.getByRole('link', { name: /www\.creapolis\.dev/i });
      expect(websiteLink).toBeInTheDocument();
      expect(websiteLink).toHaveAttribute('href', 'https://www.creapolis.dev');
      expect(websiteLink).toHaveAttribute('target', '_blank');
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders the email link with correct href', () => {
      renderAbout();

      const emailLink = screen.getByRole('link', { name: /creapolis\.mx@gmail\.com/i });
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute('href', 'mailto:creapolis.mx@gmail.com');
    });

    it('renders the legal section with links to terms and privacy', () => {
      renderAbout();

      expect(screen.getByText('Legal')).toBeInTheDocument();

      const termsLink = screen.getByRole('link', { name: /Terminos y Condiciones/i });
      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute('href', '/terms');

      const privacyLink = screen.getByRole('link', { name: /Politica de Privacidad/i });
      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    it('renders the about the app section', () => {
      renderAbout();

      expect(screen.getByText('Sobre la app')).toBeInTheDocument();
      expect(
        screen.getByText(/Solennix es una aplicacion SaaS disenada para organizadores de eventos/)
      ).toBeInTheDocument();
    });

    it('renders the footer with attribution', () => {
      renderAbout();

      expect(
        screen.getByText(/Hecho con/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/por el equipo de Creapolis\.Dev/)
      ).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('renders the back button with "Volver" text', () => {
      renderAbout();

      const backButton = screen.getByRole('button', { name: /Volver/i });
      expect(backButton).toBeInTheDocument();
    });

    it('navigates back when the back button is clicked', async () => {
      const user = userEvent.setup();
      renderAbout();

      const backButton = screen.getByRole('button', { name: /Volver/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});
