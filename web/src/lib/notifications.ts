import { api } from './api';

// Firebase configuration — set these in environment variables
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messagingInstance: any = null;
let cachedPushToken: string | null = null;
let lastInitKey: string | null = null;
let foregroundUnsub: (() => void) | null = null;
let initInflight: Promise<string | null> | null = null;

/** FCM token from the last successful init, if any (used for logout cleanup). */
export function getCachedPushToken(): string | null {
  return cachedPushToken;
}

/**
 * Initialize Firebase Messaging and request notification permissions.
 * Call this after the user logs in, passing the user id.
 *
 * Idempotent per user: repeated calls for the same key reuse the existing
 * registration instead of stacking duplicate foreground listeners.
 */
export function initPushNotifications(userKey?: string): Promise<string | null> {
  // Skip if Firebase config is not set
  if (!FIREBASE_CONFIG.apiKey || !VAPID_KEY) {
    console.info('Push notifications disabled: Firebase config not set');
    return Promise.resolve(null);
  }

  // Skip if notifications are not supported
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.info('Push notifications not supported in this browser');
    return Promise.resolve(null);
  }

  const key = userKey ?? 'anonymous';
  if (messagingInstance && lastInitKey === key && cachedPushToken) {
    return Promise.resolve(cachedPushToken);
  }
  if (!initInflight) {
    initInflight = doInitPushNotifications(key).finally(() => {
      initInflight = null;
    });
  }
  return initInflight;
}

async function doInitPushNotifications(key: string): Promise<string | null> {
  try {
    // Drop the previous foreground subscription before re-registering
    // (user switch or re-init must not stack duplicate listeners).
    if (foregroundUnsub) {
      try {
        foregroundUnsub();
      } catch {
        // best-effort
      }
      foregroundUnsub = null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Push notification permission denied');
      return null;
    }

    // Dynamically import Firebase (code-split)
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

    const app = initializeApp(FIREBASE_CONFIG);
    messagingInstance = getMessaging(app);

    // Get FCM token
    const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
    if (!token) {
      console.warn('Failed to get FCM token');
      return null;
    }

    // Register token with backend
    await registerDeviceToken(token);

    // Handle foreground messages
    foregroundUnsub = onMessage(messagingInstance, (payload: any) => {
      const { title, body } = payload.notification || {};
      if (title) {
        // Show in-app notification using the browser Notification API
        new Notification(title, {
          body: body || '',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
        });
      }
    });

    cachedPushToken = token;
    lastInitKey = key;
    console.info('Push notifications initialized');
    return token;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return null;
  }
}

/**
 * Register the FCM device token with the backend.
 */
async function registerDeviceToken(token: string): Promise<void> {
  try {
    await api.post('/devices/register', {
      token,
      platform: 'web',
    });
  } catch (error) {
    console.error('Failed to register device token:', error);
  }
}

/**
 * Unregister the device token (call on logout).
 */
export async function unregisterPushNotifications(token: string): Promise<void> {
  try {
    await api.post('/devices/unregister', { token });
  } catch {
    // Silently fail — token cleanup is best-effort
  } finally {
    // Local state is stale after logout regardless of backend result.
    if (cachedPushToken === token) {
      cachedPushToken = null;
      lastInitKey = null;
    }
    if (foregroundUnsub) {
      try {
        foregroundUnsub();
      } catch {
        // best-effort
      }
      foregroundUnsub = null;
    }
  }
}
