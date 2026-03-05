import React, { useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { EventGeneralInfo } from './EventGeneralInfo';

vi.mock('./QuickClientModal', () => ({
  QuickClientModal: ({ isOpen, onClose, onClientCreated }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="quick-client-modal">
        <button onClick={onClose}>CloseModal</button>
        <button onClick={() => onClientCreated({ id: 'new-1', name: 'New Client' })}>
          CreateClient
        </button>
      </div>
    );
  },
}));

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaults?: Record<string, any>;
  errors?: Record<string, any>;
}> = ({ children, defaults }) => {
  const methods = useForm({
    defaultValues: {
      client_id: '',
      event_date: '2024-01-02',
      service_type: 'Boda',
      num_people: 100,
      status: 'quoted',
      start_time: '',
      end_time: '',
      location: '',
      city: '',
      ...defaults,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

/** FormWrapper that programmatically sets form errors via setError */
const FormWrapperWithErrors: React.FC<{
  children: React.ReactNode;
  defaults?: Record<string, any>;
  fieldErrors: Record<string, string>;
}> = ({ children, defaults, fieldErrors }) => {
  const methods = useForm({
    defaultValues: {
      client_id: '',
      event_date: '2024-01-02',
      service_type: 'Boda',
      num_people: 100,
      status: 'quoted',
      start_time: '',
      end_time: '',
      location: '',
      city: '',
      ...defaults,
    },
  });

  useEffect(() => {
    Object.entries(fieldErrors).forEach(([field, message]) => {
      methods.setError(field as any, { type: 'manual', message });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <FormProvider {...methods}>{children}</FormProvider>;
};

const renderWithForm = (ui: React.ReactNode, defaults?: Record<string, any>) =>
  render(<FormWrapper defaults={defaults}>{ui}</FormWrapper>);

const renderWithFormErrors = (
  ui: React.ReactNode,
  fieldErrors: Record<string, string>,
  defaults?: Record<string, any>,
) => render(<FormWrapperWithErrors defaults={defaults} fieldErrors={fieldErrors}>{ui}</FormWrapperWithErrors>);

const sampleClients = [
  {
    id: '1',
    name: 'Ana Perez',
    phone: '5551112222',
    email: 'ana@example.com',
    address: 'Calle 1',
    city: 'CDMX',
    total_events: 3,
    total_spent: 1200.5,
  },
  {
    id: '2',
    name: 'Carlos Lopez',
    phone: '5553334444',
    email: null,
    address: null,
    city: null,
    total_events: 0,
    total_spent: null,
  },
];

describe('EventGeneralInfo', () => {
  it('renders client options and history', () => {
    renderWithForm(
      <EventGeneralInfo
        clients={[
          {
            id: '1',
            name: 'Ana Perez',
            total_events: 3,
            total_spent: 1200.5,
          } as any,
        ]}
        clientIdValue="1"
      />
    );

    expect(screen.getByText('Seleccionar cliente')).toBeInTheDocument();
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText(/Historial del Cliente/i)).toBeInTheDocument();
    expect(screen.getByText(/3 eventos realizados/i)).toBeInTheDocument();
    expect(screen.getByText(/Total gastado: \$1200.50/i)).toBeInTheDocument();
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('renders all form fields', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} />
    );

    expect(screen.getByLabelText(/Cliente \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha del Evento \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hora de Inicio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hora de Fin/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo de Servicio \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de Personas \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ubicación del Evento/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ciudad del Evento/)).toBeInTheDocument();
  });

  it('renders all client options in dropdown', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} />
    );

    expect(screen.getByText('Seleccionar cliente')).toBeInTheDocument();
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lopez')).toBeInTheDocument();
  });

  it('does not show client history when clientIdValue is not provided', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} />
    );

    expect(screen.queryByText(/Historial del Cliente/i)).not.toBeInTheDocument();
  });

  it('does not show client history when clientIdValue does not match any client', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} clientIdValue="non-existent-id" />
    );

    // The container div exists but returns null from the IIFE
    expect(screen.queryByText(/Historial del Cliente/i)).not.toBeInTheDocument();
  });

  it('shows $0.00 for client with null total_spent', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} clientIdValue="2" />
    );

    expect(screen.getByText(/Historial del Cliente/i)).toBeInTheDocument();
    expect(screen.getByText(/Total gastado: \$0\.00/i)).toBeInTheDocument();
  });

  it('opens quick client modal when clicking "Nuevo Cliente" button', async () => {
    const onClientCreated = vi.fn();

    renderWithForm(
      <EventGeneralInfo
        clients={sampleClients}
        onClientCreated={onClientCreated}
      />
    );

    // Click the "Nuevo Cliente" button
    fireEvent.click(screen.getByRole('button', { name: /Crear nuevo cliente rápidamente/i }));

    // Modal should appear
    expect(screen.getByTestId('quick-client-modal')).toBeInTheDocument();
  });

  it('closes quick client modal via CloseModal button', async () => {
    const onClientCreated = vi.fn();

    renderWithForm(
      <EventGeneralInfo
        clients={sampleClients}
        onClientCreated={onClientCreated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Crear nuevo cliente rápidamente/i }));
    expect(screen.getByTestId('quick-client-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('CloseModal'));

    await waitFor(() => {
      expect(screen.queryByTestId('quick-client-modal')).not.toBeInTheDocument();
    });
  });

  it('calls onClientCreated when client is created from modal', async () => {
    const onClientCreated = vi.fn();

    renderWithForm(
      <EventGeneralInfo
        clients={sampleClients}
        onClientCreated={onClientCreated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Crear nuevo cliente rápidamente/i }));
    fireEvent.click(screen.getByText('CreateClient'));

    expect(onClientCreated).toHaveBeenCalledWith({ id: 'new-1', name: 'New Client' });
  });

  it('does not render QuickClientModal when onClientCreated is not provided', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} />
    );

    // Even clicking the button should not show modal since onClientCreated is not passed
    fireEvent.click(screen.getByRole('button', { name: /Crear nuevo cliente rápidamente/i }));

    // The modal is conditionally rendered only when onClientCreated exists
    expect(screen.queryByTestId('quick-client-modal')).not.toBeInTheDocument();
  });

  it('renders status options with all four values', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} />
    );

    const statusSelect = screen.getByLabelText(/Estado \*/);
    const options = statusSelect.querySelectorAll('option');

    const values = Array.from(options).map((o: any) => o.value);
    expect(values).toContain('quoted');
    expect(values).toContain('confirmed');
    expect(values).toContain('completed');
    expect(values).toContain('cancelled');
  });

  it('renders with pre-filled default values', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} />,
      { event_date: '2025-06-15', service_type: 'Coctel', num_people: 50 }
    );

    expect(screen.getByDisplayValue('2025-06-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coctel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('renders placeholders for text fields', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} />
    );

    expect(screen.getByPlaceholderText('Ej. Decoración, Banquete, Fotografía')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Dirección del evento/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ciudad del evento/)).toBeInTheDocument();
  });

  it('displays client total_events as 0 when set', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} clientIdValue="2" />
    );

    expect(screen.getByText(/0 eventos realizados/i)).toBeInTheDocument();
  });

  // ---------- BRANCH COVERAGE: error states for form fields ----------

  it('displays client_id error message when client_id has an error', () => {
    renderWithFormErrors(
      <EventGeneralInfo clients={sampleClients} />,
      { client_id: 'El cliente es requerido' },
    );

    expect(screen.getByText('El cliente es requerido')).toBeInTheDocument();
    const select = screen.getByLabelText(/Cliente \*/);
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-describedby', 'client_id-error');
  });

  it('displays event_date error message when event_date has an error', () => {
    renderWithFormErrors(
      <EventGeneralInfo clients={sampleClients} />,
      { event_date: 'La fecha es requerida' },
    );

    expect(screen.getByText('La fecha es requerida')).toBeInTheDocument();
    const input = screen.getByLabelText(/Fecha del Evento \*/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'event_date-error');
  });

  it('displays service_type error message when service_type has an error', () => {
    renderWithFormErrors(
      <EventGeneralInfo clients={sampleClients} />,
      { service_type: 'El tipo de servicio es requerido' },
    );

    expect(screen.getByText('El tipo de servicio es requerido')).toBeInTheDocument();
    const input = screen.getByLabelText(/Tipo de Servicio \*/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'service_type-error');
  });

  it('displays num_people error message when num_people has an error', () => {
    renderWithFormErrors(
      <EventGeneralInfo clients={sampleClients} />,
      { num_people: 'El número de personas es requerido' },
    );

    expect(screen.getByText('El número de personas es requerido')).toBeInTheDocument();
    const input = screen.getByLabelText(/Número de Personas \*/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'num_people-error');
  });

  it('displays multiple field errors simultaneously', () => {
    renderWithFormErrors(
      <EventGeneralInfo clients={sampleClients} />,
      {
        client_id: 'Cliente requerido',
        event_date: 'Fecha requerida',
        service_type: 'Servicio requerido',
        num_people: 'Personas requeridas',
      },
    );

    expect(screen.getByText('Cliente requerido')).toBeInTheDocument();
    expect(screen.getByText('Fecha requerida')).toBeInTheDocument();
    expect(screen.getByText('Servicio requerido')).toBeInTheDocument();
    expect(screen.getByText('Personas requeridas')).toBeInTheDocument();
  });

  it('sets aria-invalid to false and no aria-describedby when fields have no errors', () => {
    renderWithForm(
      <EventGeneralInfo clients={sampleClients} />
    );

    const clientSelect = screen.getByLabelText(/Cliente \*/);
    expect(clientSelect).toHaveAttribute('aria-invalid', 'false');
    expect(clientSelect).not.toHaveAttribute('aria-describedby');

    const dateInput = screen.getByLabelText(/Fecha del Evento \*/);
    expect(dateInput).toHaveAttribute('aria-invalid', 'false');
    expect(dateInput).not.toHaveAttribute('aria-describedby');

    const serviceInput = screen.getByLabelText(/Tipo de Servicio \*/);
    expect(serviceInput).toHaveAttribute('aria-invalid', 'false');
    expect(serviceInput).not.toHaveAttribute('aria-describedby');

    const peopleInput = screen.getByLabelText(/Número de Personas \*/);
    expect(peopleInput).toHaveAttribute('aria-invalid', 'false');
    expect(peopleInput).not.toHaveAttribute('aria-describedby');
  });
});
