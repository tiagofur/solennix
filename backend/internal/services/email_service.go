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

// SendPasswordReset sends password reset email with token
func (s *EmailService) SendPasswordReset(email, token, userName string) error {
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.FrontendURL, token)

	htmlBody := s.generatePasswordResetHTML(userName, resetLink)

	subject := "Recuperación de Contraseña - Solennix"
	return s.sendEmail(email, subject, htmlBody)
}

func (s *EmailService) generatePasswordResetHTML(userName, resetLink string) string {
	tmpl := `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperar Contraseña</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
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
            color: #f97316;
            margin: 0;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #f97316;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #ea580c;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .expiry {
            font-weight: 600;
            color: #dc2626;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>Solennix</h1>
        </div>

        <p>Hola {{.UserName}},</p>

        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Solennix.</p>

        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>

        <div style="text-align: center;">
            <a href="{{.ResetLink}}" class="button">Restablecer Contraseña</a>
        </div>

        <div class="warning">
            <p style="margin: 0;">
                <strong>⏱️ Este enlace es válido por <span class="expiry">1 hora</span>.</strong>
            </p>
        </div>

        <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.</p>

        <p>Si tienes problemas con el botón, copia y pega el siguiente enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #3b82f6;">{{.ResetLink}}</p>

        <div class="footer">
            <p>Solennix — La plataforma de eventos de élite</p>
            <p>Este es un correo automático. Por favor, no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
`

	t := template.Must(template.New("email").Parse(tmpl))
	var buf bytes.Buffer
	_ = t.Execute(&buf, map[string]string{
		"UserName":  userName,
		"ResetLink": resetLink,
	})

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
