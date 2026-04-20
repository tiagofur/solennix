import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ChevronDown, ChevronUp, Crown, Save, Search, Users, X } from "lucide-react";
import {
  useCreateStaffTeam,
  useStaff,
  useStaffTeam,
  useUpdateStaffTeam,
} from "@/hooks/queries/useStaffQueries";
import { useToast } from "@/hooks/useToast";
import type { StaffTeamInsert, StaffTeamMemberInput } from "@/types/entities";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(255, "Máximo 255 caracteres."),
  role_label: z
    .string()
    .trim()
    .max(255, "Máximo 255 caracteres.")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(5000, "Máximo 5000 caracteres.")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

// Estado interno de cada miembro mientras editamos. position se persiste en
// el submit a partir del orden del array — no se muestra en UI.
interface MemberDraft {
  staff_id: string;
  is_lead: boolean;
}

export const StaffTeamForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: existing, isLoading: loadingTeam } = useStaffTeam(isEdit ? id : undefined);
  const { data: staffCatalog = [], isLoading: loadingStaff } = useStaff();
  const createMut = useCreateStaffTeam();
  const updateMut = useUpdateStaffTeam();

  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", role_label: "", notes: "" },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        role_label: existing.role_label ?? "",
        notes: existing.notes ?? "",
      });
      const sorted = [...(existing.members ?? [])].sort((a, b) => a.position - b.position);
      setMembers(sorted.map((m) => ({ staff_id: m.staff_id, is_lead: m.is_lead })));
    }
  }, [existing, reset]);

  const selectedIds = useMemo(() => new Set(members.map((m) => m.staff_id)), [members]);

  const staffById = useMemo(() => {
    const map = new Map<string, (typeof staffCatalog)[number]>();
    for (const s of staffCatalog) map.set(s.id, s);
    return map;
  }, [staffCatalog]);

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staffCatalog;
    return staffCatalog.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.role_label ?? "").toLowerCase().includes(term) ||
        (s.email ?? "").toLowerCase().includes(term),
    );
  }, [staffCatalog, search]);

  const toggleMember = (staffId: string) => {
    setMembers((prev) => {
      if (prev.some((m) => m.staff_id === staffId)) {
        return prev.filter((m) => m.staff_id !== staffId);
      }
      return [...prev, { staff_id: staffId, is_lead: false }];
    });
  };

  const toggleLead = (staffId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.staff_id === staffId ? { ...m, is_lead: !m.is_lead } : m)),
    );
  };

  const moveMember = (index: number, direction: -1 | 1) => {
    setMembers((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeMember = (staffId: string) => {
    setMembers((prev) => prev.filter((m) => m.staff_id !== staffId));
  };

  const onSubmit = async (values: FormValues) => {
    const payloadMembers: StaffTeamMemberInput[] = members.map((m, idx) => ({
      staff_id: m.staff_id,
      is_lead: m.is_lead,
      position: idx,
    }));

    const payload: StaffTeamInsert = {
      name: values.name.trim(),
      role_label: values.role_label?.trim() || null,
      notes: values.notes?.trim() || null,
      members: payloadMembers,
    };

    try {
      if (isEdit && id) {
        await updateMut.mutateAsync({ id, data: payload });
        addToast("Equipo actualizado.", "success");
      } else {
        await createMut.mutateAsync(payload);
        addToast("Equipo creado.", "success");
      }
      navigate("/staff/teams");
    } catch {
      // Toast ya mostrado por el mutation onError.
    }
  };

  if (isEdit && loadingTeam) {
    return <div className="text-text-secondary">Cargando equipo…</div>;
  }

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        to="/staff/teams"
        className="inline-flex items-center text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Volver a Equipos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text tracking-tight">
          {isEdit ? "Editar equipo" : "Crear equipo"}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Agrupá colaboradores en una cuadrilla para asignarla a un evento en un solo paso.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-6"
      >
        <div>
          <label htmlFor="team-name" className="block text-sm font-medium text-text">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            id="team-name"
            type="text"
            {...register("name")}
            className="mt-1 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            placeholder="Cuadrilla principal · Equipo fotografía"
            aria-invalid={errors.name ? "true" : "false"}
          />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="team-role" className="block text-sm font-medium text-text">
            Rol del equipo
          </label>
          <input
            id="team-role"
            type="text"
            {...register("role_label")}
            className="mt-1 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            placeholder="Fotografía · Meseros · Coordinación"
            aria-invalid={errors.role_label ? "true" : "false"}
          />
          {errors.role_label && (
            <p className="mt-1 text-sm text-danger">{errors.role_label.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="team-notes" className="block text-sm font-medium text-text">
            Notas
          </label>
          <textarea
            id="team-notes"
            rows={3}
            {...register("notes")}
            className="mt-1 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            placeholder="Tarifa habitual del equipo, indicaciones, lo que quieras recordar…"
            aria-invalid={errors.notes ? "true" : "false"}
          />
          {errors.notes && <p className="mt-1 text-sm text-danger">{errors.notes.message}</p>}
        </div>

        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold text-text">Miembros</h2>
            <span className="text-xs text-text-secondary">({members.length})</span>
          </div>

          {members.length > 0 && (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface-alt/40">
              {members.map((m, idx) => {
                const staff = staffById.get(m.staff_id);
                return (
                  <li
                    key={m.staff_id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveMember(idx, -1)}
                        disabled={idx === 0}
                        className="p-0.5 text-text-tertiary hover:text-text disabled:opacity-30"
                        aria-label="Subir miembro"
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMember(idx, 1)}
                        disabled={idx === members.length - 1}
                        className="p-0.5 text-text-tertiary hover:text-text disabled:opacity-30"
                        aria-label="Bajar miembro"
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div
                      className="h-9 w-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0"
                      aria-hidden="true"
                    >
                      {(staff?.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text truncate">
                        {staff?.name ?? "Colaborador sin nombre"}
                      </div>
                      {staff?.role_label && (
                        <div className="text-xs text-text-secondary truncate">{staff.role_label}</div>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.is_lead}
                        onChange={() => toggleLead(m.staff_id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="inline-flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        Lidera el equipo
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeMember(m.staff_id)}
                      className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                      aria-label="Quitar del equipo"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div>
            <div className="text-sm font-medium text-text mb-2">Agregar colaboradores</div>
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-secondary" aria-hidden="true" />
              </div>
              <input
                type="search"
                className="block w-full pl-9 pr-3 py-2 border border-border rounded-xl bg-card text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary sm:text-sm"
                placeholder="Buscar por nombre o rol…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border">
              {loadingStaff ? (
                <div className="p-3 text-sm text-text-secondary">Cargando colaboradores…</div>
              ) : filteredCatalog.length === 0 ? (
                <div className="p-3 text-sm text-text-secondary">
                  No hay colaboradores que coincidan.
                </div>
              ) : (
                filteredCatalog.map((s) => {
                  const selected = selectedIds.has(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-alt/60 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMember(s.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-text truncate">{s.name}</div>
                        {s.role_label && (
                          <div className="text-xs text-text-secondary truncate">{s.role_label}</div>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Link
            to="/staff/teams"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl text-text-secondary bg-surface-alt hover:bg-card border border-border transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60"
          >
            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
            {isEdit ? "Guardar cambios" : "Crear equipo"}
          </button>
        </div>
      </form>
    </div>
  );
};
