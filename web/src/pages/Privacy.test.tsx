import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Privacy } from './Privacy';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPrivacy() {
  return render(
    <MemoryRouter>
      <Privacy />
    </MemoryRouter>
  );
}

describe('Privacy', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  describe('rendering', () => {
    it('renders the page title', () => {
      renderPrivacy();

      expect(screen.getByText('Politica de Privacidad')).toBeInTheDocument();
    });

    it('renders the last updated date', () => {
      renderPrivacy();

      expect(screen.getByText(/Ultima actualizacion: 1 de enero de 2025/)).toBeInTheDocument();
    });

    it('renders section 1 - information we collect', () => {
      renderPrivacy();

      expect(screen.getByText('1. Informacion que recopilamos')).toBeInTheDocument();
      expect(
        screen.getByText(/Recopilamos la informacion que nos proporcionas al registrarte/)
      ).toBeInTheDocument();
    });

    it('renders section 2 - how we use your information', () => {
      renderPrivacy();

      expect(screen.getByText('2. Como usamos tu informacion')).toBeInTheDocument();
      expect(screen.getByText('Proporcionar y mejorar los servicios de Solennix')).toBeInTheDocument();
      expect(screen.getByText('Gestionar tu cuenta y suscripcion')).toBeInTheDocument();
      expect(screen.getByText('Enviarte comunicaciones sobre el servicio')).toBeInTheDocument();
      expect(screen.getByText('Procesar pagos a traves de proveedores seguros')).toBeInTheDocument();
      expect(screen.getByText('Cumplir con obligaciones legales')).toBeInTheDocument();
    });

    it('renders section 3 - storage and security', () => {
      renderPrivacy();

      expect(screen.getByText('3. Almacenamiento y seguridad')).toBeInTheDocument();
      expect(
        screen.getByText(/Tus datos se almacenan en servidores seguros/)
      ).toBeInTheDocument();
    });

    it('renders section 4 - sharing information', () => {
      renderPrivacy();

      expect(screen.getByText('4. Compartir informacion')).toBeInTheDocument();
      expect(
        screen.getByText(/No vendemos, intercambiamos ni transferimos tu informacion personal/)
      ).toBeInTheDocument();
    });

    it('renders section 5 - your rights', () => {
      renderPrivacy();

      expect(screen.getByText('5. Tus derechos')).toBeInTheDocument();
      expect(screen.getByText('Acceder a tu informacion personal')).toBeInTheDocument();
      expect(screen.getByText('Corregir datos inexactos')).toBeInTheDocument();
      expect(screen.getByText('Solicitar la eliminacion de tu cuenta y datos')).toBeInTheDocument();
      expect(screen.getByText('Exportar tus datos')).toBeInTheDocument();
    });

    it('renders section 6 - cookies', () => {
      renderPrivacy();

      expect(screen.getByText('6. Cookies y tecnologias similares')).toBeInTheDocument();
      expect(
        screen.getByText(/La aplicacion utiliza almacenamiento local seguro/)
      ).toBeInTheDocument();
    });

    it('renders section 7 - changes to policy', () => {
      renderPrivacy();

      expect(screen.getByText('7. Cambios a esta politica')).toBeInTheDocument();
      expect(
        screen.getByText(/Podemos actualizar esta Politica de Privacidad periodicamente/)
      ).toBeInTheDocument();
    });

    it('renders section 8 - contact', () => {
      renderPrivacy();

      expect(screen.getByText('8. Contacto')).toBeInTheDocument();
      expect(
        screen.getByText(/Si tienes preguntas sobre esta politica/)
      ).toBeInTheDocument();
    });

    it('renders contact email links', () => {
      renderPrivacy();

      const emailLinks = screen.getAllByRole('link', { name: /hola@creapolis\.dev/i });
      expect(emailLinks.length).toBeGreaterThanOrEqual(1);
      emailLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', 'mailto:hola@creapolis.dev');
      });
    });

    it('renders the website link in the contact section', () => {
      renderPrivacy();

      const websiteLink = screen.getByRole('link', { name: /https:\/\/www\.creapolis\.dev/i });
      expect(websiteLink).toBeInTheDocument();
      expect(websiteLink).toHaveAttribute('href', 'https://www.creapolis.dev');
      expect(websiteLink).toHaveAttribute('target', '_blank');
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('navigation', () => {
    it('renders the back button with "Volver" text', () => {
      renderPrivacy();

      const backButton = screen.getByRole('button', { name: /Volver/i });
      expect(backButton).toBeInTheDocument();
    });

    it('navigates back when the back button is clicked', async () => {
      const user = userEvent.setup();
      renderPrivacy();

      const backButton = screen.getByRole('button', { name: /Volver/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});
