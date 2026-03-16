package com.services;

import com.entities.BoardMember;

/**
 * Service d'envoi d'e-mails transactionnels.
 */
public interface MailService {

    /**
     * Notifie un utilisateur qu'il vient d'être ajouté à un tableau Kanban.
     *
     * @param toEmail       adresse de l'utilisateur invité
     * @param toFirstName   prénom de l'utilisateur invité
     * @param boardName     nom du tableau
     * @param inviterName   nom complet de la personne qui a fait l'invitation
     * @param role          rôle attribué dans le tableau
     */
    void sendBoardInvitation(
            String toEmail,
            String toFirstName,
            String boardName,
            String inviterName,
            BoardMember.Role role
    );
}
