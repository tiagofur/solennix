import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiPost = vi.fn();
const initializeAppMock = vi.fn();
const getMessagingMock = vi.fn();
const getTokenMock = vi.fn();
const onMessageMock = vi.fn();

vi.mock('./api', () => ({
  api: {
    post: (...args: any[]) => mockApiPost(...args),
  },
}));

vi.mock('firebase/app', () => ({
  initializeApp: (...args: any[]) => initializeAppMock(...args),
}));

vi.mock('firebase/messaging', () => ({
  getMessaging: (...args: any[]) => getMessagingMock(...args),
  getToken: (...args: any[]) => getTokenMock(...args),
  onMessage: (...args: any[]) => onMessageMock(...args),
}));

function setFirebaseEnv(enabled: boolean) {
  if (enabled) {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'domain');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'project');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'sender');
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app');
    vi.stubEnv('VITE_FIREBASE_VAPID_KEY', 'vapid');
    return;
  }

  vi.stubEnv('VITE_FIREBASE_API_KEY', '');
  vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', '');
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');
  vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '');
  vi.stubEnv('VITE_FIREBASE_APP_ID', '');
  vi.stubEnv('VITE_FIREBASE_VAPID_KEY', '');
}

function setupBrowserSupport(permission: NotificationPermission = 'granted') {
  const NotificationMock = vi.fn() as any;
  NotificationMock.requestPermission = vi.fn().mockResolvedValue(permission);

  Object.defineProperty(window, 'Notification', {
    value: NotificationMock,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(navigator, 'serviceWorker', {
    value: {},
    configurable: true,
    writable: true,
  });

  return NotificationMock;
}

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns null when Firebase env config is missing', async () => {
    setFirebaseEnv(false);
    setupBrowserSupport('granted');

    const { initPushNotifications } = await import('./notifications');
    await expect(initPushNotifications()).resolves.toBeNull();

    expect(initializeAppMock).not.toHaveBeenCalled();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('returns null when Notification or service worker is unsupported', async () => {
    setFirebaseEnv(true);
    Reflect.deleteProperty(window, 'Notification');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { initPushNotifications } = await import('./notifications');
    await expect(initPushNotifications()).resolves.toBeNull();

    expect(initializeAppMock).not.toHaveBeenCalled();
  });

  it('returns null when permission is denied', async () => {
    setFirebaseEnv(true);
    const NotificationMock = setupBrowserSupport('denied');

    const { initPushNotifications } = await import('./notifications');
    await expect(initPushNotifications()).resolves.toBeNull();

    expect(NotificationMock.requestPermission).toHaveBeenCalledTimes(1);
    expect(initializeAppMock).not.toHaveBeenCalled();
  });

  it('returns null when FCM token cannot be acquired', async () => {
    setFirebaseEnv(true);
    setupBrowserSupport('granted');

    initializeAppMock.mockReturnValue({ app: true });
    getMessagingMock.mockReturnValue({ messaging: true });
    getTokenMock.mockResolvedValue('');

    const { initPushNotifications } = await import('./notifications');
    await expect(initPushNotifications()).resolves.toBeNull();

    expect(getTokenMock).toHaveBeenCalledTimes(1);
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('initializes messaging, registers token and shows foreground notifications', async () => {
    setFirebaseEnv(true);
    const NotificationMock = setupBrowserSupport('granted');

    initializeAppMock.mockReturnValue({ app: true });
    getMessagingMock.mockReturnValue({ messaging: true });
    getTokenMock.mockResolvedValue('token-123');
    mockApiPost.mockResolvedValue({ ok: true });

    const { initPushNotifications } = await import('./notifications');
    await expect(initPushNotifications()).resolves.toBe('token-123');

    expect(mockApiPost).toHaveBeenCalledWith('/devices/register', {
      token: 'token-123',
      platform: 'web',
    });
    expect(onMessageMock).toHaveBeenCalledTimes(1);

    const onMessageHandler = onMessageMock.mock.calls[0][1];
    onMessageHandler({ notification: { title: 'Hola', body: 'Mundo' } });
    onMessageHandler({ notification: { title: 'Sin cuerpo' } });
    onMessageHandler({});

    expect(NotificationMock).toHaveBeenCalledWith('Hola', {
      body: 'Mundo',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    });
    expect(NotificationMock).toHaveBeenCalledWith('Sin cuerpo', {
      body: '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    });
    expect(NotificationMock).toHaveBeenCalledTimes(2);
  });

  it('returns null when firebase initialization throws', async () => {
    setFirebaseEnv(true);
    setupBrowserSupport('granted');

    initializeAppMock.mockImplementation(() => {
      throw new Error('firebase init failed');
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { initPushNotifications } = await import('./notifications');
    await expect(initPushNotifications()).resolves.toBeNull();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize push notifications:',
      expect.any(Error),
    );
  });

  it('keeps initialization successful when token registration fails', async () => {
    setFirebaseEnv(true);
    setupBrowserSupport('granted');

    initializeAppMock.mockReturnValue({ app: true });
    getMessagingMock.mockReturnValue({ messaging: true });
    getTokenMock.mockResolvedValue('token-456');
    mockApiPost.mockRejectedValue(new Error('register failed'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { initPushNotifications } = await import('./notifications');
    await expect(initPushNotifications()).resolves.toBe('token-456');

    expect(mockApiPost).toHaveBeenCalledWith('/devices/register', {
      token: 'token-456',
      platform: 'web',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to register device token:',
      expect.any(Error),
    );
  });

  it('unregisterPushNotifications posts token to unregister endpoint', async () => {
    setFirebaseEnv(true);
    setupBrowserSupport('granted');
    mockApiPost.mockResolvedValue({ ok: true });

    const { unregisterPushNotifications } = await import('./notifications');
    await unregisterPushNotifications('token-xyz');

    expect(mockApiPost).toHaveBeenCalledWith('/devices/unregister', {
      token: 'token-xyz',
    });
  });

  it('unregisterPushNotifications swallows backend errors', async () => {
    setFirebaseEnv(true);
    setupBrowserSupport('granted');
    mockApiPost.mockRejectedValue(new Error('network'));

    const { unregisterPushNotifications } = await import('./notifications');
    await expect(unregisterPushNotifications('token-xyz')).resolves.toBeUndefined();
  });

  it('S4: repeated init with same user key registers one onMessage and reuses token', async () => {
    setFirebaseEnv(true);
    setupBrowserSupport('granted');

    initializeAppMock.mockReturnValue({ app: true });
    getMessagingMock.mockReturnValue({ messaging: true });
    getTokenMock.mockResolvedValue('token-123');
    mockApiPost.mockResolvedValue({ ok: true });

    const { initPushNotifications } = await import('./notifications');
    await expect(initPushNotifications('user-a')).resolves.toBe('token-123');
    await expect(initPushNotifications('user-a')).resolves.toBe('token-123');

    expect(getTokenMock).toHaveBeenCalledTimes(1);
    expect(onMessageMock).toHaveBeenCalledTimes(1);
    expect(mockApiPost).toHaveBeenCalledTimes(1);
  });

  it('S4: init for a different user unsubscribes previous foreground listener', async () => {
    setFirebaseEnv(true);
    setupBrowserSupport('granted');

    initializeAppMock.mockReturnValue({ app: true });
    getMessagingMock.mockReturnValue({ messaging: true });
    getTokenMock.mockResolvedValueOnce('token-a').mockResolvedValueOnce('token-b');
    mockApiPost.mockResolvedValue({ ok: true });
    const unsub = vi.fn();
    onMessageMock.mockImplementation(() => unsub);

    const { initPushNotifications } = await import('./notifications');
    await initPushNotifications('user-a');
    await initPushNotifications('user-b');

    expect(unsub).toHaveBeenCalledTimes(1);
    expect(onMessageMock).toHaveBeenCalledTimes(2);
  });

  it('S3: unregister clears cached token even when backend fails, avoiding double POST', async () => {
    setFirebaseEnv(true);
    setupBrowserSupport('granted');

    initializeAppMock.mockReturnValue({ app: true });
    getMessagingMock.mockReturnValue({ messaging: true });
    getTokenMock.mockResolvedValue('token-123');
    mockApiPost.mockImplementation((url: string) =>
      url === '/devices/register' ? Promise.resolve({ ok: true }) : Promise.reject(new Error('down')),
    );

    const { initPushNotifications, getCachedPushToken, unregisterPushNotifications } =
      await import('./notifications');
    await initPushNotifications('user-a');
    expect(getCachedPushToken()).toBe('token-123');

    await expect(unregisterPushNotifications('token-123')).resolves.toBeUndefined();
    expect(getCachedPushToken()).toBeNull();

    // Second signOut-sized call must not re-POST the stale token.
    const calls = mockApiPost.mock.calls.filter(([u]) => u === '/devices/unregister');
    expect(calls).toHaveLength(1);
  });
});
