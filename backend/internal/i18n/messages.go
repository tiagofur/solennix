package i18n

import (
	"context"
	"fmt"
	"net/http"
	"strings"
)

type contextKey string

const (
	LocaleContextKey contextKey = "locale"
	DefaultLocale    string     = "es"
	NoContextLocale  string     = "en"
)

var catalogs = map[string]map[string]string{
	"es": {
		"common.invalid_request_body":                "Cuerpo de solicitud invalido",
		"auth.required":                              "Autenticacion requerida",
		"auth.token_revoked":                         "El token fue revocado",
		"auth.token_invalid_or_expired":              "Token invalido o expirado",
		"auth.user_not_found":                        "Usuario no encontrado",
		"auth.admin_required":                        "Se requiere acceso de administrador",
		"auth.invalid_request_body":                  "Cuerpo de solicitud invalido",
		"auth.email_password_name_required":          "Email, contraseña y nombre son obligatorios",
		"auth.invalid_email_format":                  "Formato de email invalido",
		"auth.name_too_long":                         "El nombre no debe exceder 255 caracteres",
		"auth.email_registered":                      "Email ya registrado",
		"auth.email_not_verified":                    "Debes verificar tu correo antes de iniciar sesion",
		"auth.token_required":                        "Token obligatorio",
		"auth.email_verification_sent":               "Te enviamos un enlace para verificar tu correo",
		"auth.email_verified_success":                "Correo verificado correctamente",
		"auth.email_verification_invalid_or_expired": "Token de verificacion invalido o expirado",
		"auth.email_verification_resent_if_exists":   "Si el correo existe y no esta verificado, se envio un nuevo enlace",
		"auth.email_verification_resend_limited":     "Debes esperar antes de solicitar otro enlace",
		"auth.internal_server_error":                 "Error interno del servidor",
		"auth.create_account_failed":                 "No se pudo crear la cuenta",
		"auth.email_password_required":               "Email y contrasena son obligatorios",
		"auth.invalid_credentials":                   "Email o contrasena invalidos",
		"auth.invalid_credentials_generic":           "Credenciales invalidas",
		"auth.logged_out_success":                    "Sesion cerrada correctamente",
		"auth.forgot_password_if_exists":             "Si el email existe, se envio un enlace para restablecer la contrasena",
		"auth.token_password_required":               "Token y contrasena son obligatorios",
		"auth.token_new_password_required":           "Token y nueva contrasena son obligatorios",
		"auth.invite_token_invalid":                  "Token de invitacion invalido",
		"auth.invite_already_used":                   "La invitacion ya fue usada o revocada",
		"auth.invite_expired":                        "La invitacion expiro",
		"auth.invite_email_taken":                    "El email de la invitacion ya tiene una cuenta",
		"auth.invite_accept_failed":                  "No se pudo aceptar la invitacion",
		"auth.reset_token_already_used":              "El token de restablecimiento ya fue usado",
		"auth.reset_token_invalid_or_expired":        "Token de restablecimiento invalido o expirado",
		"auth.update_password_failed":                "No se pudo actualizar la contrasena",
		"auth.password_reset_success":                "Contrasena restablecida correctamente",
		"auth.current_new_password_required":         "Contrasena actual y nueva contrasena son obligatorias",
		"auth.current_password_incorrect":            "La contrasena actual es incorrecta",
		"auth.password_changed_success":              "Contrasena cambiada correctamente",
		"auth.id_token_required":                     "id_token es obligatorio",
		"auth.google_token_invalid":                  "Token de Google invalido",
		"auth.google_link_failed":                    "No se pudo vincular la cuenta de Google",
		"auth.profile_update_failed":                 "No se pudo actualizar el perfil",
		"auth.contract_template_invalid":             "Plantilla de contrato invalida",
		"auth.password_strength":                     "La contrasena debe tener al menos 8 caracteres e incluir mayusculas, minusculas y un digito",
		"auth.password_max_length":                   "La contrasena no debe exceder 128 caracteres",
		"email.password_reset.subject":               "Recuperacion de contrasena - Solennix",
		"email.welcome.subject":                      "¡Bienvenido a Solennix! 🎉",
		"email.verification.subject":                 "Verifica tu correo - Solennix",
		"email.payment_receipt.subject":              "Pago registrado: %s",
		"email.collaborator_assigned.subject":        "%s te asigno a un evento",
		"email.subscription_confirmation.subject":    "Tu plan %s esta activo - Solennix",
		"email.password_reset.greeting":              "Hola {{.UserName}},",
		"email.password_reset.instructions":          "Recibimos una solicitud para restablecer la contraseña de tu cuenta en Solennix.",
		"email.password_reset.cta":                   "Restablecer Contraseña",
		"email.password_reset.expiry":                "Este enlace es válido por 1 hora.",
		"email.password_reset.ignore":                "Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.",
		"email.welcome.greeting":                     "Hola {{.UserName}},",
		"email.welcome.title":                        "Bienvenido a Solennix. Tu cuenta fue creada exitosamente.",
		"email.welcome.description":                  "Solennix te ayuda a gestionar eventos de forma profesional: clientes, cotizaciones, inventario y pagos.",
		"email.welcome.step1":                        "Agrega tu primer cliente",
		"email.welcome.step2":                        "Crea tu catalogo de productos",
		"email.welcome.step3":                        "Registra tu primer evento",
		"email.welcome.cta":                          "Ir al Dashboard",
		"email.welcome.help":                         "Si tienes dudas, estamos aqui para ayudarte.",
		"email.verification.greeting":                "Hola {{.UserName}},",
		"email.verification.instructions":            "Gracias por registrarte. Para activar tu cuenta, verifica tu correo usando el siguiente enlace.",
		"email.verification.cta":                     "Verificar correo",
		"email.verification.expiry":                  "Este enlace es valido por 24 horas.",
		"email.verification.ignore":                  "Si no creaste esta cuenta, puedes ignorar este mensaje.",
		"validation.max_length":                      "no debe exceder %d caracteres",
		"validation.min_one":                         "debe ser al menos 1",
		"validation.min_zero":                        "debe ser mayor o igual a 0",
		"validation.range_percent":                   "debe estar entre 0 y 100",
		"validation.discount_percent_range":          "debe estar entre 0 y 100 para descuentos porcentuales",
		"validation.greater_than_zero":               "debe ser mayor que 0",
		"validation.required":                        "es obligatorio",
		"validation.invalid_email":                   "formato de email invalido",
		"validation.event_status_enum":               "debe ser uno de: quoted, confirmed, completed, cancelled",
		"validation.payment_method_enum":             "debe ser uno de: cash, transfer, card, check, other",
		"crud.fetch_clients_failed":                  "No se pudieron obtener los clientes",
		"crud.invalid_client_id":                     "ID de cliente invalido",
		"crud.client_not_found":                      "Cliente no encontrado",
		"crud.fetch_user_limits_failed":              "No se pudieron obtener los limites del usuario",
		"crud.verify_client_limits_failed":           "No se pudieron verificar los limites de clientes",
		"crud.create_client_failed":                  "No se pudo crear el cliente",
		"crud.update_client_failed":                  "No se pudo actualizar el cliente",
		"crud.invalid_client_id_param":               "client_id invalido",
		"crud.fetch_events_failed":                   "No se pudieron obtener los eventos",
		"crud.invalid_start_date":                    "Fecha inicial invalida",
		"crud.invalid_end_date":                      "Fecha final invalida",
		"crud.fetch_upcoming_events_failed":          "No se pudieron obtener los eventos proximos",
		"crud.invalid_status_value":                  "Valor de estado invalido",
		"crud.invalid_from_date_format":              "Formato de fecha 'from' invalido (usar YYYY-MM-DD)",
		"crud.invalid_to_date_format":                "Formato de fecha 'to' invalido (usar YYYY-MM-DD)",
		"crud.search_filters_required":               "Se requiere al menos un filtro de busqueda (q, status, from, to, client_id)",
		"crud.search_events_failed":                  "No se pudieron buscar eventos",
		"crud.invalid_event_id":                      "ID de evento invalido",
		"crud.event_not_found":                       "Evento no encontrado",
	},
	"en": {
		"common.invalid_request_body":                "Invalid request body",
		"auth.required":                              "Authentication required",
		"auth.token_revoked":                         "Token has been revoked",
		"auth.token_invalid_or_expired":              "Invalid or expired token",
		"auth.user_not_found":                        "User not found",
		"auth.admin_required":                        "Admin access required",
		"auth.invalid_request_body":                  "Invalid request body",
		"auth.email_password_name_required":          "Email, password, and name are required",
		"auth.invalid_email_format":                  "Invalid email format",
		"auth.name_too_long":                         "Name must not exceed 255 characters",
		"auth.email_registered":                      "Email already registered",
		"auth.email_not_verified":                    "You must verify your email before signing in",
		"auth.token_required":                        "Token is required",
		"auth.email_verification_sent":               "We sent you an email verification link",
		"auth.email_verified_success":                "Email verified successfully",
		"auth.email_verification_invalid_or_expired": "Invalid or expired email verification token",
		"auth.email_verification_resent_if_exists":   "If the email exists and is unverified, a new link was sent",
		"auth.email_verification_resend_limited":     "Wait before requesting another verification link",
		"auth.internal_server_error":                 "Internal server error",
		"auth.create_account_failed":                 "Failed to create account",
		"auth.email_password_required":               "Email and password are required",
		"auth.invalid_credentials":                   "Invalid email or password",
		"auth.invalid_credentials_generic":           "Invalid credentials",
		"auth.logged_out_success":                    "Logged out successfully",
		"auth.forgot_password_if_exists":             "If the email exists, a password reset link has been sent",
		"auth.token_password_required":               "Token and password are required",
		"auth.token_new_password_required":           "Token and new password are required",
		"auth.invite_token_invalid":                  "Invalid invite token",
		"auth.invite_already_used":                   "Invite has already been used or revoked",
		"auth.invite_expired":                        "Invite has expired",
		"auth.invite_email_taken":                    "Invite email already has an account",
		"auth.invite_accept_failed":                  "Failed to accept invite",
		"auth.reset_token_already_used":              "Reset token has already been used",
		"auth.reset_token_invalid_or_expired":        "Invalid or expired reset token",
		"auth.update_password_failed":                "Failed to update password",
		"auth.password_reset_success":                "Password reset successfully",
		"auth.current_new_password_required":         "Current password and new password are required",
		"auth.current_password_incorrect":            "Current password is incorrect",
		"auth.password_changed_success":              "Password changed successfully",
		"auth.id_token_required":                     "id_token is required",
		"auth.google_token_invalid":                  "Invalid Google ID token",
		"auth.google_link_failed":                    "Failed to link Google account",
		"auth.profile_update_failed":                 "Failed to update profile",
		"auth.contract_template_invalid":             "Invalid contract template",
		"auth.password_strength":                     "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one digit",
		"auth.password_max_length":                   "Password must not exceed 128 characters",
		"email.password_reset.subject":               "Password reset - Solennix",
		"email.welcome.subject":                      "Welcome to Solennix",
		"email.verification.subject":                 "Verify your email - Solennix",
		"email.payment_receipt.subject":              "Payment registered: %s",
		"email.collaborator_assigned.subject":        "%s assigned you to an event",
		"email.subscription_confirmation.subject":    "Your %s plan is active - Solennix",
		"email.password_reset.greeting":              "Hi {{.UserName}},",
		"email.password_reset.instructions":          "We received a request to reset your Solennix account password.",
		"email.password_reset.cta":                   "Reset password",
		"email.password_reset.expiry":                "This link is valid for 1 hour.",
		"email.password_reset.ignore":                "If you did not request this password reset, you can ignore this email.",
		"email.welcome.greeting":                     "Hi {{.UserName}},",
		"email.welcome.title":                        "Welcome to Solennix. Your account has been created successfully.",
		"email.welcome.description":                  "Solennix helps you manage events professionally: clients, quotes, inventory and payments.",
		"email.welcome.step1":                        "Add your first client",
		"email.welcome.step2":                        "Create your product catalog",
		"email.welcome.step3":                        "Register your first event",
		"email.welcome.cta":                          "Go to Dashboard",
		"email.welcome.help":                         "If you have any questions, we are here to help.",
		"email.verification.greeting":                "Hi {{.UserName}},",
		"email.verification.instructions":            "Thanks for signing up. To activate your account, please verify your email using the link below.",
		"email.verification.cta":                     "Verify email",
		"email.verification.expiry":                  "This link is valid for 24 hours.",
		"email.verification.ignore":                  "If you did not create this account, you can ignore this message.",
		"validation.max_length":                      "must not exceed %d characters",
		"validation.min_one":                         "must be at least 1",
		"validation.min_zero":                        "must be greater than or equal to 0",
		"validation.range_percent":                   "must be between 0 and 100",
		"validation.discount_percent_range":          "must be between 0 and 100 for percentage discounts",
		"validation.greater_than_zero":               "must be greater than 0",
		"validation.required":                        "is required",
		"validation.invalid_email":                   "invalid email format",
		"validation.event_status_enum":               "must be one of: quoted, confirmed, completed, cancelled",
		"validation.payment_method_enum":             "must be one of: cash, transfer, card, check, other",
		"crud.fetch_clients_failed":                  "Failed to fetch clients",
		"crud.invalid_client_id":                     "Invalid client ID",
		"crud.client_not_found":                      "Client not found",
		"crud.fetch_user_limits_failed":              "Failed to fetch user limits",
		"crud.verify_client_limits_failed":           "Failed to verify client limits",
		"crud.create_client_failed":                  "Failed to create client",
		"crud.update_client_failed":                  "Failed to update client",
		"crud.invalid_client_id_param":               "Invalid client_id",
		"crud.fetch_events_failed":                   "Failed to fetch events",
		"crud.invalid_start_date":                    "Invalid start date",
		"crud.invalid_end_date":                      "Invalid end date",
		"crud.fetch_upcoming_events_failed":          "Failed to fetch upcoming events",
		"crud.invalid_status_value":                  "Invalid status value",
		"crud.invalid_from_date_format":              "Invalid 'from' date format (use YYYY-MM-DD)",
		"crud.invalid_to_date_format":                "Invalid 'to' date format (use YYYY-MM-DD)",
		"crud.search_filters_required":               "At least one search filter is required (q, status, from, to, client_id)",
		"crud.search_events_failed":                  "Failed to search events",
		"crud.invalid_event_id":                      "Invalid event ID",
		"crud.event_not_found":                       "Event not found",
	},
}

func NormalizeLocale(locale string) string {
	trimmed := strings.TrimSpace(strings.ToLower(locale))
	if trimmed == "" {
		return DefaultLocale
	}
	base := strings.Split(trimmed, "-")[0]
	if _, ok := catalogs[base]; ok {
		return base
	}
	return DefaultLocale
}

func LocaleFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if locale, ok := ctx.Value(LocaleContextKey).(string); ok {
		return NormalizeLocale(locale)
	}
	return ""
}

func WithLocale(ctx context.Context, locale string) context.Context {
	return context.WithValue(ctx, LocaleContextKey, NormalizeLocale(locale))
}

func LocaleFromRequest(r *http.Request) string {
	if r == nil {
		return NoContextLocale
	}
	locale := LocaleFromContext(r.Context())
	if locale != "" {
		return locale
	}
	header := r.Header.Get("Accept-Language")
	if header == "" {
		return NoContextLocale
	}
	parts := strings.Split(header, ",")
	if len(parts) == 0 {
		return NoContextLocale
	}
	lang := strings.Split(parts[0], ";")[0]
	return NormalizeLocale(lang)
}

func T(locale, key string, args ...any) string {
	normalized := NormalizeLocale(locale)
	if msg, ok := catalogs[normalized][key]; ok {
		if len(args) > 0 {
			return fmt.Sprintf(msg, args...)
		}
		return msg
	}
	if msg, ok := catalogs[DefaultLocale][key]; ok {
		if len(args) > 0 {
			return fmt.Sprintf(msg, args...)
		}
		return msg
	}
	return key
}

func Message(ctx context.Context, key string, args ...any) string {
	locale := LocaleFromContext(ctx)
	if locale == "" {
		locale = NoContextLocale
	}
	return T(locale, key, args...)
}
