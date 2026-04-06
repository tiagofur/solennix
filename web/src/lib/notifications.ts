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

/**
 * Initialize Firebase Messaging and request notification permissions.
 * Call this after the user logs in.
 */
export async function initPushNotifications(): Promise<string | null> {
  // Skip if Firebase config is not set
  if (!FIREBASE_CONFIG.apiKey || !VAPID_KEY) {
    console.info('Push notifications disabled: Firebase config not set');
    return null;
  }

  // Skip if notifications are not supported
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.info('Push notifications not supported in this browser');
    return null;
  }

  try {
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
    onMessage(messagingInstance, (payload: any) => {
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
  }
}
