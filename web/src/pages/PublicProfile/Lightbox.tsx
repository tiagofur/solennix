import React, { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface LightboxItem {
  id: string;
  src: string;
  title?: string;
  caption?: string;
}

interface LightboxProps {
  items: LightboxItem[];
  /** Index of the currently shown item. */
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

/**
 * Full-screen media lightbox with keyboard (←/→/Esc) and swipe navigation.
 * Optimized for edge-to-edge images (no chrome like the generic Modal).
 */
export const Lightbox: React.FC<LightboxProps> = ({
  items,
  index,
  onClose,
  onIndexChange,
}) => {
  const { t } = useTranslation("public");
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + items.length) % items.length);
  }, [index, items.length, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % items.length);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
      previouslyFocusedRef.current = null;
    };
  }, [onClose, goPrev, goNext]);

  if (items.length === 0) return null;
  const item = items[Math.min(index, items.length - 1)];
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 animate-fade-in"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={t("lightbox_close", { defaultValue: "Close" })}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Prev arrow */}
      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-2 sm:left-4 z-10 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={t("lightbox_previous", { defaultValue: "Previous" })}
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Next arrow */}
      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-2 sm:right-4 z-10 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={t("lightbox_next", { defaultValue: "Next" })}
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Image + caption */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={item.title || t("profile.portfolio_title")}
        tabIndex={-1}
        className="relative z-0 max-w-[92vw] max-h-[92vh] flex flex-col items-center outline-none"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          if (Math.abs(dx) > 50) {
            if (dx > 0) goPrev();
            else goNext();
          }
          touchStartX.current = null;
        }}
      >
        <img
          src={item.src}
          alt={item.title || ""}
          className="max-w-[92vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        {(item.title || item.caption) && (
          <div className="mt-3 text-center text-white/90 max-w-xl px-4">
            {item.title && (
              <p className="font-semibold text-sm">{item.title}</p>
            )}
            {item.caption && (
              <p className="text-xs text-white/70 mt-0.5">{item.caption}</p>
            )}
          </div>
        )}
        {items.length > 1 && (
          <p className="mt-2 text-xs text-white/60">
            {index + 1} / {items.length}
          </p>
        )}
      </div>
    </div>
  );
};
