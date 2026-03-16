package com.services.impl;

import com.entities.BoardMember;
import com.services.MailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Implémentation de {@link MailService} utilisant {@link JavaMailSender}.
 *
 * <p>Les envois sont asynchrones ({@code @Async}) pour ne pas bloquer
 * le thread HTTP appelant. Une erreur d'envoi est simplement loggée —
 * elle ne fait pas échouer l'opération métier.</p>
 *
 * <p>Configuration requise dans {@code application.properties} :</p>
 * <pre>
 * spring.mail.host=smtp.example.com
 * spring.mail.port=587
 * spring.mail.username=no-reply@example.com
 * spring.mail.password=secret
 * spring.mail.properties.mail.smtp.auth=true
 * spring.mail.properties.mail.smtp.starttls.enable=true
 * app.mail.from=no-reply@example.com
 * app.base-url=https://votre-app.com
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@kanban.app}")
    private String fromAddress;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    @Async
    @Override
    public void sendBoardInvitation(
            String toEmail,
            String toFirstName,
            String boardName,
            String inviterName,
            BoardMember.Role role
    ) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Vous avez été ajouté·e au tableau « " + boardName + " »");
            helper.setText(buildHtml(toFirstName, boardName, inviterName, role), true);

            mailSender.send(message);
            log.info("[Mail] Invitation envoyée à {} pour le tableau '{}'", toEmail, boardName);

        } catch (MessagingException e) {
            log.error("[Mail] Échec d'envoi à {} : {}", toEmail, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Template HTML
    // ─────────────────────────────────────────────────────────────

    private String buildHtml(
            String firstName,
            String boardName,
            String inviterName,
            BoardMember.Role role
    ) {
        String roleLabel = switch (role) {
            case ADMIN   -> "Administrateur";
            case EDITEUR -> "Éditeur";
            case LECTEUR -> "Lecteur";
        };

        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                </head>
                <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0"
                             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

                        <!-- En-tête -->
                        <tr>
                          <td style="background:#1c1b1f;padding:28px 36px;text-align:center;">
                            <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;
                                         letter-spacing:0.12em;color:#e8e0f0;text-transform:uppercase;">
                              ▦ KANBAN
                            </span>
                          </td>
                        </tr>

                        <!-- Corps -->
                        <tr>
                          <td style="padding:36px 36px 28px;">
                            <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1c1b1f;">
                              Bonjour %s&nbsp;👋
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                              <strong>%s</strong> vous a ajouté·e au tableau
                              <strong>« %s »</strong> avec le rôle
                              <strong style="color:#7c6ff0;">%s</strong>.
                            </p>

                            <!-- Bouton CTA -->
                            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                              <tr>
                                <td style="background:#b0a6ff;border-radius:8px;">
                                  <a href="%s"
                                     style="display:inline-block;padding:12px 28px;font-size:14px;
                                            font-weight:600;color:#1c1b1f;text-decoration:none;">
                                    Accéder au tableau →
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
                              Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.
                            </p>
                          </td>
                        </tr>

                        <!-- Pied de page -->
                        <tr>
                          <td style="background:#f4f4f5;padding:16px 36px;text-align:center;
                                     border-top:1px solid #e8e8e8;">
                            <p style="margin:0;font-size:11px;color:#aaa;">
                              Cet e-mail a été envoyé automatiquement — merci de ne pas y répondre.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(firstName, inviterName, boardName, roleLabel, baseUrl);
    }
}
