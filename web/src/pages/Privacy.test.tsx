import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@tests/customRender';
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

      expect(screen.getByText('Política de Privacidad')).toBeInTheDocument();
    });

    it('renders the last updated date', () => {
      renderPrivacy();

      expect(screen.getByText(/Última actualización: 23 de abril de 2026/)).toBeInTheDocument();
    });

    it('renders section 1 - information we collect', () => {
      renderPrivacy();

      expect(screen.getByText('1. Información que recopilamos')).toBeInTheDocument();
      expect(
        screen.getByText(/Recopilamos la información que nos proporcionas al registrarte/)
      ).toBeInTheDocument();
    });

    it('renders section 2 - how we use your information', () => {
      renderPrivacy();

      expect(screen.getByText('2. Cómo usamos tu información')).toBeInTheDocument();
      expect(screen.getByText('Proporcionar y mejorar los servicios de Solennix')).toBeInTheDocument();
      expect(screen.getByText('Gestionar tu cuenta y suscripción')).toBeInTheDocument();
      expect(screen.getByText('Enviarte comunicaciones sobre el servicio')).toBeInTheDocument();
      expect(screen.getByText('Procesar pagos a través de proveedores seguros')).toBeInTheDocument();
      expect(screen.getByText('Cumplir con obligaciones legales y regulatorias')).toBeInTheDocument();
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

      expect(screen.getByText('4. Compartir información')).toBeInTheDocument();
      expect(
        screen.getByText(/No vendemos, intercambiamos ni transferimos tu información personal/)
      ).toBeInTheDocument();
    });

    it('renders section 5 - your rights', () => {
      renderPrivacy();

      expect(screen.getByText('5. Tus derechos y eliminación de datos')).toBeInTheDocument();
      expect(screen.getByText('Acceder a tu información personal')).toBeInTheDocument();
      expect(screen.getByText('Corregir datos inexactos')).toBeInTheDocument();
      expect(screen.getByText('Solicitar la eliminación de tu cuenta y todos tus datos asociados')).toBeInTheDocument();
      expect(screen.getByText('Exportar tu información en un formato estándar')).toBeInTheDocument();
    });

    it('renders section 6 - cookies', () => {
      renderPrivacy();

      expect(screen.getByText('6. Cookies y tecnologías similares')).toBeInTheDocument();
      expect(
        screen.getByText(/La aplicación utiliza almacenamiento local seguro/)
      ).toBeInTheDocument();
    });

    it('renders section 7 - changes to policy', () => {
      renderPrivacy();

      expect(screen.getByText('7. Cambios a esta política')).toBeInTheDocument();
      expect(
        screen.getByText(/Podemos actualizar esta Política de Privacidad periódicamente/)
      ).toBeInTheDocument();
    });

    it('renders section 8 - contact', () => {
      renderPrivacy();

      expect(screen.getByText('8. Contacto')).toBeInTheDocument();
      expect(
        screen.getByText(/Si tienes preguntas sobre esta política/)
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
