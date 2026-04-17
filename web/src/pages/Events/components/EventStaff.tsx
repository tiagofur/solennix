import { Plus, Trash2, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Staff } from '../../../types/entities';

// Shape tracked in EventForm state — matches EventStaffAssignment but with
// a deterministic row id so the list can be edited before the event has an
// event_id in the backend.
export interface SelectedStaffAssignment {
  staff_id: string;
  fee_amount: number | null;
  role_override: string;
  notes: string;
}

interface EventStaffProps {
  staffCatalog: Staff[];
  selectedStaff: SelectedStaffAssignment[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof SelectedStaffAssignment, value: string | number | null) => void;
}

export const EventStaff: React.FC<EventStaffProps> = ({
  staffCatalog,
  selectedStaff,
  onAdd,
  onRemove,
  onChange,
}) => {
  const emptyCatalog = staffCatalog.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <UserCog className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium text-text">Personal asignado</h3>
      </div>

      <p className="text-sm text-text-tertiary">
        Asigná colaboradores al evento (fotógrafo, DJ, meseros, coordinador). El costo es opcional y se
        registra por evento — el mismo colaborador puede cobrar distinto en cada uno.
      </p>

      {emptyCatalog ? (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-text-secondary">
          Aún no tenés colaboradores en tu catálogo.{' '}
          <Link to="/staff/new" className="text-primary font-medium hover:underline">
            Crear el primero
          </Link>
          .
        </div>
      ) : (
        <>
          {selectedStaff.map((item, index) => {
            const availableCatalog = staffCatalog.filter(
              (s) => s.id === item.staff_id || !selectedStaff.some((sel, i) => i !== index && sel.staff_id === s.id),
            );
            return (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-surface-alt/40 border border-border rounded-xl"
              >
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Colaborador</label>
                  <select
                    value={item.staff_id}
                    onChange={(e) => onChange(index, 'staff_id', e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  >
                    <option value="">Seleccionar…</option>
                    {availableCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.role_label ? ` · ${s.role_label}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Costo (opcional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.fee_amount ?? ''}
                    onChange={(e) =>
                      onChange(index, 'fee_amount', e.target.value === '' ? null : Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="0.00"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Rol en este evento
                  </label>
                  <input
                    type="text"
                    value={item.role_override}
                    onChange={(e) => onChange(index, 'role_override', e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Mismo del catálogo si vacío"
                  />
                </div>

                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="w-full inline-flex items-center justify-center px-2 py-2 text-sm rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                    aria-label="Quitar colaborador"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:col-span-12">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Notas</label>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => onChange(index, 'notes', e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Hora de llegada, indicaciones…"
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar colaborador
          </button>
        </>
      )}
    </div>
  );
};
