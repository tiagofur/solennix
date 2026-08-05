import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import {
  articlesByJourney,
  MANUAL_ARTICLES,
  MANUAL_JOURNEYS,
  MANUAL_UI,
  type ManualJourneyId,
  type ManualLang,
} from "@/content/userManual";
import { PlatformSelector } from "@/components/help/PlatformSelector";
import { useManualPlatform } from "@/hooks/useManualPlatform";

const JOURNEY_ORDER: ManualJourneyId[] = ["first-quote", "day-to-day"];

export function ManualIndex() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang: ManualLang = i18n.language.startsWith("en") ? "en" : "es";
  const ui = MANUAL_UI[lang];
  const { platform, setPlatform } = useManualPlatform();
  const firstSlug =
    articlesByJourney("first-quote")[0]?.slug ??
    MANUAL_ARTICLES[0]?.slug ??
    "que-es-solennix";
  const totalMin = MANUAL_ARTICLES.reduce((sum, a) => sum + a.durationMin, 0);

  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Link
              to="/help"
              className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              ← {ui.backToHelp}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="w-7 h-7" aria-hidden />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-text">
                {ui.hubTitle}
              </h1>
              <p className="mt-1 text-text-secondary">{ui.hubSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <PlatformSelector
          value={platform}
          onChange={setPlatform}
          labels={ui.platforms}
          legend={ui.platformLabel}
          hint={ui.platformHint}
        />

        {JOURNEY_ORDER.map((journeyId) => {
          const meta = MANUAL_JOURNEYS[journeyId][lang];
          const articles = articlesByJourney(journeyId);
          if (articles.length === 0) return null;
          const journeyMin = articles.reduce((s, a) => s + a.durationMin, 0);
          const isPrimary = journeyId === "first-quote";

          return (
            <section key={journeyId} className="space-y-4">
              <div
                className={`rounded-2xl border bg-card p-6 sm:p-8 shadow-sm ${
                  isPrimary ? "border-primary/25" : "border-border"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                  {meta.title}
                </p>
                <h2 className="text-2xl font-bold text-text">{meta.name}</h2>
                <p className="mt-2 text-text-secondary max-w-2xl">{meta.desc}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                    <Clock className="h-4 w-4" aria-hidden />~{journeyMin}{" "}
                    {ui.minutes}
                  </span>
                  {isPrimary ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/help/manual/${firstSlug}`)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      {ui.startCta}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>

              <ol className="space-y-3">
                {articles.map((article) => {
                  const loc = lang === "en" ? article.en : article.es;
                  const shotReady = Boolean(article.screenshotsReady[platform]);
                  return (
                    <li key={article.slug}>
                      <Link
                        to={`/help/manual/${article.slug}`}
                        className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                          {article.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-text">
                              {loc.title}
                            </h3>
                            <span className="text-xs text-text-secondary">
                              {article.durationMin} {ui.minutes}
                            </span>
                            {!shotReady ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-surface-alt px-2 py-0.5 text-text-secondary">
                                {ui.screenshotPending}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">
                            {loc.description}
                          </p>
                        </div>
                        <ArrowRight
                          className="mt-2 h-5 w-5 shrink-0 text-primary"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}

        <p className="text-xs text-text-secondary text-center">
          ~{totalMin} {ui.minutes} · {MANUAL_ARTICLES.length}{" "}
          {lang === "en" ? "guides" : "guías"}
        </p>
      </div>
    </div>
  );
}
