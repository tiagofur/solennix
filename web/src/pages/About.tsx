import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Globe, Mail, FileText, Shield, Heart, History, HelpCircle } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

const APP_VERSION = '1.0.0';

export const About: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['static']);

  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('static:about.back')}
        </button>

        {/* Logo & Version */}
        <div className="flex flex-col items-center mb-10">
          <img 
            src="/favicon.svg" 
            alt="Solennix Logo" 
            className="w-28 h-28 mb-4 drop-shadow-lg"
          />
          <h1 className="text-3xl font-bold text-text">Solennix</h1>
          <p className="text-sm text-text-secondary mt-1">
            {t('static:about.version')} {APP_VERSION}
          </p>
        </div>

        {/* Developer info */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            {t('static:about.developed_by')}
          </h2>
          <p className="text-xl font-bold text-text mb-4">
            Creapolis.Dev
          </p>

          <div className="border-t border-border my-4" />

          <a
            href="https://www.creapolis.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-2 text-primary hover:underline"
          >
            <Globe className="h-5 w-5" />
            <span className="text-sm font-medium">www.creapolis.dev</span>
          </a>

          <a
            href="mailto:creapolis.mx@gmail.com"
            className="flex items-center gap-3 py-2 text-primary hover:underline"
          >
            <Mail className="h-5 w-5" />
            <span className="text-sm font-medium">creapolis.mx@gmail.com</span>
          </a>
        </div>

        {/* Legal */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            {t('static:about.legal')}
          </h2>

          <Link
            to="/terms"
            className="flex items-center gap-3 py-2 text-primary hover:underline"
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">{t('static:about.terms')}</span>
          </Link>

          <Link
            to="/privacy"
            className="flex items-center gap-3 py-2 text-primary hover:underline"
          >
            <Shield className="h-5 w-5" />
            <span className="text-sm font-medium">{t('static:about.privacy')}</span>
          </Link>

          <Link
            to="/changelog"
            className="flex items-center gap-3 py-2 text-primary hover:underline"
          >
            <History className="h-5 w-5" />
            <span className="text-sm font-medium">Changelog</span>
          </Link>

          <Link
            to="/help"
            className="flex items-center gap-3 py-2 text-primary hover:underline"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{t('static:about.help')}</span>
          </Link>
        </div>

        {/* About the app */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            {t('static:about.about_app')}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('static:about.description')}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-xs text-text-secondary flex items-center justify-center gap-1">
            <Trans
              i18nKey="static:about.footer"
              values={{ heart: '' }}
              components={{
                heart: <Heart className="h-3 w-3 text-error fill-error" />
              }}
            />
          </p>
        </div>
      </div>
    </div>
  );
};
