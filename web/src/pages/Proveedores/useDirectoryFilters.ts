import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DirectoryFilters } from "@/services/organizersDirectoryService";

const DEBOUNCE_MS = 300;

const PAGE_SIZE = 20;

/**
 * Reads/writes the directory filters from the URL search params (#1117, design D3).
 * URL is the single source of truth — shareable, bookmarkable, restored on reload.
 *
 * Text inputs (city, q) are debounced by DEBOUNCE_MS so the query only fires after
 * the visitor stops typing (design D4). The event_type select and page changes
 * apply immediately.
 *
 * Returns:
 *   - inputValues: the live (un-debounced) values for controlled inputs.
 *   - debouncedFilters: the values actually used to drive the query (debounced).
 *   - setters: setInput/setEventType/setQ/setPage/clear.
 */
export function useDirectoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Live input values (controlled inputs render against these).
  const city = searchParams.get("city") ?? "";
  const eventType = searchParams.get("event_type") ?? "";
  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;

  const [inputValues, setInputValues] = useState({
    city,
    q,
  });

  // Keep inputValues in sync if the URL changes externally (back/forward, clear).
  useEffect(() => {
    setInputValues({ city, q });
  }, [city, q]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
          // Any filter change resets pagination to page 1 (except page itself).
          if (key !== "page") next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setCity = useCallback(
    (value: string) => {
      setInputValues((s) => ({ ...s, city: value }));
      updateParam("city", value.trim());
    },
    [updateParam],
  );

  const setQ = useCallback(
    (value: string) => {
      setInputValues((s) => ({ ...s, q: value }));
      updateParam("q", value.trim());
    },
    [updateParam],
  );

  const setEventType = useCallback(
    (value: string) => updateParam("event_type", value),
    [updateParam],
  );

  const setSort = useCallback(
    (value: string) => updateParam("sort", value),
    [updateParam],
  );

  const setPage = useCallback(
    (value: number) => updateParam("page", value > 1 ? String(value) : ""),
    [updateParam],
  );

  const clear = useCallback(() => {
    setSearchParams({}, { replace: true });
    setInputValues({ city: "", q: "" });
  }, [setSearchParams]);

  // Debounce the text inputs so the query only fires after typing pauses (D4).
  const [debouncedCity, setDebouncedCity] = useState(city);
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedCity(inputValues.city), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [inputValues.city]);
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQ(inputValues.q), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [inputValues.q]);

  // Geo: read lat/lng/radius from URL (set by "near me" button).
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusKm = searchParams.get("radius_km");

  const filters: DirectoryFilters = useMemo(
    () => ({
      city: debouncedCity.trim() || undefined,
      event_type: eventType || undefined,
      q: debouncedQ.trim() || undefined,
      sort: sort || undefined,
      page,
      limit: PAGE_SIZE,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius_km: radiusKm ? parseFloat(radiusKm) : undefined,
    }),
    [debouncedCity, debouncedQ, eventType, sort, page, lat, lng, radiusKm],
  );

  // Geo error keys (translated in ProveedoresPage via directory.geo.*).
  type GeoErrorKey = "error_unsupported" | "error_denied" | "error_generic";

  // "Near me" — requests browser geolocation, sets lat/lng/radius/sort=distance in URL.
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<GeoErrorKey | null>(null);

  const useNearMe = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("error_unsupported");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("lat", pos.coords.latitude.toFixed(4));
            next.set("lng", pos.coords.longitude.toFixed(4));
            // Backend default radius matches; pin it in URL for shareability.
            next.set("radius_km", "50");
            next.set("sort", "distance");
            next.delete("page");
            return next;
          },
          { replace: true },
        );
      },
      (err) => {
        setGeoLoading(false);
        // GeolocationPositionError.PERMISSION_DENIED === 1
        setGeoError(err.code === 1 ? "error_denied" : "error_generic");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [setSearchParams]);

  const clearGeo = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("lat");
        next.delete("lng");
        next.delete("radius_km");
        if (next.get("sort") === "distance") next.delete("sort");
        return next;
      },
      { replace: true },
    );
    setGeoError(null);
  }, [setSearchParams]);

  return {
    inputValues,
    eventType,
    sort,
    page,
    filters,
    geoLoading,
    geoError,
    isGeoActive: Boolean(lat && lng),
    setCity,
    setQ,
    setEventType,
    setSort,
    setPage,
    useNearMe,
    clearGeo,
    clear,
  };
}
