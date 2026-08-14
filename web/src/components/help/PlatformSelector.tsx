import React from "react";
import { AppWindow, Monitor, Smartphone } from "lucide-react";
import {
  MANUAL_PLATFORMS,
  type ManualPlatform,
} from "@/content/userManual";

const ICONS: Record<ManualPlatform, React.ReactNode> = {
  web: <Monitor className="h-4 w-4" aria-hidden />,
  ios: <Smartphone className="h-4 w-4" aria-hidden />,
  android: <AppWindow className="h-4 w-4" aria-hidden />,
};

interface PlatformSelectorProps {
  value: ManualPlatform;
  onChange: (platform: ManualPlatform) => void;
  labels: Record<ManualPlatform, string>;
  legend: string;
  hint?: string;
  className?: string;
}

export function PlatformSelector({
  value,
  onChange,
  labels,
  legend,
  hint,
  className = "",
}: PlatformSelectorProps) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">
        {legend}
      </p>
      <div
        role="tablist"
        aria-label={legend}
        className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm"
      >
        {MANUAL_PLATFORMS.map((platform) => {
          const selected = value === platform;
          return (
            <button
              key={platform}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(platform)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                selected
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:bg-surface-alt hover:text-text"
              }`}
            >
              {ICONS[platform]}
              {labels[platform]}
            </button>
          );
        })}
      </div>
      {hint ? (
        <p className="mt-2 text-xs text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
