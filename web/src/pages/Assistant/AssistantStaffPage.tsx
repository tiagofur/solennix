import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStaff } from '@/hooks/queries/useStaffQueries';
import { AssistantPortalNav } from './AssistantPortalNav';

export const AssistantStaffPage: React.FC = () => {
  const { t } = useTranslation(['common']);
  const { data: staff = [], isLoading, isError, refetch } = useStaff();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-8 w-44 animate-pulse rounded-xl bg-surface-alt" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-surface-alt" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="space-y-3">
            <h1 className="text-2xl font-bold text-text tracking-tight">
              {t('assistant.directory_title', { defaultValue: 'Directorio de personal' })}
            </h1>
            <AssistantPortalNav />
          </header>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-text-secondary">
              {t('assistant.load_error', { defaultValue: 'No pudimos cargar la información.' })}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center rounded-xl border border-border bg-surface-alt px-4 py-2 text-sm font-medium text-text hover:bg-card"
            >
              {t('common:actions.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t('assistant.directory_title', { defaultValue: 'Directorio de personal' })}
          </h1>
          <p className="text-sm text-text-secondary">
            {t('assistant.directory_subtitle', {
              defaultValue: 'Datos de contacto del equipo. Solo lectura.',
            })}
          </p>
          <AssistantPortalNav />
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          {staff.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {t('assistant.directory_empty', { defaultValue: 'Todavía no hay personal registrado.' })}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {staff.map((member) => (
                <li key={member.id} className="py-3 flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-sm font-bold" aria-hidden="true">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">{member.name}</p>
                    {member.role_label ? (
                      <p className="text-xs text-text-secondary">{member.role_label}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      {member.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          {member.phone}
                        </span>
                      ) : null}
                      {member.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                          {member.email}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
