package com.dtos;

import com.entities.UserView;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Objet de transfert de données pour la vue {@link UserView}.
 * Expose le profil statistique d'un utilisateur via l'API REST,
 * à destination des écrans d'administration.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserViewDTO {

    /**
     * Identifiant unique de l'utilisateur.
     */
    private Long id;

    /**
     * Prénom de l'utilisateur.
     */
    private String firstName;

    /**
     * Nom de famille de l'utilisateur.
     */
    private String lastName;

    /**
     * Adresse email de l'utilisateur.
     */
    private String email;

    /**
     * URL de l'avatar de l'utilisateur (optionnel).
     */
    private String avatarURL;

    /**
     * Indique si l'utilisateur possède les droits d'administration.
     */
    private boolean isAdmin;

    /**
     * Nombre de tableaux dont l'utilisateur est le créateur.
     */
    private Long boardsCreated;

    /**
     * Nombre de tableaux auxquels l'utilisateur participe (tous rôles confondus).
     */
    private Long participations;

    /**
     * Nombre de tâches créées par l'utilisateur.
     */
    private Long tasksCreated;

    /**
     * Nombre de tâches assignées à l'utilisateur.
     */
    private Long tasksAssigned;

    /**
     * Nombre d'entrées dans le journal dont l'utilisateur est l'auteur.
     */
    private Long actions;

    /**
     * Date et heure de la dernière action journalisée.
     * {@code null} si l'utilisateur n'a encore effectué aucune action.
     */
    private LocalDateTime lastActivity;
}
