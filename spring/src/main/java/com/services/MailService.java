package com.services;

import com.entities.BoardMember;

/**
 * Service d'envoi d'e-mails transactionnels.
 */
public interface MailService {

    void sendWelcome(String toEmail, String firstName);

    void sendBoardInvitation(
            String toEmail,
            String toFirstName,
            String boardName,
            String inviterName,
            BoardMember.Role role
    );

    void sendTaskAssigned(
            String toEmail,
            String toFirstName,
            String taskTitle,
            String boardName,
            String assignerName
    );

    void sendTaskCommented(
            String toEmail,
            String toFirstName,
            String taskTitle,
            String boardName,
            String commenterName,
            String commentPreview
    );

    /**
     * Envoie le lien de confirmation de réinitialisation (étape 1).
     * Le mot de passe n'est pas encore modifié à ce stade.
     *
     * @param toEmail    adresse de l'utilisateur
     * @param firstName  prénom de l'utilisateur
     * @param resetLink  lien complet (baseUrl/reset-password?token=...)
     */
    void sendPasswordResetRequest(String toEmail, String firstName, String resetLink);

    /**
     * Envoie le mot de passe temporaire après confirmation du token (étape 2).
     *
     * @param toEmail      adresse de l'utilisateur
     * @param firstName    prénom de l'utilisateur
     * @param tempPassword mot de passe temporaire en clair
     */
    void sendPasswordResetConfirm(String toEmail, String firstName, String tempPassword);
}
