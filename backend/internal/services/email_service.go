package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log/slog"

	"github.com/resend/resend-go/v3"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/i18n"
)

type EmailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

// ---------------------------------------------------------------------------
// Public Email Methods
// ---------------------------------------------------------------------------

// SendPasswordReset sends password reset email with token.
func (s *EmailService) SendPasswordReset(email, token, userName string) error {
	return s.SendPasswordResetLocalized(email, token, userName, i18n.DefaultLocale)
}

// SendPasswordResetLocalized sends password reset email with locale-aware subject/body.
func (s *EmailService) SendPasswordResetLocalized(email, token, userName, locale string) error {
	lang := i18n.NormalizeLocale(locale)
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.FrontendURL, token)
	body := s.renderTemplate(passwordResetBodyForLocale(lang), map[string]any{
		"UserName":  userName,
		"ResetLink": resetLink,
	})
	return s.sendEmail(email, i18n.T(lang, "email.password_reset.subject"), body)
}

// SendWelcome sends a welcome/onboarding email after registration.
func (s *EmailService) SendWelcome(email, userName string) error {
	return s.SendWelcomeLocalized(email, userName, i18n.DefaultLocale)
}

// SendWelcomeLocalized sends a welcome email with locale-aware subject/body.
func (s *EmailService) SendWelcomeLocalized(email, userName, locale string) error {
	lang := i18n.NormalizeLocale(locale)
	dashboardLink := fmt.Sprintf("%s/dashboard", s.cfg.FrontendURL)
	body := s.renderTemplate(welcomeBodyForLocale(lang), map[string]any{
		"UserName":      userName,
		"DashboardLink": dashboardLink,
	})
	return s.sendEmail(email, i18n.T(lang, "email.welcome.subject"), body)
}

// SendEmailVerificationLocalized sends an email verification link after registration.
func (s *EmailService) SendEmailVerificationLocalized(email, token, userName, locale string) error {
	lang := i18n.NormalizeLocale(locale)
	verifyLink := fmt.Sprintf("%s/verify-email?token=%s", s.cfg.FrontendURL, token)
	body := s.renderTemplate(emailVerificationBodyForLocale(lang), map[string]any{
		"UserName":   userName,
		"VerifyLink": verifyLink,
	})
	return s.sendEmail(email, i18n.T(lang, "email.verification.subject"), body)
}

// SendEventReminder sends a reminder about an upcoming event.
func (s *EmailService) SendEventReminder(email, userName, eventName, eventDate, eventLink string) error {
	body := s.renderTemplate(eventReminderBody, map[string]any{
		"UserName":  userName,
		"EventName": eventName,
		"EventDate": eventDate,
		"EventLink": eventLink,
	})
	return s.sendEmail(email, fmt.Sprintf("Recordatorio: %s es mañana", eventName), body)
}

// SendPaymentReceipt sends a payment confirmation email.
func (s *EmailService) SendPaymentReceipt(email, userName, eventName, amount, paymentDate string) error {
	return s.SendPaymentReceiptLocalized(email, userName, eventName, amount, paymentDate, i18n.DefaultLocale)
}

// SendPaymentReceiptLocalized sends a localized payment confirmation email.
func (s *EmailService) SendPaymentReceiptLocalized(email, userName, eventName, amount, paymentDate, locale string) error {
	lang := i18n.NormalizeLocale(locale)
	body := s.renderTemplate(paymentReceiptBody, map[string]any{
		"UserName":    userName,
		"EventName":   eventName,
		"Amount":      amount,
		"PaymentDate": paymentDate,
	})
	return s.sendEmail(email, i18n.T(lang, "email.payment_receipt.subject", amount), body)
}

// SendCollaboratorAssigned notifies a staff collaborator (photographer, DJ,
// coordinator, etc.) that an organizer assigned them to an event. Part of
// PRD "Personal/Colaboradores" Phase 2 — gated to Pro+ plans at the caller.
//
// `orgName` is the organizer's business_name (or name fallback). `role` is
// the role_override for this event if set, else the staff.role_label. `fee`
// is pre-formatted (e.g. "$3,000 MXN") or empty if no fee was provided.
func (s *EmailService) SendCollaboratorAssigned(
	email, staffName, orgName, eventName, eventDate, role, fee string,
) error {
	return s.SendCollaboratorAssignedLocalized(email, staffName, orgName, eventName, eventDate, role, fee, i18n.DefaultLocale)
}

// SendCollaboratorAssignedLocalized sends a localized collaborator assignment email.
func (s *EmailService) SendCollaboratorAssignedLocalized(
	email, staffName, orgName, eventName, eventDate, role, fee, locale string,
) error {
	lang := i18n.NormalizeLocale(locale)
	body := s.renderTemplate(collaboratorAssignedBody, map[string]any{
		"StaffName": staffName,
		"OrgName":   orgName,
		"EventName": eventName,
		"EventDate": eventDate,
		"Role":      role,
		"Fee":       fee,
	})
	return s.sendEmail(email, i18n.T(lang, "email.collaborator_assigned.subject", orgName), body)
}

// SendQuotationReceived sends a notification reminding the user about an unconfirmed quotation.
func (s *EmailService) SendQuotationReceived(email, userName, eventName, eventDate, quotationLink string) error {
	body := s.renderTemplate(quotationReceivedBody, map[string]any{
		"UserName":      userName,
		"EventName":     eventName,
		"EventDate":     eventDate,
		"QuotationLink": quotationLink,
	})
	return s.sendEmail(email, fmt.Sprintf("Cotización pendiente: %s", eventName), body)
}

// SendSubscriptionConfirmation sends a plan upgrade/renewal confirmation.
func (s *EmailService) SendSubscriptionConfirmation(email, userName, planName string) error {
	return s.SendSubscriptionConfirmationLocalized(email, userName, planName, i18n.DefaultLocale)
}

// SendSubscriptionConfirmationLocalized sends a localized plan confirmation email.
func (s *EmailService) SendSubscriptionConfirmationLocalized(email, userName, planName, locale string) error {
	lang := i18n.NormalizeLocale(locale)
	body := s.renderTemplate(subscriptionConfirmationBody, map[string]any{
		"UserName": userName,
		"PlanName": planName,
	})
	return s.sendEmail(email, i18n.T(lang, "email.subscription_confirmation.subject", planName), body)
}

// SendWeeklySummary sends a weekly summary of upcoming events and payments.
func (s *EmailService) SendWeeklySummary(email, userName, nextEventsHTML, paymentsHTML string) error {
	body := s.renderTemplate(weeklySummaryBody, map[string]any{
		"UserName":        userName,
		"NextEvents":      template.HTML(nextEventsHTML),
		"PaymentsSummary": template.HTML(paymentsHTML),
	})
	return s.sendEmail(email, "Tu Resumen Semanal - Solennix", body)
}

// SendMarketingUpdate sends marketing/tips email.
func (s *EmailService) SendMarketingUpdate(email, userName, tipsHTML string) error {
	body := s.renderTemplate(marketingUpdateBody, map[string]any{
		"UserName": userName,
		"Tips":     template.HTML(tipsHTML),
	})
	return s.sendEmail(email, "Tips y Novedades - Solennix", body)
}

// SendReviewRequest sends a post-event testimonial request to the end client.
func (s *EmailService) SendReviewRequest(email, clientName, organizerName, eventLabel, eventDate, reviewLink string) error {
	body := s.renderTemplate(reviewRequestBody, map[string]any{
		"ClientName":    clientName,
		"OrganizerName": organizerName,
		"EventLabel":    eventLabel,
		"EventDate":     eventDate,
		"ReviewLink":    reviewLink,
	})

	return s.sendEmail(email, "¿Cómo te fue con tu evento?", body)
}

// ---------------------------------------------------------------------------
// Base Layout & Template Rendering
// ---------------------------------------------------------------------------

func (s *EmailService) renderTemplate(bodyTemplate string, data map[string]any) string {
	full := fmt.Sprintf(baseLayout, bodyTemplate)
	t := template.Must(template.New("email").Parse(full))
	var buf bytes.Buffer
	_ = t.Execute(&buf, data)
	return buf.String()
}

func (s *EmailService) sendEmail(to, subject, htmlBody string) error {
	if s.cfg.ResendAPIKey == "" {
		slog.Warn("Resend not configured, email not sent", "to", to)
		return fmt.Errorf("Resend not configured")
	}

	client := resend.NewClient(s.cfg.ResendAPIKey)

	params := &resend.SendEmailRequest{
		From:    s.cfg.ResendFromEmail,
		To:      []string{to},
		Subject: subject,
		Html:    htmlBody,
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		slog.Error("Failed to send email", "error", err, "to", to)
		return fmt.Errorf("failed to send email: %w", err)
	}

	slog.Info("Email sent successfully", "to", to, "subject", subject)
	return nil
}

// ---------------------------------------------------------------------------
// Email Templates (Solennix brand: gold #C4A265, navy #1B2A4A)
// ---------------------------------------------------------------------------

const baseLayout = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f0;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #C4A265;
            margin: 0;
            font-size: 28px;
            letter-spacing: 1px;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #C4A265;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .highlight {
            background-color: #faf8f5;
            border-left: 4px solid #C4A265;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 13px;
            color: #6b7280;
            text-align: center;
        }
        .footer a { color: #C4A265; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo"><h1>Solennix</h1></div>
        %s
        <div class="footer">
            <p>Solennix — Gestión profesional de eventos</p>
            <p>Este es un correo automático. No respondas a este mensaje.</p>
            <p><a href="https://creapolis.dev/terms-of-use/">Términos</a> · <a href="https://creapolis.dev/privacy-policy/">Privacidad</a></p>
        </div>
    </div>
</body>
</html>`

func passwordResetBodyForLocale(locale string) string {
	lang := i18n.NormalizeLocale(locale)
	return fmt.Sprintf(`
<p>%s</p>
<p>%s</p>
<div style="text-align: center;">
    <a href="{{.ResetLink}}" class="button">%s</a>
</div>
<div class="highlight">
    <p style="margin: 0;">%s</p>
</div>
<p>%s</p>
<p style="word-break: break-all; font-size: 13px; color: #6b7280;">{{.ResetLink}}</p>`,
		i18n.T(lang, "email.password_reset.greeting"),
		i18n.T(lang, "email.password_reset.instructions"),
		i18n.T(lang, "email.password_reset.cta"),
		i18n.T(lang, "email.password_reset.expiry"),
		i18n.T(lang, "email.password_reset.ignore"),
	)
}

func welcomeBodyForLocale(locale string) string {
	lang := i18n.NormalizeLocale(locale)
	return fmt.Sprintf(`
<p>%s</p>
<p>%s</p>
<p>%s</p>
<div class="highlight">
    <p style="margin: 0 0 8px 0;"><strong>Primeros pasos:</strong></p>
    <p style="margin: 4px 0;">1. %s</p>
    <p style="margin: 4px 0;">2. %s</p>
    <p style="margin: 4px 0;">3. %s</p>
</div>
<div style="text-align: center;">
    <a href="{{.DashboardLink}}" class="button">%s</a>
</div>
<p>%s</p>`,
		i18n.T(lang, "email.welcome.greeting"),
		i18n.T(lang, "email.welcome.title"),
		i18n.T(lang, "email.welcome.description"),
		i18n.T(lang, "email.welcome.step1"),
		i18n.T(lang, "email.welcome.step2"),
		i18n.T(lang, "email.welcome.step3"),
		i18n.T(lang, "email.welcome.cta"),
		i18n.T(lang, "email.welcome.help"),
	)
}

func emailVerificationBodyForLocale(locale string) string {
	lang := i18n.NormalizeLocale(locale)
	return fmt.Sprintf(`
<p>%s</p>
<p>%s</p>
<div style="text-align: center;">
    <a href="{{.VerifyLink}}" class="button">%s</a>
</div>
<div class="highlight">
    <p style="margin: 0;">%s</p>
</div>
<p>%s</p>
<p style="word-break: break-all; font-size: 13px; color: #6b7280;">{{.VerifyLink}}</p>`,
		i18n.T(lang, "email.verification.greeting"),
		i18n.T(lang, "email.verification.instructions"),
		i18n.T(lang, "email.verification.cta"),
		i18n.T(lang, "email.verification.expiry"),
		i18n.T(lang, "email.verification.ignore"),
	)
}

// Backward-compatible defaults used by tests that validate base templates directly.
var passwordResetBody = passwordResetBodyForLocale(i18n.DefaultLocale)
var welcomeBody = welcomeBodyForLocale(i18n.DefaultLocale)
var emailVerificationBody = emailVerificationBodyForLocale(i18n.DefaultLocale)

const eventReminderBody = `
<p>Hola {{.UserName}},</p>
<p>Te recordamos que tienes un evento programado para <strong>mañana</strong>:</p>
<div class="highlight">
    <p style="margin: 0;"><strong>{{.EventName}}</strong></p>
    <p style="margin: 4px 0; color: #6b7280;">📅 {{.EventDate}}</p>
</div>
<p>Revisa los detalles y asegúrate de que todo esté listo.</p>
<div style="text-align: center;">
    <a href="{{.EventLink}}" class="button">Ver Evento</a>
</div>`

const paymentReceiptBody = `
<p>Hola {{.UserName}},</p>
<p>Se ha registrado un pago exitosamente:</p>
<div class="highlight">
    <p style="margin: 0;"><strong>Evento:</strong> {{.EventName}}</p>
    <p style="margin: 4px 0;"><strong>Monto:</strong> {{.Amount}}</p>
    <p style="margin: 4px 0;"><strong>Fecha:</strong> {{.PaymentDate}}</p>
</div>
<p>Puedes ver el detalle completo del evento y sus pagos desde tu dashboard.</p>`

const collaboratorAssignedBody = `
<p>Hola {{.StaffName}},</p>
<p><strong>{{.OrgName}}</strong> te asignó a un evento próximo:</p>
<div class="highlight">
    <p style="margin: 0;"><strong>{{.EventName}}</strong></p>
    <p style="margin: 4px 0; color: #6b7280;">📅 {{.EventDate}}</p>
    {{if .Role}}<p style="margin: 4px 0; color: #6b7280;">🎯 Rol: {{.Role}}</p>{{end}}
    {{if .Fee}}<p style="margin: 4px 0; color: #6b7280;">💰 Honorarios: {{.Fee}}</p>{{end}}
</div>
<p>Comunicate directamente con {{.OrgName}} para confirmar detalles, horarios y logística.</p>
<p style="color: #6b7280; font-size: 13px;">Recibís este aviso porque {{.OrgName}} te agregó a su equipo en Solennix y marcaste tu contacto para recibir notificaciones. Si no era para vos, respondé este mail.</p>`

const quotationReceivedBody = `
<p>Hola {{.UserName}},</p>
<p>Tienes una cotización <strong>pendiente de confirmación</strong>:</p>
<div class="highlight">
    <p style="margin: 0;"><strong>{{.EventName}}</strong></p>
    <p style="margin: 4px 0; color: #6b7280;">📅 {{.EventDate}}</p>
</div>
<p>Hacé seguimiento con tu cliente para cerrar la cotización antes de que venza.</p>
<div style="text-align: center;">
    <a href="{{.QuotationLink}}" class="button">Ver Cotización</a>
</div>`

const subscriptionConfirmationBody = `
<p>Hola {{.UserName}},</p>
<p>¡Tu plan <strong>{{.PlanName}}</strong> en Solennix está activo! 🎉</p>
<div class="highlight">
    <p style="margin: 0;">Ahora tienes acceso a todas las funcionalidades de tu plan, incluyendo:</p>
    <p style="margin: 8px 0 0 0;">✅ Clientes y eventos ilimitados</p>
    <p style="margin: 4px 0;">✅ Generación de cotizaciones y contratos</p>
    <p style="margin: 4px 0;">✅ Gestión avanzada de inventario</p>
</div>
<p>Gracias por confiar en Solennix para gestionar tus eventos.</p>`

const weeklySummaryBody = `
<p>Hola {{.UserName}},</p>
<p>Te compartimos tu resumen de la semana en Solennix:</p>
<div class="highlight">
    <p style="margin: 0;"><strong>📅 Tus próximos eventos:</strong></p>
    {{.NextEvents}}
</div>
<div class="highlight">
    <p style="margin: 0;"><strong>💰 Pagos registrados:</strong></p>
    {{.PaymentsSummary}}
</div>
<p>¡Sigue adelante con tu negocio! 💪</p>`

const marketingUpdateBody = `
<p>Hola {{.UserName}},</p>
<p>Tenemos algunos consejos y novedades para ti esta semana:</p>
{{.Tips}}
<p>Mantente atento a nuevas funciones en Solennix que te ayudarán a gestionar mejor tus eventos.</p>`

const reviewRequestBody = `
<p>Hola {{.ClientName}},</p>
<p>Esperamos que hayas disfrutado tu evento con <strong>{{.OrganizerName}}</strong>.</p>
<div class="highlight">
	<p style="margin: 0;"><strong>{{.EventLabel}}</strong></p>
	<p style="margin: 4px 0; color: #6b7280;">📅 {{.EventDate}}</p>
</div>
<p>Tu opinión ayuda a mejorar el servicio y, si lo deseas, puede aparecer en el portafolio público del organizador.</p>
<div style="text-align: center;">
	<a href="{{.ReviewLink}}" class="button">Dejar reseña</a>
</div>
<p style="font-size: 13px; color: #6b7280;">Este enlace es personal y puede vencer en unos días.</p>`
