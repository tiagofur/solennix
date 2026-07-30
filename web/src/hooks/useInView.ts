import { useEffect, useRef, useState } from "react";

/**
 * IntersectionObserver-based hook that reports whether an element has entered
 * the viewport. Once revealed it stays revealed (no re-hide on scroll up).
 *
 * Content is considered visible by default (no-JS / SSR safe): the observer
 * is only attached in an effect, so before hydration / without JS the element
 * renders normally. Callers apply the hidden initial style only after mount.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion: reveal immediately, no observation needed.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }

    // En environments without IntersectionObserver (jsdom / very old browsers),
    // reveal immediately rather than crashing.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px", ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return [ref, inView];
}
