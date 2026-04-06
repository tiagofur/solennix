import React, { useState, useCallback } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Extra classes for the shimmer placeholder (same size/shape as the image) */
  placeholderClassName?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

/**
 * Image with shimmer placeholder while loading and fade-in on appear.
 * Falls back to hiding if the image fails to load.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  placeholderClassName,
  loading = "lazy",
  onClick,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    setLoaded(true);
    setError(true);
  }, []);

  if (error) return null;

  return (
    <div className={`relative overflow-hidden ${placeholderClassName ?? className}`}>
      {!loaded && (
        <div
          className={`absolute inset-0 animate-shimmer rounded-[inherit]`}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
      />
    </div>
  );
};
