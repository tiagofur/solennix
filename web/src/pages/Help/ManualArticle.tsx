import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import {
  getLocalizedArticle,
  getManualArticle,
  MANUAL_ARTICLES,
  MANUAL_UI,
  nextArticleSlug,
  prevArticleSlug,
  type ManualLang,
} from "@/content/userManual";
import { PlatformSelector } from "@/components/help/PlatformSelector";
import { ManualScreenshot } from "@/components/help/ManualScreenshot";
import { useManualPlatform } from "@/hooks/useManualPlatform";

export function ManualArticle() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const lang: ManualLang = i18n.language.startsWith("en") ? "en" : "es";
  const ui = MANUAL_UI[lang];
  const { platform, setPlatform } = useManualPlatform();

  const article = getManualArticle(slug);
  if (!article) {
    return <Navigate to="/help/manual" replace />;
  }

  const loc = getLocalizedArticle(article, lang);
  const total = MANUAL_ARTICLES.length;
  const prev = prevArticleSlug(slug);
  const next = nextArticleSlug(slug);
  const stepLabel = ui.stepOf
    .replace("{n}", String(article.order))
    .replace("{total}", String(total));
  const screenshotsReady = Boolean(article.screenshotsReady[platform]);

  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/help/manual"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {ui.backToManual}
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {stepLabel}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-text">
            {loc.title}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{loc.description}</p>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PlatformSelector
          value={platform}
          onChange={setPlatform}
          labels={ui.platforms}
          legend={ui.platformLabel}
          hint={ui.platformHint}
        />

        <p className="text-base leading-relaxed text-text">{loc.intro}</p>

        {loc.why ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
              {ui.why}
            </p>
            <p className="text-sm text-text">{loc.why}</p>
          </div>
        ) : null}

        <ol className="space-y-10">
          {loc.steps.map((step, index) => {
            const callout = step.callouts?.[platform];
            const alt = `${loc.title} — ${index + 1}`;
            return (
              <li key={`${article.slug}-${index}`} className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-text leading-relaxed">{step.text}</p>
                </div>
                {callout ? (
                  <p className="ml-11 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text">
                    <span className="font-semibold text-primary">
                      {ui.platforms[platform]}:{" "}
                    </span>
                    {callout}
                  </p>
                ) : null}
                {step.image ? (
                  <div className="ml-0 sm:ml-11">
                    <ManualScreenshot
                      platform={platform}
                      filename={step.image}
                      alt={alt}
                      ready={screenshotsReady}
                      pendingTitle={ui.screenshotPending}
                      pendingBody={ui.screenshotPendingBody}
                      platformLabel={ui.platforms[platform]}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        {loc.tip ? (
          <div className="flex gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <Lightbulb className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                {ui.tip}
              </p>
              <p className="text-sm text-text leading-relaxed">{loc.tip}</p>
            </div>
          </div>
        ) : null}

        <nav
          className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-8"
          aria-label="Article navigation"
        >
          {prev ? (
            <Link
              to={`/help/manual/${prev}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text transition hover:bg-card"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {ui.prev}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to={`/help/manual/${next}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {ui.next}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <Link
              to="/help/manual"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {ui.backToManual}
            </Link>
          )}
        </nav>
      </article>
    </div>
  );
}
