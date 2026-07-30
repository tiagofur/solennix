import React, { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";
import clsx from "clsx";

interface RevealProps {
  children: React.ReactNode;
  /** Extra classes on the wrapper. */
  className?: string;
  /** Render as a different element (default div). */
  as?: React.ElementType;
  /** Delay in ms before the animation starts (stagger). */
  delay?: number;
}

/**
 * Wraps content and fades it up when it scrolls into view. Respects
 * prefers-reduced-motion (reveals immediately). Content is visible by default
 * until JS mounts the observer, so it degrades gracefully without JS.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  as: Tag = "div",
  delay = 0,
}) => {
  const [mounted, setMounted] = useState(false);
  const [ref, inView] = useInView<HTMLDivElement>();

  useEffect(() => setMounted(true), []);

  // Before mount (no-JS / SSR) content renders visible. After mount, hide
  // pre-reveal so the fade-in is visible.
  const isHidden = mounted && !inView;

  return (
    <Tag
      ref={ref}
      className={clsx(className, isHidden ? "opacity-0" : "animate-fade-in-up")}
      style={isHidden ? undefined : { animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
};
