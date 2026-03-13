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
 * vers {@link User} et {@link Board}.
 */
@Entity
@jakarta.persistence.Table(name = "participation_ptp")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardMember {
    /**
     * Clé primaire composite pour l'entité {@link BoardMember}.
     * Combine l'identifiant de l'utilisateur et celui du tableau.
     */
    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipationId implements Serializable {

        private Long userId;
        private Long boardId;
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
    private User user;

    /**
     * Tableau auquel l'utilisateur participe.
     * La FK {@code tab_id} est mappée sur {@code id.boardId}.
     */
    @ManyToOne
    @MapsId("boardId")
    @JoinColumn(name = "tab_id")
    private Board board;

    /**
     * Rôle de l'utilisateur dans le tableau (ex: ADMIN, MEMBRE).
     */
    @Column(name = "ptp_role", nullable = false)
    @Convert(converter = BoardMember.RoleConverter.class)
    private Role role = Role.LECTEUR;

    /**
     * Enumération des rôles possibles d'un utilisateur dans un tableau Kanban.
     */
    public enum Role {
        /** Peut uniquement consulter le tableau et ses tâches. */
        LECTEUR("lecteur"),
        /** Peut créer, modifier et déplacer des tâches. */
        EDITEUR("editeur"),
        /** Accès complet : gestion des membres et du tableau. */
        ADMIN("admin");

        private final String value;

        Role(String value) { this.value = value; }

        @Override
        public String toString() { return value; }
    }

    @Converter(autoApply = true)
    public static class RoleConverter implements AttributeConverter<Role, String> {

        @Override
        public String convertToDatabaseColumn(Role role) {
            return role == null ? null : role.toString();
        }

        @Override
        public Role convertToEntityAttribute(String value) {
            if (value == null) return null;
            for (Role role : Role.values()) {
                if (role.toString().equals(value)) return role;
            }
            throw new IllegalArgumentException("Rôle inconnu : " + value);
        }
    }
}