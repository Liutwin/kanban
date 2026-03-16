package com.entities;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entité JPA représentant une tâche dans une colonne d'un tableau Kanban.
 * Mappée sur la table {@code tache_tsk} en base MariaDB.
 *
 * <p>Les logs de création, déplacement et modification sont gérés
 * automatiquement par les triggers SQL {@code before_insert_tache},
 * {@code after_insert_tache} et {@code after_update_tache}.</p>
 *
 * <p>L'ordre des tâches au sein d'une colonne est défini par le champ
 * {@link #position} (index 0-based). La contrainte {@code uq_tsk_position_col}
 * garantit l'unicité de la position par colonne. Lors d'un réordonnancement,
 * le service décale les tâches voisines via
 * {@link com.repositories.TaskRepository#shiftPositions}.</p>
 */
@Entity
@Table(name = "tache_tsk")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    /**
     * Identifiant unique auto-généré de la tâche.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tsk_id")
    private Long id;

    /**
     * Titre court de la tâche.
     */
    @Column(name = "tsk_titre", nullable = false, length = 50)
    private String title;

    /**
     * Description détaillée de la tâche, optionnelle.
     */
    @Column(name = "tsk_details", length = 256)
    private String details;

    /**
     * Date limite d'accomplissement de la tâche, optionnelle.
     */
    @Column(name = "tsk_datelimite")
    private LocalDateTime dueDate;

    /**
     * Niveau de priorité de la tâche.
     * Géré via un converter pour correspondre aux valeurs SQL en minuscules.
     */
    @Convert(converter = Task.Priority.PriorityConverter.class)
    @Column(name = "tsk_priorite", nullable = false, length = 10)
    private Priority priority = Priority.MEDIUM;

    /**
     * Indique si la tâche est considérée comme effectuée.
     * {@code true} pour un tâche validée, {@code false} sinon.
     * Valeur par défaut : {@code false}.
     */
    @Column(name = "tsk_validee", nullable = false)
    private boolean isValidated = false;

    /**
     * Position de la tâche au sein de sa colonne (index 0-based).
     *
     * <p>Garantit l'ordre d'affichage dans la colonne. La contrainte
     * {@code uq_tsk_position_col} en base interdit deux tâches d'une même
     * colonne d'avoir la même valeur. À la création, le trigger
     * {@code before_insert_tache} calcule automatiquement
     * {@code MAX(tsk_position) + 1} dans la colonne cible.</p>
     *
     * <p>Lors d'un réordonnancement, le service appelle
     * {@link com.repositories.TaskRepository#shiftPositions} pour décaler
     * les tâches situées entre l'ancienne et la nouvelle position avant
     * de mettre à jour cette valeur.</p>
     */
    @Column(name = "tsk_position", nullable = false)
    private int position;

    /**
     * Colonne dans laquelle se trouve la tâche.
     */
    @ManyToOne
    @JoinColumn(name = "col_id", nullable = false)
    private BoardColumn boardColumn;

    /**
     * Utilisateur ayant créé la tâche.
     */
    @ManyToOne
    @JoinColumn(name = "usr_createur", nullable = false)
    private User creator;

    /**
     * Utilisateur assigné à la tâche, optionnel.
     * Mis à NULL en base si l'utilisateur est supprimé (ON DELETE SET NULL).
     */
    @ManyToOne
    @JoinColumn(name = "usr_assignee")
    private User assigned;

    // =========================================================================

    /**
     * Enumération des niveaux de priorité d'une tâche.
     * Les valeurs sont stockées en minuscules en base de données
     * ({@code basse}, {@code moyenne}, {@code haute}).
     */
    public enum Priority {

        /** Priorité basse. */
        LOW("basse"),

        /** Priorité moyenne (valeur par défaut). */
        MEDIUM("moyenne"),

        /** Priorité haute. */
        HIGH("haute");

        private final String value;

        Priority(String value) {
            this.value = value;
        }

        /**
         * Retourne la valeur string stockée en base et sérialisée en JSON.
         *
         * @return la valeur minuscule correspondant à ce niveau de priorité
         */
        @JsonValue
        public String getValue() {
            return value;
        }

        /**
         * Désérialise une valeur string JSON vers l'enum correspondant.
         *
         * @param value la valeur string à convertir ({@code "basse"},
         *              {@code "moyenne"} ou {@code "haute"})
         * @return l'enum correspondant
         * @throws IllegalArgumentException si la valeur est inconnue ou nulle
         */
        @JsonCreator
        public static Priority fromValue(String value) {
            if (value == null) return null;
            for (Priority p : Priority.values()) {
                if (p.value.equals(value)) return p;
            }
            throw new IllegalArgumentException("Priorité inconnue : " + value);
        }

        /**
         * Converter JPA pour persister les valeurs en minuscules
         * conformément au schéma SQL ({@code ENUM('basse','moyenne','haute')}).
         */
        @Converter(autoApply = false)
        public static class PriorityConverter implements AttributeConverter<Priority, String> {

            /**
             * Convertit l'enum Java en valeur SQL minuscule.
             *
             * @param priority la priorité à convertir, peut être {@code null}
             * @return la valeur string correspondante, ou {@code null}
             */
            @Override
            public String convertToDatabaseColumn(Priority priority) {
                return priority == null ? null : priority.value;
            }

            /**
             * Convertit une valeur SQL en enum Java.
             *
             * @param value la valeur lue en base
             * @return l'enum correspondant
             * @throws IllegalArgumentException si la valeur est inconnue
             */
            @Override
            public Priority convertToEntityAttribute(String value) {
                return fromValue(value);
            }
        }
    }
}