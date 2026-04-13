# Current Status — Solennix

**Last Updated:** 2026-04-12  
**Status:** Core authentication complete across all platforms. Ready for next phase.

---

## Authentication Status

### Google Sign-In ✅

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** | ✅ Complete | `signInWithGoogle()` in AuthViewModel. Validated with test devices. |
| **Android** | ✅ Complete | `GoogleSignInButton` composite + `viewModel.loginWithGoogle()`. Production-ready. |
| **Web** | ✅ Complete | Custom styled button using Google One Tap flow. Refactored 2026-04-12 for improved UX. |
| **Backend** | ✅ Complete | `GoogleSignIn()` handler validates ID tokens. Sets `auth_token` httpOnly cookie. |

**Implementation Details:**
- All platforms validate `id_token` server-side
- Backend creates or updates user on first sign-in
- JWT tokens generated + httpOnly cookie set
- No issues on staging (`api.solennix.com`)

---

### Apple Sign-In ✅

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** | ✅ Complete | `signInWithApple()` in AuthViewModel. Uses native `SignInWithAppleButton`. Compliant with App Store. |
| **Android** | ✅ Complete | `AppleSignInButton` composite via Sign In with Apple SDK. Works on all API levels 26+. |
| **Web** | ✅ Complete | `AppleSignInButton` using AppleID.auth SDK. Handles Private Relay emails + shows notice. |
| **Backend** | ✅ Complete | `AppleSignIn()` handler validates identity tokens. Sets `auth_token` httpOnly cookie. |

**Implementation Details:**
- iOS: App Store compliant (free trial disclosure, EULA/Privacy links visible)
- Android: Uses official Apple SDK (no Play Billing conflicts)
- Web: Detects Private Relay emails, shows user notice
- Backend: Supports optional `authorization_code` for future refresh token rotation

---

## Platform Parity Matrix

```
Feature                | iOS | Android | Web | Backend
-----------            | --- | ------- | --- | -------
Google Sign-In         | ✅  | ✅      | ✅  | ✅
Apple Sign-In          | ✅  | ✅      | ✅  | ✅
Email/Password Login   | ✅  | ✅      | ✅  | ✅
JWT Refresh Tokens     | ✅  | ✅      | ✅  | ✅
Session Persistence    | ✅  | ✅      | ✅  | ✅
Logout / Token Revoke  | ✅  | ✅      | ✅  | ✅
```

All authentication flows work identically across platforms.

---

## Known Issues

None. All sign-in methods fully functional.

---

## Testing Checklist

- [x] iOS: Google sign-in on simulator + real device
- [x] iOS: Apple sign-in on simulator + real device
- [x] Android: Google sign-in on emulator + real device
- [x] Android: Apple sign-in on emulator + real device
- [x] Web: Google sign-in (desktop + mobile browsers)
- [x] Web: Apple sign-in (Safari + Chrome)
- [x] Backend: Token validation for both providers
- [x] Backend: Cookie setting + Auth middleware
- [x] Cross-platform session persistence after sign-in
- [x] Logout on all platforms

---

## Next Phases

1. **Push to Production** — Deploy updated web + backend to production
2. **iOS App Store** — Submit latest iOS build with Apple compliance hardening
3. **Android Play Store** — Submit release APK with SSL pinning
4. **Marketing Assets** — Update website + docs with new sign-in flows

---

## Build / Deploy Status

| Component | Version | Environment | Status |
|-----------|---------|-------------|--------|
| iOS | 1.0.2 | Staging | ✅ Ready to submit |
| Android | 1.0.0 | Staging | ✅ Release APK signed |
| Web | Latest | Staging | ✅ Deployed to staging |
| Backend | Latest | Production | ✅ api.solennix.com active |

---

## Technical Debt

None for authentication. All code follows conventions in CLAUDE.md.
