import { useMemo, useState } from 'react';
import { Clock, Crown, Plus, Trash2, UserCog, Users } from 'lucide-react';
import type { AssignmentStatus, Staff } from '../../../types/entities';
import { useStaffAvailability, useStaffTeams } from '@/hooks/queries/useStaffQueries';
import { Modal } from '@/components/Modal';

// Shape tracked in EventForm state — matches EventStaffAssignment but with
// a deterministic row id so the list can be edited before the event has an
// event_id in the backend.
//
// Ola 1 — shift window + status. shift_start/end son TIME (HH:mm) en UI,
// se convierten a ISO8601 UTC en el submit combinándolos con event_date.
// status null = preservar en upsert (semántica del backend).
export interface SelectedStaffAssignment {
  staff_id: string;
  fee_amount: number | null;
  role_override: string;
  notes: string;
  shift_start: string | null; // "HH:mm" local o null
  shift_end: string | null;   // "HH:mm" local o null
  status: AssignmentStatus | null;
}

export type StaffFieldValue = string | number | null;

interface EventStaffProps {
  staffCatalog: Staff[];
  selectedStaff: SelectedStaffAssignment[];
  eventDate?: string | null; // YYYY-MM-DD para availability lookup
  eventId?: string | null;   // Excluir este evento del flag "ocupado"
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof SelectedStaffAssignment, value: StaffFieldValue) => void;
  // Ola 2 — block-add members de un equipo al form. Las filas expandidas
  // respetan los fee/shift/status defaults (la UI ya se pueden editar fila a
  // fila). El padre maneja la dedupe y el role_override del team.
  onAddTeamMembers?: (rows: SelectedStaffAssignment[]) => void;
}

const STATUS_OPTIONS: { value: AssignmentStatus; label: string }[] = [
  { value: 'pending', label: 'Sin confirmar' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'declined', label: 'Rechazó' },
  { value: 'cancelled', label: 'Cancelado' },
];

export const EventStaff: React.FC<EventStaffProps> = ({
  staffCatalog,
  selectedStaff,
  eventDate,
  eventId,
  onAdd,
  onRemove,
  onChange,
  onAddTeamMembers,
}) => {
  const emptyCatalog = staffCatalog.length === 0;
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const { data: teams = [], isLoading: loadingTeams } = useStaffTeams();

  const handlePickTeam = async (teamId: string) => {
    if (!onAddTeamMembers) return;
    // Evitamos el fetch por-id desde acá para no dependency-injectar un hook
    // dinámico. Usamos el ListTeams (member_count) solo para el menú; al
    // seleccionar delegamos el fetch-and-expand al padre vía callback con
    // el id, pero por simplicidad buscamos miembros con un extra fetch en
    // el padre. Para mantener este componente self-contained: resolvemos
    // via fetch directo al service.
    const { staffService } = await import('@/services/staffService');
    try {
      const team = await staffService.getTeam(teamId);
      const members = [...(team.members ?? [])].sort((a, b) => a.position - b.position);
      const existingIds = new Set(selectedStaff.map((s) => s.staff_id).filter(Boolean));
      const rows: SelectedStaffAssignment[] = [];
      for (const m of members) {
        if (existingIds.has(m.staff_id)) continue;
        const staff = staffCatalog.find((s) => s.id === m.staff_id);
        // Si el staff del equipo no está en el catálogo local (p.ej. filtro),
        // igual lo agregamos por id — el backend valida en el upsert.
        const staffRole = staff?.role_label ?? null;
        const teamRole = team.role_label ?? null;
        const roleOverride = staffRole ? '' : teamRole ?? '';
        rows.push({
          staff_id: m.staff_id,
          fee_amount: null,
          role_override: roleOverride,
          notes: '',
          shift_start: null,
          shift_end: null,
          status: null,
        });
      }
      if (rows.length > 0) onAddTeamMembers(rows);
      setTeamPickerOpen(false);
    } catch {
      // El service/api ya muestra toasts globales para errores HTTP.
      setTeamPickerOpen(false);
    }
  };

  // Availability — solo pedimos si tenemos fecha. El hook se skipea en caso contrario.
  const { data: availability = [] } = useStaffAvailability(eventDate || null);

  // Excluimos el evento actual al calcular busy: un staff ya asignado a este
  // mismo evento NO debe mostrarse como "Ocupado ese día" consigo mismo.
  const busyStaffIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of availability) {
      const hasOther = row.assignments.some(
        (a) => !eventId || a.event_id !== eventId,
      );
      if (hasOther) set.add(row.staff_id);
    }
    return set;
  }, [availability, eventId]);

  // Track which rows have expanded the "Agregar horario (opcional)" panel.
  const [shiftExpanded, setShiftExpanded] = useState<Record<number, boolean>>({});

  const toggleShift = (index: number) => {
    setShiftExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

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
          <a href="/staff/new" className="text-primary font-medium hover:underline">
            Crear el primero
          </a>
          .
        </div>
      ) : (
        <>
          {selectedStaff.map((item, index) => {
            const availableCatalog = staffCatalog.filter(
              (s) => s.id === item.staff_id || !selectedStaff.some((sel, i) => i !== index && sel.staff_id === s.id),
            );
            const isShiftOpen =
              shiftExpanded[index] || !!item.shift_start || !!item.shift_end;
            // Default mostrado del select cuando no hay status seteado = "confirmed".
            const statusValue: AssignmentStatus = item.status ?? 'confirmed';

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
                    {availableCatalog.map((s) => {
                      const busy = eventDate && busyStaffIds.has(s.id) && s.id !== item.staff_id;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.role_label ? ` · ${s.role_label}` : ''}
                          {busy ? ' · Ocupado ese día' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {eventDate && item.staff_id && busyStaffIds.has(item.staff_id) && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Ocupado ese día
                    </span>
                  )}
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

                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Estado</label>
                  <select
                    value={statusValue}
                    onChange={(e) => onChange(index, 'status', e.target.value as AssignmentStatus)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Notas</label>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => onChange(index, 'notes', e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Hora de llegada, indicaciones…"
                  />
                </div>

                <div className="sm:col-span-12">
                  {!isShiftOpen ? (
                    <button
                      type="button"
                      onClick={() => toggleShift(index)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      Agregar horario (opcional)
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Entrada
                        </label>
                        <input
                          type="time"
                          value={item.shift_start ?? ''}
                          onChange={(e) =>
                            onChange(index, 'shift_start', e.target.value === '' ? null : e.target.value)
                          }
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Salida
                        </label>
                        <input
                          type="time"
                          value={item.shift_end ?? ''}
                          onChange={(e) =>
                            onChange(index, 'shift_end', e.target.value === '' ? null : e.target.value)
                          }
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar colaborador
            </button>
            {onAddTeamMembers && (
              <button
                type="button"
                onClick={() => setTeamPickerOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text bg-surface-alt hover:bg-card border border-border rounded-lg transition-colors"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Agregar equipo completo
              </button>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={teamPickerOpen}
        onClose={() => setTeamPickerOpen(false)}
        title="Seleccioná un equipo"
        maxWidth="lg"
      >
        {loadingTeams ? (
          <p className="text-sm text-text-secondary">Cargando equipos…</p>
        ) : teams.length === 0 ? (
          <div className="text-sm text-text-secondary space-y-2">
            <p>Sin equipos todavía.</p>
            <a
              href="/staff/teams/new"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Agregá tu primera cuadrilla
            </a>
          </div>
        ) : (
          <ul className="divide-y divide-border max-h-96 overflow-y-auto">
            {teams.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => handlePickTeam(t.id)}
                  className="w-full flex items-start justify-between gap-3 py-3 px-1 hover:bg-surface-alt/60 transition-colors text-left"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <div
                      className="h-9 w-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0"
                      aria-hidden="true"
                    >
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text truncate">{t.name}</div>
                      {t.role_label && (
                        <div className="text-xs text-text-secondary truncate">{t.role_label}</div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent dark:bg-accent/20">
                    <Crown className="h-3 w-3" aria-hidden="true" />
                    {t.member_count ?? 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
};
