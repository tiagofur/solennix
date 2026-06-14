import Foundation

// MARK: - Auth Strings

enum AuthStrings {
    // MARK: - Login
    static var loginTitle: String { FeatureL10n.text("auth.login.title", "Iniciar sesión") }
    static var loginTagline: String { FeatureL10n.text("auth.login.tagline", "CADA DETALLE IMPORTA") }
    static var loginBrandSubtitle: String { FeatureL10n.text("auth.login.brand.subtitle", "Cada detalle importa") }
    static var loginBrandFeatureEvents: String { FeatureL10n.text("auth.login.brand.feature_events", "Gestiona eventos de principio a fin") }
    static var loginBrandFeatureClients: String { FeatureL10n.text("auth.login.brand.feature_clients", "CRM integrado para tus clientes") }
    static var loginBrandFeatureReports: String { FeatureL10n.text("auth.login.brand.feature_reports", "Reportes financieros en tiempo real") }
    static var loginResendVerification: String { FeatureL10n.text("auth.login.resend_verification", "Reenviar enlace") }
    static var loginEmailLabel: String { FeatureL10n.text("auth.login.email_label", "Correo electrónico") }
    static var loginEmailPlaceholder: String { FeatureL10n.text("auth.login.email_placeholder", "tu@email.com") }
    static var loginPasswordLabel: String { FeatureL10n.text("auth.login.password_label", "Contraseña") }
    static var loginPasswordPlaceholder: String { FeatureL10n.text("auth.login.password_placeholder", "Tu contraseña") }
    static var loginSubmit: String { FeatureL10n.text("auth.login.submit", "Ingresar") }
    static var loginForgotPassword: String { FeatureL10n.text("auth.login.forgot_password", "¿Olvidaste tu contraseña?") }
    static var loginOrSeparator: String { FeatureL10n.text("auth.login.or_separator", "o continuá con") }
    static var loginNoAccount: String { FeatureL10n.text("auth.login.no_account", "¿No tienes cuenta?") }
    static var loginCreateAccount: String { FeatureL10n.text("auth.login.create_account", "Crear cuenta") }
    static var loginVerificationRequiredNotice: String { FeatureL10n.text("auth.login.verification_required_notice", "Verificá tu correo antes de iniciar sesión") }
    static var loginVerificationResent: String { FeatureL10n.text("auth.login.verification_resent", "Te enviamos un nuevo enlace de verificación.") }

    // MARK: - Forgot Password
    static var forgotPasswordTitle: String { FeatureL10n.text("auth.forgot_password.title", "Recuperar contraseña") }
    static var forgotPasswordBrandSubtitle: String { FeatureL10n.text("auth.forgot_password.brand.subtitle", "Recupera el acceso a tu cuenta") }
    static var forgotPasswordBrandFeatureEmail: String { FeatureL10n.text("auth.forgot_password.brand.feature_email", "Te enviaremos un enlace seguro") }
    static var forgotPasswordBrandFeatureSecure: String { FeatureL10n.text("auth.forgot_password.brand.feature_secure", "Tus datos siempre protegidos") }
    static var forgotPasswordSubtitle: String { FeatureL10n.text("auth.forgot_password.subtitle", "Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.") }
    static var forgotPasswordEmailLabel: String { FeatureL10n.text("auth.forgot_password.email_label", "Correo electrónico") }
    static var forgotPasswordEmailPlaceholder: String { FeatureL10n.text("auth.forgot_password.email_placeholder", "tu@email.com") }
    static var forgotPasswordSubmit: String { FeatureL10n.text("auth.forgot_password.submit", "Enviar enlace") }
    static var forgotPasswordBackToLogin: String { FeatureL10n.text("auth.forgot_password.back_to_login", "Volver al inicio de sesión") }
    static var forgotPasswordSuccessTitle: String { FeatureL10n.text("auth.forgot_password.success_title", "Revisa tu correo") }
    static var forgotPasswordSuccessMessage: String { FeatureL10n.text("auth.forgot_password.success_message", "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.") }

    // MARK: - Reset Password
    static var resetPasswordTitle: String { FeatureL10n.text("auth.reset_password.title", "Restablecer contraseña") }
    static var resetPasswordBrandSubtitle: String { FeatureL10n.text("auth.reset_password.brand.subtitle", "Crea una nueva contraseña segura") }
    static var resetPasswordBrandFeatureMin: String { FeatureL10n.text("auth.reset_password.brand.feature_min", "Mínimo 8 caracteres") }
    static var resetPasswordBrandFeatureRules: String { FeatureL10n.text("auth.reset_password.brand.feature_rules", "Mayúsculas, minúsculas y números") }
    static var resetPasswordSubtitle: String { FeatureL10n.text("auth.reset_password.subtitle", "Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.") }
    static var resetPasswordPasswordLabel: String { FeatureL10n.text("auth.reset_password.password_label", "Nueva contraseña") }
    static var resetPasswordPasswordPlaceholder: String { FeatureL10n.text("auth.reset_password.password_placeholder", "Mínimo 8 caracteres") }
    static var resetPasswordConfirmLabel: String { FeatureL10n.text("auth.reset_password.confirm_label", "Confirmar contraseña") }
    static var resetPasswordConfirmPlaceholder: String { FeatureL10n.text("auth.reset_password.confirm_placeholder", "Repite tu contraseña") }
    static var resetPasswordSubmit: String { FeatureL10n.text("auth.reset_password.submit", "Restablecer contraseña") }
    static var resetPasswordSuccessTitle: String { FeatureL10n.text("auth.reset_password.success_title", "Contraseña actualizada") }
    static var resetPasswordSuccessMessage: String { FeatureL10n.text("auth.reset_password.success_message", "Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.") }
    static var resetPasswordGoToLogin: String { FeatureL10n.text("auth.reset_password.go_to_login", "Ir al inicio de sesión") }

    // MARK: - Register
    static var registerTitle: String { FeatureL10n.text("auth.register.title", "Crear cuenta") }
    static var registerBrandTitle: String { FeatureL10n.text("auth.register.brand.title", "Únete a Solennix") }
    static var registerBrandSubtitle: String { FeatureL10n.text("auth.register.brand.subtitle", "Tu plataforma para gestionar eventos de manera profesional") }
    static var registerFeatureFree: String { FeatureL10n.text("auth.register.feature.free", "Gratis") }
    static var registerFeatureFreeDesc: String { FeatureL10n.text("auth.register.feature.free_desc", "Comienza sin costo") }
    static var registerFeatureSecure: String { FeatureL10n.text("auth.register.feature.secure", "Seguro") }
    static var registerFeatureSecureDesc: String { FeatureL10n.text("auth.register.feature.secure_desc", "Tus datos protegidos") }
    static var registerFeatureScalable: String { FeatureL10n.text("auth.register.feature.scalable", "Escalable") }
    static var registerFeatureScalableDesc: String { FeatureL10n.text("auth.register.feature.scalable_desc", "Crece a tu ritmo") }
    static var registerNameLabel: String { FeatureL10n.text("auth.register.name_label", "Nombre completo") }
    static var registerNamePlaceholder: String { FeatureL10n.text("auth.register.name_placeholder", "Tu nombre") }
    static var registerEmailLabel: String { FeatureL10n.text("auth.register.email_label", "Correo electrónico") }
    static var registerEmailPlaceholder: String { FeatureL10n.text("auth.register.email_placeholder", "tu@email.com") }
    static var registerPasswordLabel: String { FeatureL10n.text("auth.register.password_label", "Contraseña") }
    static var registerPasswordPlaceholder: String { FeatureL10n.text("auth.register.password_placeholder", "Mínimo 8 caracteres") }
    static var registerConfirmPasswordLabel: String { FeatureL10n.text("auth.register.confirm_password_label", "Confirmar contraseña") }
    static var registerConfirmPasswordPlaceholder: String { FeatureL10n.text("auth.register.confirm_password_placeholder", "Repite tu contraseña") }
    static var registerTermsIntro: String { FeatureL10n.text("auth.register.terms_intro", "Al registrarte aceptas nuestros") }
    static var registerTermsLink: String { FeatureL10n.text("auth.register.terms_link", "Términos") }
    static var registerTermsHint: String { FeatureL10n.text("auth.register.terms_hint", "Abre los términos de uso en Safari") }
    static var registerAnd: String { FeatureL10n.text("auth.register.and", "y") }
    static var registerPrivacyLink: String { FeatureL10n.text("auth.register.privacy_link", "Privacidad") }
    static var registerPrivacyHint: String { FeatureL10n.text("auth.register.privacy_hint", "Abre la política de privacidad en Safari") }
    static var registerOrSeparator: String { FeatureL10n.text("auth.register.or_separator", "o continuá con") }
    static var registerHasAccount: String { FeatureL10n.text("auth.register.has_account", "¿Ya tienes cuenta?") }
    static var registerSignIn: String { FeatureL10n.text("auth.register.sign_in", "Iniciar sesión") }
    static var registerVerificationSent: String { FeatureL10n.text("auth.register.verification_sent", "Te enviamos un enlace para verificar tu correo. Revisá tu bandeja antes de iniciar sesión.") }

    // MARK: - Team Invite
    static var teamInviteTitle: String { FeatureL10n.text("auth.team_invite.title", "Activar acceso") }
    static var teamInviteSubtitle: String { FeatureL10n.text("auth.team_invite.subtitle", "Crea tu contraseña para ingresar al portal del equipo.") }
    static var teamInvitePasswordLabel: String { FeatureL10n.text("auth.team_invite.password_label", "Contraseña") }
    static var teamInvitePasswordPlaceholder: String { FeatureL10n.text("auth.team_invite.password_placeholder", "Mínimo 8 caracteres") }
    static var teamInviteConfirmLabel: String { FeatureL10n.text("auth.team_invite.confirm_label", "Confirmar contraseña") }
    static var teamInviteConfirmPlaceholder: String { FeatureL10n.text("auth.team_invite.confirm_placeholder", "Repite tu contraseña") }
    static var teamInviteSubmit: String { FeatureL10n.text("auth.team_invite.submit", "Aceptar invitación") }
    static var teamInviteBackToLogin: String { FeatureL10n.text("auth.team_invite.back_to_login", "Volver al inicio de sesión") }
    static var teamInviteSuccessTitle: String { FeatureL10n.text("auth.team_invite.success_title", "Invitación aceptada") }
    static var teamInviteSuccessMessage: String { FeatureL10n.text("auth.team_invite.success_message", "Tu cuenta del equipo fue activada correctamente.") }
    static var teamInviteGoToApp: String { FeatureL10n.text("auth.team_invite.go_to_app", "Continuar") }

    // MARK: - Biometrics
    static var biometricBrandTagline: String { FeatureL10n.text("auth.biometric.brand.tagline", "CADA DETALLE IMPORTA") }
    static var biometricUnlockTitle: String { FeatureL10n.text("auth.biometric.unlock.title", "Desbloquea Solennix") }
    static var biometricErrorAuthFailed: String { FeatureL10n.text("auth.biometric.error.auth_failed", "No se pudo verificar tu identidad. Intenta de nuevo.") }
    static var biometricButtonFaceID: String { FeatureL10n.text("auth.biometric.button.face_id", "Usar Face ID") }
    static var biometricButtonTouchID: String { FeatureL10n.text("auth.biometric.button.touch_id", "Usar Touch ID") }
    static var biometricButtonUnlock: String { FeatureL10n.text("auth.biometric.button.unlock", "Desbloquear") }
    static var biometricButtonPassword: String { FeatureL10n.text("auth.biometric.button.password", "Usar contraseña") }

    // MARK: - Social
    static var socialAppleContinue: String { FeatureL10n.text("auth.social.apple.continue", "Continuar con Apple") }
    static var socialGoogleContinue: String { FeatureL10n.text("auth.social.google.continue", "Continuar con Google") }
    static var socialGoogleMissingToken: String { FeatureL10n.text("auth.social.google.missing_token", "No se recibió el token de identidad de Google.") }
    static var socialGoogleCancelled: String { FeatureL10n.text("auth.social.google.cancelled", "Inicio de sesión con Google cancelado.") }
    static var socialGoogleError: String { FeatureL10n.text("auth.social.google.error", "Error al iniciar sesión con Google") }
    static var socialAppleInvalidCredential: String { FeatureL10n.text("auth.social.apple.invalid_credential", "Credencial de Apple inválida.") }
    static var socialAppleMissingIdentityToken: String { FeatureL10n.text("auth.social.apple.missing_identity_token", "No se recibió el token de identidad de Apple.") }
    static var socialAppleMissingAuthorizationCode: String { FeatureL10n.text("auth.social.apple.missing_authorization_code", "No se recibió el código de autorización de Apple.") }
    static var socialAppleCancelled: String { FeatureL10n.text("auth.social.apple.cancelled", "Inicio de sesión con Apple cancelado.") }
    static var socialAppleError: String { FeatureL10n.text("auth.social.apple.error", "Error al iniciar sesión con Apple") }

    // MARK: - Validation & Errors
    static var validationEmailRequired: String { FeatureL10n.text("auth.validation.email_required", "El correo es requerido") }
    static var validationPasswordRequired: String { FeatureL10n.text("auth.validation.password_required", "La contraseña es requerida") }
    static var validationNameMin2: String { FeatureL10n.text("auth.validation.name_min_2", "El nombre debe tener al menos 2 caracteres") }
    static var validationPasswordMin8: String { FeatureL10n.text("auth.validation.password_min_8", "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo") }
    static var validationPasswordMismatch: String { FeatureL10n.text("auth.validation.password_mismatch", "Las contraseñas no coinciden") }
    static var errorInvalidCredentials: String { FeatureL10n.text("auth.error.invalid_credentials", "Credenciales inválidas. Verifica tu correo y contraseña.") }
    static var errorEmailTaken: String { FeatureL10n.text("auth.error.email_taken", "Ya existe una cuenta con este correo electrónico.") }
    static var errorNetwork: String { FeatureL10n.text("auth.error.network", "Error de conexión. Verifica tu internet e intenta de nuevo.") }
    static var errorUnexpected: String { FeatureL10n.text("auth.error.unexpected", "Ocurrió un error inesperado.") }
    static var errorRetry: String { FeatureL10n.text("auth.error.retry", "Ocurrió un error inesperado. Intenta de nuevo.") }
}
