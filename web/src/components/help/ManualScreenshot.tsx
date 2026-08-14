import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import {
  manualImageSrc,
  type ManualPlatform,
} from "@/content/userManual";

interface ManualScreenshotProps {
  platform: ManualPlatform;
  filename: string;
  alt: string;
  ready: boolean;
  pendingTitle: string;
  pendingBody: string;
  platformLabel: string;
}

export function ManualScreenshot({
  platform,
  filename,
  alt,
  ready,
  pendingTitle,
  pendingBody,
  platformLabel,
}: ManualScreenshotProps) {
  const [failed, setFailed] = useState(false);
  const src = manualImageSrc(platform, filename);
  const showImage = ready && !failed;

  if (!showImage) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-alt px-6 py-12 text-center"
        role="img"
        aria-label={pendingTitle}
      >
        <ImageOff className="h-8 w-8 text-text-secondary" aria-hidden />
        <p className="text-sm font-semibold text-text">{pendingTitle}</p>
        <p className="max-w-md text-xs text-text-secondary">
          {pendingBody.replace("{platform}", platformLabel)}
        </p>
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-auto object-cover object-top max-h-[min(70vh,720px)]"
        onError={() => setFailed(true)}
      />
    </figure>
  );
}
