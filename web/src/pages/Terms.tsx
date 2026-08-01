import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Terms: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['static']);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('static:terms.back')}
        </button>

        <h1 className="text-3xl font-black tracking-tight text-text mb-2">
          {t('static:terms.title')}
        </h1>
        <p className="text-sm text-text-secondary mb-10">
          {t('static:terms.last_update')}
        </p>

        {/* Section 1 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.1.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            {t('static:terms.sections.1.content')}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed mb-2">
            {t('static:terms.sections.1.list_header')}
          </p>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1 list-disc list-inside">
            {(t('static:terms.sections.1.items', { returnObjects: true }) as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Section 2 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.2.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            {t('static:terms.sections.2.content')}
          </p>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1 list-disc list-inside">
            {(t('static:terms.sections.2.items', { returnObjects: true }) as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Section 3 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.3.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            {t('static:terms.sections.3.content')}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed mb-2">
            {t('static:terms.sections.3.list_header')}
          </p>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1 list-disc list-inside">
            {(t('static:terms.sections.3.items', { returnObjects: true }) as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Section 4 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.4.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('static:terms.sections.4.content')}
          </p>
        </div>

        {/* Section 5 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.5.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('static:terms.sections.5.content')}
          </p>
        </div>

        {/* Section 6 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.6.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            {t('static:terms.sections.6.content')}
          </p>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1 list-disc list-inside">
            {(t('static:terms.sections.6.items', { returnObjects: true }) as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Section 7 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.7.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('static:terms.sections.7.content')}
          </p>
        </div>

        {/* Section 8 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.8.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('static:terms.sections.8.content')}
          </p>
        </div>

        {/* Section 9 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.9.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('static:terms.sections.9.content')}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed mt-2">
            Creapolis.Dev<br />
            <a href="mailto:hola@creapolis.dev" className="text-brand-orange hover:underline">
              hola@creapolis.dev
            </a><br />
            <a href="https://www.creapolis.dev" target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline">
              https://www.creapolis.dev
            </a>
          </p>
        </div>

        {/* Section 10 — Public profile, directory and quote requests (v2.0) */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            {t('static:terms.sections.10.title')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            {t('static:terms.sections.10.content')}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed mb-2">
            {t('static:terms.sections.10.list_header')}
          </p>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1 list-disc list-inside">
            {(t('static:terms.sections.10.items', { returnObjects: true }) as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
