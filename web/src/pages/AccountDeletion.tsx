import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

export const AccountDeletion: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['static']);
  const { user, signOut } = useAuth();
  const { addToast } = useToast();

  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDeleteAccount = async () => {
    if (!checked) return;
    setIsLoading(true);
    try {
      await api.delete('/users/me');
      setSuccess(true);
      addToast(t('static:account_deletion.success_message'), 'success');
      setTimeout(async () => {
        await signOut();
      }, 3000);
    } catch (err: any) {
      addToast(err?.message || 'Error scheduling account deletion', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('static:account_deletion.back')}
        </button>

        {success ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg space-y-6 max-w-xl mx-auto animate-in zoom-in-95 duration-300">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center text-success mx-auto">
              <Trash2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black text-text">
              {t('static:account_deletion.success_title')}
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              {t('static:account_deletion.success_message')}
            </p>
            <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cerrando sesión...</span>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black tracking-tight text-text mb-2">
              {user ? t('static:account_deletion.interactive_title') : t('static:account_deletion.title')}
            </h1>
            <p className="text-sm text-text-secondary mb-10">
              {user ? t('static:account_deletion.interactive_subtitle') : t('static:account_deletion.subtitle')}
            </p>

            <div className="bg-card border border-border rounded-2xl p-8 mb-6 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text">{t('static:account_deletion.request_title')}</h2>
                  <p className="text-sm text-text-secondary">{t('static:account_deletion.request_subtitle')}</p>
                </div>
              </div>

              <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
                <p>
                  {t('static:account_deletion.intro')}
                </p>

                <div className="bg-bg/50 rounded-xl p-4 border border-border/50">
                  <h3 className="font-semibold text-text mb-2">{t('static:account_deletion.what_happens_title')}</h3>
                  <ul className="list-disc list-inside space-y-2">
                    {(t('static:account_deletion.what_happens_items', { returnObjects: true }) as string[]).map((item, index) => (
                      <li key={index}>
                        <Trans t={t} i18nKey={`static:account_deletion.what_happens_items.${index}`}>
                          {item}
                        </Trans>
                      </li>
                    ))}
                  </ul>
                </div>

                {user ? (
                  <div className="space-y-6 pt-4 border-t border-border">
                    <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 text-xs text-warning flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{t('static:account_deletion.grace_period_warning')}</span>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setChecked(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-semibold text-text">
                        {t('static:account_deletion.confirm_checkbox')}
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={!checked || isLoading}
                      onClick={handleDeleteAccount}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-bold bg-error hover:bg-error-dark focus:ring-4 focus:ring-error/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-error/10"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('static:account_deletion.deleting')}</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          <span>{t('static:account_deletion.delete_button')}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-text mt-8 mb-2">{t('static:account_deletion.how_to_request_title')}</h3>
                    <p>
                      {t('static:account_deletion.how_to_request_desc')}
                    </p>

                    <a 
                      href={`mailto:hola@creapolis.dev?subject=${t('static:account_deletion.email_subject')}`}
                      className="flex items-center gap-3 w-full p-4 rounded-xl border border-brand-orange/20 bg-brand-orange/5 text-brand-orange font-semibold hover:bg-brand-orange/10 transition-colors"
                    >
                      <Mail className="h-5 w-5" />
                      {t('static:account_deletion.email_button')}
                    </a>

                    <p className="text-xs italic mt-4">
                      {t('static:account_deletion.footer_note')}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-text mb-3">
                {t('static:account_deletion.other_queries_title')}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                <Trans t={t} i18nKey="static:account_deletion.other_queries_desc">
                  Si solo deseas corregir información o tienes dudas sobre cómo tratamos tus datos, te invitamos a revisar nuestra{' '}
                  <button onClick={() => navigate('/privacy')} className="text-brand-orange hover:underline">
                    Política de Privacidad
                  </button>.
                </Trans>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
