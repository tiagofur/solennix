import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Terms } from './Terms';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderTerms() {
  return render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>
  );
}

describe('Terms', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  describe('rendering', () => {
    it('renders the page title', () => {
      renderTerms();

      expect(screen.getByText('Terminos y Condiciones')).toBeInTheDocument();
    });

    it('renders the last updated date', () => {
      renderTerms();

      expect(screen.getByText(/Ultima actualizacion: 1 de enero de 2025/)).toBeInTheDocument();
    });

    it('renders section 1 - use of service', () => {
      renderTerms();

      expect(screen.getByText('1. Uso del servicio')).toBeInTheDocument();
      expect(
        screen.getByText(/Al usar Solennix, aceptas estos términos/)
      ).toBeInTheDocument();
      expect(screen.getByText('Proporcionar informacion veraz al registrarte')).toBeInTheDocument();
      expect(screen.getByText('Mantener la confidencialidad de tu cuenta')).toBeInTheDocument();
      expect(screen.getByText('No usar el servicio para actividades ilegales')).toBeInTheDocument();
      expect(screen.getByText('No intentar acceder a datos de otros usuarios')).toBeInTheDocument();
    });

    it('renders section 2 - subscription and payments', () => {
      renderTerms();

      expect(screen.getByText('2. Suscripcion y pagos')).toBeInTheDocument();
      expect(
        screen.getByText(/Solennix ofrece planes de suscripcion mensual/)
      ).toBeInTheDocument();
      expect(screen.getByText('El plan Basico es gratuito con funcionalidades limitadas')).toBeInTheDocument();
      expect(screen.getByText('El plan Pro incluye todas las funcionalidades sin restricciones')).toBeInTheDocument();
      expect(screen.getByText('Los precios pueden variar segun tu region')).toBeInTheDocument();
      expect(screen.getByText('Las suscripciones se renuevan automaticamente salvo cancelacion')).toBeInTheDocument();
    });

    it('renders section 3 - cancellation', () => {
      renderTerms();

      expect(screen.getByText('3. Cancelacion')).toBeInTheDocument();
      expect(
        screen.getByText(/Puedes cancelar tu suscripcion en cualquier momento/)
      ).toBeInTheDocument();
      expect(screen.getByText('Mantendras acceso hasta el final del periodo pagado')).toBeInTheDocument();
      expect(screen.getByText('No se realizan reembolsos proporcionales')).toBeInTheDocument();
      expect(screen.getByText('Tus datos se conservan por 30 dias adicionales')).toBeInTheDocument();
      expect(screen.getByText('Puedes exportar tus datos antes de eliminar la cuenta')).toBeInTheDocument();
    });

    it('renders section 4 - intellectual property', () => {
      renderTerms();

      expect(screen.getByText('4. Propiedad intelectual')).toBeInTheDocument();
      expect(
        screen.getByText(/Solennix y su contenido son propiedad de Creapolis\.Dev/)
      ).toBeInTheDocument();
    });

    it('renders section 5 - service availability', () => {
      renderTerms();

      expect(screen.getByText('5. Disponibilidad del servicio')).toBeInTheDocument();
      expect(
        screen.getByText(/Nos esforzamos por mantener Solennix disponible 24\/7/)
      ).toBeInTheDocument();
    });

    it('renders section 6 - limitation of liability', () => {
      renderTerms();

      expect(screen.getByText('6. Limitacion de responsabilidad')).toBeInTheDocument();
      expect(screen.getByText('No garantizamos que el servicio sea libre de errores')).toBeInTheDocument();
      expect(screen.getByText('No somos responsables de perdidas de datos por causas ajenas a nosotros')).toBeInTheDocument();
      expect(screen.getByText('Nuestra responsabilidad total no superara el monto pagado en los ultimos 3 meses de servicio')).toBeInTheDocument();
      expect(screen.getByText('No somos responsables de danos indirectos o consecuentes')).toBeInTheDocument();
    });

    it('renders section 7 - modifications', () => {
      renderTerms();

      expect(screen.getByText('7. Modificaciones')).toBeInTheDocument();
      expect(
        screen.getByText(/Nos reservamos el derecho de modificar estos términos/)
      ).toBeInTheDocument();
    });

    it('renders section 8 - applicable law', () => {
      renderTerms();

      expect(screen.getByText('8. Ley aplicable')).toBeInTheDocument();
      expect(
        screen.getByText(/Estos términos se rigen por las leyes de México/)
      ).toBeInTheDocument();
    });

    it('renders section 9 - contact', () => {
      renderTerms();

      expect(screen.getByText('9. Contacto')).toBeInTheDocument();
      expect(
        screen.getByText(/Para cualquier consulta sobre estos términos/)
      ).toBeInTheDocument();
    });

    it('renders contact email link', () => {
      renderTerms();

      const emailLink = screen.getByRole('link', { name: /hola@creapolis\.dev/i });
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute('href', 'mailto:hola@creapolis.dev');
    });

    it('renders the website link in the contact section', () => {
      renderTerms();

      const websiteLink = screen.getByRole('link', { name: /https:\/\/www\.creapolis\.dev/i });
      expect(websiteLink).toBeInTheDocument();
      expect(websiteLink).toHaveAttribute('href', 'https://www.creapolis.dev');
      expect(websiteLink).toHaveAttribute('target', '_blank');
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('navigation', () => {
    it('renders the back button with "Volver" text', () => {
      renderTerms();

      const backButton = screen.getByRole('button', { name: /Volver/i });
      expect(backButton).toBeInTheDocument();
    });

    it('navigates back when the back button is clicked', async () => {
      const user = userEvent.setup();
      renderTerms();

      const backButton = screen.getByRole('button', { name: /Volver/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});
