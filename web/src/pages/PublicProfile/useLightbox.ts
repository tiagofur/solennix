import { useState } from "react";
import type { LightboxItem } from "./Lightbox";

/** Convenience hook to drive a Lightbox from a list of items. */
export function useLightbox(items: LightboxItem[]) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return {
    isOpen: openIndex !== null,
    index: openIndex ?? 0,
    items,
    open: (i: number) => setOpenIndex(i),
    close: () => setOpenIndex(null),
    setIndex: setOpenIndex,
  };
}
