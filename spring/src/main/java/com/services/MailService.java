package com.services;

import com.entities.BoardMember;

/**
 * Service d'envoi d'e-mails transactionnels.
 */
public interface MailService {

    /**
     * Envoie un e-mail de bienvenue à un nouvel utilisateur après son inscription.
     *
     * @param toEmail     adresse de l'utilisateur inscrit
     * @param firstName   prénom de l'utilisateur
     */
    void sendWelcome(String toEmail, String firstName);

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

    /**
     * Notifie un utilisateur qu'une tâche vient de lui être assignée.
     *
     * @param toEmail       adresse de l'utilisateur assigné
     * @param toFirstName   prénom de l'utilisateur assigné
     * @param taskTitle     titre de la tâche
     * @param boardName     nom du tableau contenant la tâche
     * @param assignerName  nom complet de la personne qui a effectué l'assignation
     */
    void sendTaskAssigned(
            String toEmail,
            String toFirstName,
            String taskTitle,
            String boardName,
            String assignerName
    );

    /**
     * Notifie l'assigné·e d'une tâche qu'un nouveau commentaire y a été posté.
     *
     * @param toEmail         adresse de l'utilisateur assigné
     * @param toFirstName     prénom de l'utilisateur assigné
     * @param taskTitle       titre de la tâche commentée
     * @param boardName       nom du tableau contenant la tâche
     * @param commenterName   nom complet de l'auteur du commentaire
     * @param commentPreview  extrait du commentaire (tronqué si nécessaire)
     */
    void sendTaskCommented(
            String toEmail,
            String toFirstName,
            String taskTitle,
            String boardName,
            String commenterName,
            String commentPreview
    );
}
