import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DirectoryFilters } from "@/services/organizersDirectoryService";

const DEBOUNCE_MS = 300;

const PAGE_SIZE = 20;

/** Budget bucket keys stored in URL as `budget=`. */
export type BudgetBucket = "" | "under_1k" | "1k_5k" | "over_5k";

export function budgetBucketToRange(
  bucket: BudgetBucket,
): { min_budget?: number; max_budget?: number } {
  switch (bucket) {
    case "under_1k":
      return { max_budget: 1000 };
    case "1k_5k":
      return { min_budget: 1000, max_budget: 5000 };
    case "over_5k":
      return { min_budget: 5000 };
    default:
      return {};
  }
}

export function rangeToBudgetBucket(
  min?: number | null,
  max?: number | null,
): BudgetBucket {
  if (min == null && max === 1000) return "under_1k";
  if (min === 1000 && max === 5000) return "1k_5k";
  if (min === 5000 && max == null) return "over_5k";
  return "";
}

/**
 * Reads/writes the directory filters from the URL search params (#1117 / #1128).
 * URL is the single source of truth — shareable, bookmarkable, restored on reload.
 */
export function useDirectoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const city = searchParams.get("city") ?? "";
  const eventType = searchParams.get("event_type") ?? "";
  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const serviceCategory = searchParams.get("service_category") ?? "";
  const availableOn = searchParams.get("available_on") ?? "";
  const budgetParam = (searchParams.get("budget") ?? "") as BudgetBucket;
  const minBudgetRaw = searchParams.get("min_budget");
  const maxBudgetRaw = searchParams.get("max_budget");

  const [inputValues, setInputValues] = useState({
    city,
    q,
  });

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

  const setServiceCategory = useCallback(
    (value: string) => updateParam("service_category", value.trim()),
    [updateParam],
  );

  const setAvailableOn = useCallback(
    (value: string) => updateParam("available_on", value.trim()),
    [updateParam],
  );

  const setBudgetBucket = useCallback(
    (bucket: BudgetBucket) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("min_budget");
          next.delete("max_budget");
          next.delete("budget");
          next.delete("page");
          if (!bucket) return next;
          next.set("budget", bucket);
          const range = budgetBucketToRange(bucket);
          if (range.min_budget != null) next.set("min_budget", String(range.min_budget));
          if (range.max_budget != null) next.set("max_budget", String(range.max_budget));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setRadiusKm = useCallback(
    (value: string) => updateParam("radius_km", value),
    [updateParam],
  );

  const clear = useCallback(() => {
    setSearchParams({}, { replace: true });
    setInputValues({ city: "", q: "" });
  }, [setSearchParams]);

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

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusKm = searchParams.get("radius_km");

  const minBudget =
    minBudgetRaw != null && minBudgetRaw !== ""
      ? parseFloat(minBudgetRaw)
      : budgetBucketToRange(budgetParam).min_budget;
  const maxBudget =
    maxBudgetRaw != null && maxBudgetRaw !== ""
      ? parseFloat(maxBudgetRaw)
      : budgetBucketToRange(budgetParam).max_budget;

  const budgetBucket: BudgetBucket =
    budgetParam || rangeToBudgetBucket(minBudget, maxBudget);

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
      min_budget: minBudget != null && !Number.isNaN(minBudget) ? minBudget : undefined,
      max_budget: maxBudget != null && !Number.isNaN(maxBudget) ? maxBudget : undefined,
      service_category: serviceCategory || undefined,
      available_on: availableOn || undefined,
    }),
    [
      debouncedCity,
      debouncedQ,
      eventType,
      sort,
      page,
      lat,
      lng,
      radiusKm,
      minBudget,
      maxBudget,
      serviceCategory,
      availableOn,
    ],
  );

  type GeoErrorKey = "error_unsupported" | "error_denied" | "error_generic";

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
            if (!next.get("radius_km")) next.set("radius_km", "50");
            next.set("sort", "distance");
            next.delete("page");
            return next;
          },
          { replace: true },
        );
      },
      (err) => {
        setGeoLoading(false);
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

  const clearFilter = useCallback(
    (key: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (key === "budget") {
            next.delete("budget");
            next.delete("min_budget");
            next.delete("max_budget");
          } else if (key === "geo") {
            next.delete("lat");
            next.delete("lng");
            next.delete("radius_km");
            if (next.get("sort") === "distance") next.delete("sort");
          } else {
            next.delete(key);
          }
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    inputValues,
    eventType,
    sort,
    page,
    filters,
    serviceCategory,
    availableOn,
    budgetBucket,
    radiusKm: radiusKm ?? "",
    geoLoading,
    geoError,
    isGeoActive: Boolean(lat && lng),
    setCity,
    setQ,
    setEventType,
    setSort,
    setPage,
    setServiceCategory,
    setAvailableOn,
    setBudgetBucket,
    setRadiusKm,
    useNearMe,
    clearGeo,
    clearFilter,
    clear,
  };
}
