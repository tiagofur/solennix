#ios #auth #seguridad

# Autenticación

> [!abstract] Resumen
> JWT Bearer tokens almacenados en **Keychain** (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`). Soporta email/password, Google Sign-In, Sign in with Apple, y bloqueo biométrico (Face ID/Touch ID). Refresh automático en 401.

---

## Estados de Autenticación

```mermaid
stateDiagram-v2
    [*] --> Unknown: App inicia
    Unknown --> Authenticated: checkAuth() exitoso
    Unknown --> Unauthenticated: Sin token / token inválido
    Unauthenticated --> Authenticated: Login/Register exitoso
    Authenticated --> BiometricLocked: Biometric habilitado + app resume
    BiometricLocked --> Authenticated: Face ID / Touch ID exitoso
    BiometricLocked --> Unauthenticated: 3 intentos fallidos
    Authenticated --> Unauthenticated: Logout / refresh fallido
```

---

## Flujo de Login

### Email/Password

```mermaid
sequenceDiagram
    participant UI as LoginView
    participant VM as AuthViewModel
    participant AM as AuthManager
    participant KC as KeychainHelper
    participant API as Backend

    UI->>VM: signIn(email, password)
    VM->>AM: signIn(email, password)
    AM->>API: POST /auth/login
    API-->>AM: { accessToken, refreshToken, user }
    AM->>KC: saveString("accessToken", token)
    AM->>KC: saveString("refreshToken", token)
    AM->>AM: authState = .authenticated(user)
    AM-->>UI: UI reacciona a authState
    UI->>UI: ContentView muestra MainLayout
```

### Google Sign-In

| Paso | Acción |
|------|--------|
| 1 | `GoogleSignInService.signIn()` presenta UI nativa de Google |
| 2 | Obtiene `GIDGoogleUser` con ID token |
| 3 | Envía token a `POST /auth/google` |
| 4 | Backend valida con Google y retorna JWT |
| 5 | `AuthManager` guarda tokens en Keychain |

### Sign in with Apple

| Paso | Acción |
|------|--------|
| 1 | `AppleSignInService` presenta `ASAuthorizationController` |
| 2 | Obtiene `ASAuthorizationAppleIDCredential` |
| 3 | Envía identity token + authorization code a `POST /auth/apple` |
| 4 | Backend valida y retorna JWT |
| 5 | `AuthManager` guarda tokens en Keychain |

---

## Seguridad de Tokens

| Aspecto | Implementación |
|---------|---------------|
| Almacenamiento | Keychain con `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` |
| Keys | `com.solennix.app.accessToken`, `.refreshToken` |
| No migra | Tokens NO se incluyen en backups/migrations |
| Inyección | APIClient lee directamente de KeychainHelper |
| Refresh | En 401, APIClient pide refresh a AuthManager |
| Concurrencia | Task guard previene múltiples refresh simultáneos |
| Limpieza | `logout()` borra tokens del Keychain |

---

## Bloqueo Biométrico

```mermaid
sequenceDiagram
    participant App as ContentView
    participant AM as AuthManager
    participant LA as LocalAuthentication
    participant UI as BiometricGateView

    App->>AM: checkAuth()
    AM->>AM: Tokens válidos + biometric enabled?
    AM-->>App: authState = .biometricLocked
    App->>UI: Muestra BiometricGateView
    UI->>LA: evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)
    LA-->>UI: Éxito
    UI->>AM: authenticateWithBiometrics()
    AM-->>App: authState = .authenticated(user)
```

| Configuración | Valor |
|---------------|-------|
| Policy | `.deviceOwnerAuthenticationWithBiometrics` |
| Intentos | 3 antes de fallback a unauthenticated |
| Habilitación | Toggle en Settings |
| Keychain key | `com.solennix.app.biometricUnlockEnabled` |

---

## Validación de Password

| Regla | Requisito |
|-------|-----------|
| Longitud mínima | 8 caracteres |
| Mayúscula | Al menos 1 |
| Minúscula | Al menos 1 |
| Número | Al menos 1 |

---

## Archivos Clave

| Archivo | Responsabilidad |
|---------|----------------|
| `SolennixNetwork/AuthManager.swift` | Estado auth, tokens, biometric |
| `SolennixNetwork/KeychainHelper.swift` | Storage seguro en Keychain |
| `SolennixNetwork/GoogleSignInService.swift` | OAuth Google |
| `SolennixNetwork/AppleSignInService.swift` | Sign in with Apple |
| `SolennixFeatures/Auth/ViewModels/AuthViewModel.swift` | Lógica de auth UI |
| `SolennixFeatures/Auth/Views/LoginView.swift` | Pantalla de login |
| `SolennixFeatures/Auth/Views/BiometricGateView.swift` | Gate biométrico |

---

## Relaciones

- [[Capa de Red]] — APIClient inyecta tokens automáticamente
- [[Navegación]] — AuthState determina vista inicial
- [[Módulo Settings]] — Toggle biometric, cambio password
- [[Arquitectura General]] — AuthManager inyectado en root
