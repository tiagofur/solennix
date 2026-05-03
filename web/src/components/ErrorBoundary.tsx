import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback to show instead of default error UI */
  fallback?: React.ReactNode;
  /** Called when an error is caught — use for external reporting */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 py-12 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-6">
        <AlertTriangle className="h-8 w-8 text-error" aria-hidden="true" />
      </div>

      <h1 className="text-xl font-bold text-text mb-2">{t('error.generic')}</h1>
      <p className="text-sm text-text-secondary max-w-md mb-6">
        {t('error.unexpected')}
      </p>

      {error && (
        <details className="mb-6 max-w-md w-full">
          <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors">
            {t('error.technical_details')}
          </summary>
          <pre className="mt-2 p-3 bg-surface-alt rounded-xl text-xs text-text-secondary overflow-auto max-h-32 text-left border border-border">
            {error.message}
          </pre>
        </details>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl text-white premium-gradient shadow-sm hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          {t('retry')}
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl text-text-secondary bg-card border border-border hover:bg-surface-alt transition-colors"
        >
          <Home className="h-4 w-4 mr-2" aria-hidden="true" />
          {t('go_home')}
        </a>
      </div>
    </div>
  );
}
