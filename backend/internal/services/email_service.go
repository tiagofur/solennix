package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log/slog"

	"github.com/resend/resend-go/v3"
	"github.com/tiagofur/solennix-backend/internal/config"
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
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.FrontendURL, token)
	body := s.renderTemplate(passwordResetBody, map[string]string{
		"UserName":  userName,
		"ResetLink": resetLink,
	})
	return s.sendEmail(email, "Recuperación de Contraseña - Solennix", body)
}

// SendWelcome sends a welcome/onboarding email after registration.
func (s *EmailService) SendWelcome(email, userName string) error {
	dashboardLink := fmt.Sprintf("%s/dashboard", s.cfg.FrontendURL)
	body := s.renderTemplate(welcomeBody, map[string]string{
		"UserName":      userName,
		"DashboardLink": dashboardLink,
	})
	return s.sendEmail(email, "¡Bienvenido a Solennix! 🎉", body)
}

// SendEventReminder sends a reminder about an upcoming event.
func (s *EmailService) SendEventReminder(email, userName, eventName, eventDate, eventLink string) error {
	body := s.renderTemplate(eventReminderBody, map[string]string{
		"UserName":  userName,
		"EventName": eventName,
		"EventDate": eventDate,
		"EventLink": eventLink,
	})
	return s.sendEmail(email, fmt.Sprintf("Recordatorio: %s es mañana", eventName), body)
}

// SendPaymentReceipt sends a payment confirmation email.
func (s *EmailService) SendPaymentReceipt(email, userName, eventName, amount, paymentDate string) error {
	body := s.renderTemplate(paymentReceiptBody, map[string]string{
		"UserName":    userName,
		"EventName":   eventName,
		"Amount":      amount,
		"PaymentDate": paymentDate,
	})
	return s.sendEmail(email, fmt.Sprintf("Pago registrado: %s", amount), body)
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
	body := s.renderTemplate(collaboratorAssignedBody, map[string]string{
		"StaffName": staffName,
		"OrgName":   orgName,
		"EventName": eventName,
		"EventDate": eventDate,
		"Role":      role,
		"Fee":       fee,
	})
	return s.sendEmail(email, fmt.Sprintf("%s te asignó a un evento", orgName), body)
}

// SendQuotationReceived sends a notification reminding the user about an unconfirmed quotation.
func (s *EmailService) SendQuotationReceived(email, userName, eventName, eventDate, quotationLink string) error {
	body := s.renderTemplate(quotationReceivedBody, map[string]string{
		"UserName":      userName,
		"EventName":     eventName,
		"EventDate":     eventDate,
		"QuotationLink": quotationLink,
	})
	return s.sendEmail(email, fmt.Sprintf("Cotización pendiente: %s", eventName), body)
}

// SendSubscriptionConfirmation sends a plan upgrade/renewal confirmation.
func (s *EmailService) SendSubscriptionConfirmation(email, userName, planName string) error {
	body := s.renderTemplate(subscriptionConfirmationBody, map[string]string{
		"UserName": userName,
		"PlanName": planName,
	})
	return s.sendEmail(email, fmt.Sprintf("Tu plan %s está activo - Solennix", planName), body)
}

// SendWeeklySummary sends a weekly summary of upcoming events and payments.
func (s *EmailService) SendWeeklySummary(email, userName, nextEventsHTML, paymentsHTML string) error {
	body := s.renderTemplate(weeklySummaryBody, map[string]string{
		"UserName":      userName,
		"NextEvents":    nextEventsHTML,
		"PaymentsSummary": paymentsHTML,
	})
	return s.sendEmail(email, "Tu Resumen Semanal - Solennix", body)
}

// SendMarketingUpdate sends marketing/tips email.
func (s *EmailService) SendMarketingUpdate(email, userName, tipsHTML string) error {
	body := s.renderTemplate(marketingUpdateBody, map[string]string{
		"UserName": userName,
		"Tips":     tipsHTML,
	})
	return s.sendEmail(email, "Tips y Novedades - Solennix", body)
}

// ---------------------------------------------------------------------------
// Base Layout & Template Rendering
// ---------------------------------------------------------------------------

func (s *EmailService) renderTemplate(bodyTemplate string, data map[string]string) string {
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

const passwordResetBody = `
<p>Hola {{.UserName}},</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Solennix.</p>
<p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
<div style="text-align: center;">
    <a href="{{.ResetLink}}" class="button">Restablecer Contraseña</a>
</div>
<div class="highlight">
    <p style="margin: 0;">⏱️ Este enlace es válido por <strong style="color: #dc2626;">1 hora</strong>.</p>
</div>
<p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
<p style="word-break: break-all; font-size: 13px; color: #6b7280;">{{.ResetLink}}</p>`

const welcomeBody = `
<p>Hola {{.UserName}},</p>
<p>¡Bienvenido a <strong>Solennix</strong>! Tu cuenta ha sido creada exitosamente.</p>
<p>Solennix te ayuda a gestionar tus eventos de forma profesional: clientes, cotizaciones, inventario, pagos y más — todo en un solo lugar.</p>
<div class="highlight">
    <p style="margin: 0 0 8px 0;"><strong>Primeros pasos:</strong></p>
    <p style="margin: 4px 0;">1. Agrega tu primer cliente</p>
    <p style="margin: 4px 0;">2. Crea tu catálogo de productos</p>
    <p style="margin: 4px 0;">3. Registra tu primer evento</p>
</div>
<div style="text-align: center;">
    <a href="{{.DashboardLink}}" class="button">Ir al Dashboard</a>
</div>
<p>Si tienes dudas, estamos aquí para ayudarte.</p>`

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
