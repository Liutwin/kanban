package com.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

/**
 * Entité JPA en lecture seule mappée sur la vue {@code vue_profil_utilisateur}.
 *
 * <p>Cette vue agrège, pour chaque utilisateur, ses statistiques d'activité :
 * nombre de tableaux créés, de participations, de tâches créées ou assignées,
 * d'actions journalisées et date de dernière activité.</p>
 *
 * <p>L'annotation {@link Immutable} garantit qu'Hibernate ne tentera jamais
 * de générer de {@code INSERT} ou {@code UPDATE} sur cette vue.</p>
 */
@Entity
@Immutable
@Table(name = "vue_profil_utilisateur")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserView {

    /**
     * Identifiant unique de l'utilisateur — clé technique de la vue.
     */
    @Id
    @Column(name = "usr_id")
    private Long id;

    /**
     * Prénom de l'utilisateur.
     */
    @Column(name = "usr_prenom")
    private String firstName;

    /**
     * Nom de famille de l'utilisateur.
     */
    @Column(name = "usr_nom")
    private String lastName;

    /**
     * Adresse email de l'utilisateur.
     */
    @Column(name = "usr_mail")
    private String email;

    /**
     * URL de l'avatar de l'utilisateur (optionnel).
     */
    @Column(name = "usr_avatar")
    private String avatarURL;

    /**
     * Indique si l'utilisateur possède les droits d'administration.
     */
    @Column(name = "usr_admin")
    private boolean isAdmin;

    /**
     * Nombre de tableaux dont l'utilisateur est le créateur.
     */
    @Column(name = "nb_tableaux_crees")
    private Long boardsCreated;

    /**
     * Nombre de tableaux auxquels l'utilisateur participe (tous rôles confondus).
     */
    @Column(name = "nb_participations")
    private Long participations;

    /**
     * Nombre de tâches créées par l'utilisateur.
     */
    @Column(name = "nb_taches_creees")
    private Long tasksCreated;

    /**
     * Nombre de tâches assignées à l'utilisateur.
     */
    @Column(name = "nb_taches_assignees")
    private Long tasksAssigned;

    /**
     * Nombre d'entrées dans le journal dont l'utilisateur est l'auteur.
     */
    @Column(name = "nb_actions")
    private Long actions;

    /**
     * Date et heure de la dernière action journalisée.
     * {@code null} si l'utilisateur n'a encore effectué aucune action.
     */
    @Column(name = "derniere_activite")
    private LocalDateTime lastActivity;
}
