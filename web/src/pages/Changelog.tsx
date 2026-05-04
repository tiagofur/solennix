import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Smartphone, Monitor, Server, AppWindow } from "lucide-react";
import { changelogData } from "@/content/changelog.generated";

function platformIcon(platform: "web" | "ios" | "android" | "backend") {
  if (platform === "web") return <Monitor className="h-4 w-4" aria-hidden="true" />;
  if (platform === "ios") return <Smartphone className="h-4 w-4" aria-hidden="true" />;
  if (platform === "android") return <AppWindow className="h-4 w-4" aria-hidden="true" />;
  return <Server className="h-4 w-4" aria-hidden="true" />;
}

function platformTitle(platform: "web" | "ios" | "android" | "backend") {
  if (platform === "web") return "Web";
  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  return "Backend";
}

export const Changelog: React.FC = () => {
  const navigate = useNavigate();
  const current = changelogData.currentVersions;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-text">Changelog</h1>
          <p className="text-sm text-text-secondary mt-2">
            Historial oficial de cambios para web, iOS, Android y backend.
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Ultima actualizacion: {changelogData.updatedAt}
          </p>
        </div>

        <section className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-4">Versiones actuales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-secondary">Web</p>
              <p className="text-xl font-bold text-text">{current.web.version}</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-secondary">iOS</p>
              <p className="text-xl font-bold text-text">{current.ios.version} ({current.ios.build})</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-secondary">Android</p>
              <p className="text-xl font-bold text-text">{current.android.version} ({current.android.build})</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-secondary">Backend</p>
              <p className="text-xl font-bold text-text">{current.backend.version}</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {changelogData.releases.map((release) => (
            <article key={release.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                <span>{release.date}</span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-text">{release.title}</h2>
              <p className="text-sm text-text-secondary mt-2 mb-5">{release.summary}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["web", "ios", "android", "backend"] as const).map((platform) => (
                  <section key={platform} className="rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-text mb-3 inline-flex items-center gap-2">
                      {platformIcon(platform)}
                      {platformTitle(platform)}
                    </h3>
                    <ul className="text-sm text-text-secondary leading-relaxed space-y-2 list-disc list-inside">
                      {(release.platforms[platform] ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};
