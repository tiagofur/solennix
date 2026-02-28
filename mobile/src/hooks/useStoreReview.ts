import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";
import { logError } from "../lib/errorHandler";

const STORE_KEY = "store_review_actions";
const PDF_THRESHOLD = 3;
const EVENT_THRESHOLD = 5;

interface ReviewActions {
  pdfsShared: number;
  eventsCreated: number;
  prompted: boolean;
}

async function getActions(): Promise<ReviewActions> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return { pdfsShared: 0, eventsCreated: 0, prompted: false };
}

async function saveActions(actions: ReviewActions): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(actions));
}

async function maybeRequestReview(actions: ReviewActions): Promise<void> {
  if (actions.prompted) return;

  const shouldPrompt =
    actions.pdfsShared >= PDF_THRESHOLD || actions.eventsCreated >= EVENT_THRESHOLD;

  if (!shouldPrompt) return;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return;

  actions.prompted = true;
  await saveActions(actions);
  await StoreReview.requestReview();
}

/**
 * Hook that tracks user actions and triggers the App Store / Play Store
 * review prompt after thresholds are met (3 PDFs shared or 5 events created).
 * Respects OS rate limits — only prompts once.
 */
export function useStoreReview() {
  const trackPdfShared = useCallback(async () => {
    try {
      const actions = await getActions();
      actions.pdfsShared += 1;
      await saveActions(actions);
      await maybeRequestReview(actions);
    } catch (err) {
      logError("useStoreReview.trackPdfShared", err);
    }
  }, []);

  const trackEventCreated = useCallback(async () => {
    try {
      const actions = await getActions();
      actions.eventsCreated += 1;
      await saveActions(actions);
      await maybeRequestReview(actions);
    } catch (err) {
      logError("useStoreReview.trackEventCreated", err);
    }
  }, []);

  return { trackPdfShared, trackEventCreated };
}
