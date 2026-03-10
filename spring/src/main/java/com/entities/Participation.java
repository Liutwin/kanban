package com.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.io.Serializable;

/**
 * Entité JPA représentant la participation d'un utilisateur à un tableau Kanban.
 * Mappée sur la table {@code participation_ptp} en base MariaDB.
 * La clé primaire est composite : elle est constituée des clés étrangères
 * vers {@link User} et {@link Tableau}.
 */
@Entity
@Table(name = "participation_ptp")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Participation {
    /**
     * Clé primaire composite pour l'entité {@link Participation}.
     * Combine l'identifiant de l'utilisateur et celui du tableau.
     */
    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipationId implements Serializable {

        private Long userId;
        private Long tableauId;
    }

    /**
     * Clé primaire composite constituée de l'ID utilisateur et de l'ID tableau.
     */
    @EmbeddedId
    private ParticipationId id;

    /**
     * Utilisateur participant au tableau.
     * La FK {@code usr_participant} est mappée sur {@code id.userId}.
     */
    @ManyToOne
    @MapsId("userId")
    @JoinColumn(name = "usr_participant")
    private User utilisateur;

    /**
     * Tableau auquel l'utilisateur participe.
     * La FK {@code tab_id} est mappée sur {@code id.tableauId}.
     */
    @ManyToOne
    @MapsId("tableauId")
    @JoinColumn(name = "tab_id")
    private Tableau tableau;

    /**
     * Rôle de l'utilisateur dans le tableau (ex: ADMIN, MEMBRE).
     */
    @Column(name = "ptp_role", nullable = false)
    @Enumerated(EnumType.STRING)
    private Role role = Role.LECTEUR;

    /**
     * Enumération des rôles possibles d'un utilisateur dans un tableau Kanban.
     */
    public enum Role {
        /** Peut uniquement consulter le tableau et ses tâches. */
        LECTEUR,
        /** Peut créer, modifier et déplacer des tâches. */
        EDITEUR,
        /** Accès complet : gestion des membres et du tableau. */
        ADMIN
    }
}