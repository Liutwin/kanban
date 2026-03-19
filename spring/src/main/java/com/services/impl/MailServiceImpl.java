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
    public void sendWelcome(String toEmail, String firstName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Bienvenue sur Kanban ✦");
            helper.setText(buildWelcomeHtml(firstName), true);

            mailSender.send(message);
            log.info("[Mail] E-mail de bienvenue envoyé à {}", toEmail);

        } catch (MessagingException e) {
            log.error("[Mail] Échec d'envoi de bienvenue à {} : {}", toEmail, e.getMessage());
        }
    }

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

    @Async
    @Override
    public void sendTaskAssigned(
            String toEmail,
            String toFirstName,
            String taskTitle,
            String boardName,
            String assignerName
    ) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Tâche assignée : « " + taskTitle + " »");
            helper.setText(buildTaskAssignedHtml(toFirstName, taskTitle, boardName, assignerName), true);

            mailSender.send(message);
            log.info("[Mail] Notification d'assignation envoyée à {} pour la tâche '{}'", toEmail, taskTitle);

        } catch (MessagingException e) {
            log.error("[Mail] Échec d'envoi d'assignation à {} : {}", toEmail, e.getMessage());
        }
    }

    @Async
    @Override
    public void sendTaskCommented(
            String toEmail,
            String toFirstName,
            String taskTitle,
            String boardName,
            String commenterName,
            String commentPreview
    ) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Nouveau commentaire sur « " + taskTitle + " »");
            helper.setText(buildTaskCommentedHtml(toFirstName, taskTitle, boardName, commenterName, commentPreview), true);

            mailSender.send(message);
            log.info("[Mail] Notification de commentaire envoyée à {} pour la tâche '{}'", toEmail, taskTitle);

        } catch (MessagingException e) {
            log.error("[Mail] Échec d'envoi de commentaire à {} : {}", toEmail, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Template HTML – bienvenue
    // ─────────────────────────────────────────────────────────────

    private String buildWelcomeHtml(String firstName) {
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
                              Bienvenue, %s&nbsp;🎉
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                              Votre compte a bien été créé. Vous pouvez dès maintenant vous connecter
                              et commencer à organiser vos projets avec des tableaux Kanban.
                            </p>

                            <!-- Bouton CTA -->
                            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                              <tr>
                                <td style="background:#b0a6ff;border-radius:8px;">
                                  <a href="%s"
                                     style="display:inline-block;padding:12px 28px;font-size:14px;
                                            font-weight:600;color:#1c1b1f;text-decoration:none;">
                                    Accéder à l'application →
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
                              Si vous n'êtes pas à l'origine de cette inscription, contactez-nous immédiatement.
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
                """.formatted(firstName, baseUrl);
    }

    // ─────────────────────────────────────────────────────────────
    // Template HTML – invitation
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

    // ─────────────────────────────────────────────────────────────
    // Template HTML – assignation de tâche
    // ─────────────────────────────────────────────────────────────

    private String buildTaskAssignedHtml(
            String firstName,
            String taskTitle,
            String boardName,
            String assignerName
    ) {
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
                              Bonjour %s&nbsp;📋
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                              <strong>%s</strong> vous a assigné·e à la tâche
                              <strong>« %s »</strong> dans le tableau
                              <strong style="color:#7c6ff0;">%s</strong>.
                            </p>

                            <!-- Bouton CTA -->
                            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                              <tr>
                                <td style="background:#b0a6ff;border-radius:8px;">
                                  <a href="%s"
                                     style="display:inline-block;padding:12px 28px;font-size:14px;
                                            font-weight:600;color:#1c1b1f;text-decoration:none;">
                                    Voir la tâche →
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
                              Si vous pensez que cette assignation est une erreur, contactez l'administrateur du tableau.
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
                """.formatted(firstName, assignerName, taskTitle, boardName, baseUrl);
    }

    // ─────────────────────────────────────────────────────────────
    // Template HTML – nouveau commentaire
    // ─────────────────────────────────────────────────────────────

    private String buildTaskCommentedHtml(
            String firstName,
            String taskTitle,
            String boardName,
            String commenterName,
            String commentPreview
    ) {
        // Tronque l'aperçu à 120 caractères pour éviter un mail trop long
        String preview = commentPreview != null && commentPreview.length() > 120
                ? commentPreview.substring(0, 120) + "…"
                : commentPreview;

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
                              Bonjour %s&nbsp;💬
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">
                              <strong>%s</strong> a commenté la tâche
                              <strong>« %s »</strong> dans le tableau
                              <strong style="color:#7c6ff0;">%s</strong>&nbsp;:
                            </p>

                            <!-- Aperçu du commentaire -->
                            <table cellpadding="0" cellspacing="0" width="100%%" style="margin:0 0 24px;">
                              <tr>
                                <td style="background:#f8f7ff;border-left:4px solid #b0a6ff;
                                           border-radius:0 8px 8px 0;padding:14px 18px;">
                                  <p style="margin:0;font-size:14px;color:#444;line-height:1.6;
                                            font-style:italic;">%s</p>
                                </td>
                              </tr>
                            </table>

                            <!-- Bouton CTA -->
                            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                              <tr>
                                <td style="background:#b0a6ff;border-radius:8px;">
                                  <a href="%s"
                                     style="display:inline-block;padding:12px 28px;font-size:14px;
                                            font-weight:600;color:#1c1b1f;text-decoration:none;">
                                    Voir la discussion →
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
                              Vous recevez cette notification car vous êtes assigné·e à cette tâche.
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
                """.formatted(firstName, commenterName, taskTitle, boardName, preview, baseUrl);
    }

    // ─────────────────────────────────────────────────────────────
    // Étape 1 : envoi du lien de confirmation
    // ─────────────────────────────────────────────────────────────

    @Async
    @Override
    public void sendPasswordResetRequest(String toEmail, String firstName, String resetLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Réinitialisation de votre mot de passe");
            helper.setText(buildPasswordResetRequestHtml(firstName, resetLink), true);

            mailSender.send(message);
            log.info("[Mail] Lien de réinitialisation envoyé à {}", toEmail);

        } catch (MessagingException e) {
            log.error("[Mail] Échec d'envoi du lien de reset à {} : {}", toEmail, e.getMessage());
        }
    }

    private String buildPasswordResetRequestHtml(String firstName, String resetLink) {
        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head><meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                </head>
                <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0"
                             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                        <tr>
                          <td style="background:#1c1b1f;padding:28px 36px;text-align:center;">
                            <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;
                                         letter-spacing:0.12em;color:#e8e0f0;text-transform:uppercase;">
                              ▦ KANBAN
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:36px 36px 28px;">
                            <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1c1b1f;">
                              Bonjour %s&nbsp;🔑
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                              Vous avez demandé la réinitialisation de votre mot de passe.
                              Cliquez sur le bouton ci-dessous pour confirmer.
                              Ce lien est valable <strong>15 minutes</strong>.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                              <tr>
                                <td style="background:#b0a6ff;border-radius:8px;">
                                  <a href="%s"
                                     style="display:inline-block;padding:12px 28px;font-size:14px;
                                            font-weight:600;color:#1c1b1f;text-decoration:none;">
                                    Réinitialiser mon mot de passe →
                                  </a>
                                </td>
                              </tr>
                            </table>
                            <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
                              Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail —
                              votre mot de passe reste inchangé.
                            </p>
                          </td>
                        </tr>
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
                """.formatted(firstName, resetLink);
    }

    // ─────────────────────────────────────────────────────────────
    // Étape 2 : envoi du mot de passe temporaire
    // ─────────────────────────────────────────────────────────────

    @Async
    @Override
    public void sendPasswordResetConfirm(String toEmail, String firstName, String tempPassword) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Votre nouveau mot de passe temporaire");
            helper.setText(buildPasswordResetConfirmHtml(firstName, tempPassword), true);

            mailSender.send(message);
            log.info("[Mail] Mot de passe temporaire envoyé à {}", toEmail);

        } catch (MessagingException e) {
            log.error("[Mail] Échec d'envoi du mdp temporaire à {} : {}", toEmail, e.getMessage());
        }
    }

    private String buildPasswordResetConfirmHtml(String firstName, String tempPassword) {
        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head><meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                </head>
                <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0"
                             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                        <tr>
                          <td style="background:#1c1b1f;padding:28px 36px;text-align:center;">
                            <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;
                                         letter-spacing:0.12em;color:#e8e0f0;text-transform:uppercase;">
                              ▦ KANBAN
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:36px 36px 28px;">
                            <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1c1b1f;">
                              Bonjour %s&nbsp;✅
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                              Votre mot de passe a bien été réinitialisé.
                              Voici votre mot de passe temporaire :
                            </p>
                            <table cellpadding="0" cellspacing="0" width="100%%" style="margin:0 0 24px;">
                              <tr>
                                <td style="background:#f8f7ff;border-left:4px solid #b0a6ff;
                                           border-radius:0 8px 8px 0;padding:14px 18px;">
                                  <p style="margin:0;font-size:20px;font-weight:700;color:#1c1b1f;
                                            font-family:'DM Mono',monospace;letter-spacing:0.1em;">%s</p>
                                </td>
                              </tr>
                            </table>
                            <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.5;">
                              Connectez-vous avec ce mot de passe temporaire puis changez-le
                              immédiatement depuis vos paramètres de compte.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                              <tr>
                                <td style="background:#b0a6ff;border-radius:8px;">
                                  <a href="%s"
                                     style="display:inline-block;padding:12px 28px;font-size:14px;
                                            font-weight:600;color:#1c1b1f;text-decoration:none;">
                                    Se connecter →
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
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
                """.formatted(firstName, tempPassword, baseUrl);
    }
}
