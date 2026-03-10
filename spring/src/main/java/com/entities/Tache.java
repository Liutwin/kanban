package com.entities;

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
 * automatiquement par les triggers SQL {@code after_insert_tache}
 * et {@code after_update_tache}.</p>
 */
@Entity
@Table(name = "tache_tsk")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tache {

    /**
     * Identifiant unique auto-généré de la tâche.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @jakarta.persistence.Column(name = "tsk_id")
    private Long id;

    /**
     * Titre court de la tâche.
     */
    @jakarta.persistence.Column(name = "tsk_titre", nullable = false, length = 50)
    private String titre;

    /**
     * Description détaillée de la tâche, optionnelle.
     */
    @jakarta.persistence.Column(name = "tsk_details", length = 256)
    private String details;

    /**
     * Date limite d'accomplissement de la tâche, optionnelle.
     */
    @jakarta.persistence.Column(name = "tsk_datelimite")
    private LocalDateTime dateLimite;

    /**
     * Niveau de priorité de la tâche.
     * Géré via un converter pour correspondre aux valeurs SQL en minuscules.
     */
    @Convert(converter = Tache.Priority.PriorityConverter.class)
    @jakarta.persistence.Column(name = "tsk_priorite", nullable = false, length = 10)
    private Priority priorite = Priority.MOYENNE;

    /**
     * Colonne dans laquelle se trouve la tâche.
     */
    @ManyToOne
    @JoinColumn(name = "col_id", nullable = false)
    private Colonne colonne;

    /**
     * Utilisateur ayant créé la tâche.
     */
    @ManyToOne
    @JoinColumn(name = "usr_createur", nullable = false)
    private Utilisateur createur;

    /**
     * Utilisateur assigné à la tâche, optionnel.
     * Mis à NULL en base si l'utilisateur est supprimé (ON DELETE SET NULL).
     */
    @ManyToOne
    @JoinColumn(name = "usr_assignee")
    private Utilisateur assignee;

    // ============================================

    /**
     * Enumération des niveaux de priorité d'une tâche.
     * Les valeurs sont stockées en minuscules en base de données.
     */
    public enum Priority {

        BASSE("basse"),
        MOYENNE("moyenne"),
        HAUTE("haute");

        private final String value;

        Priority(String value) {
            this.value = value;
        }

        /**
         * Converter JPA pour persister les valeurs en minuscules
         * conformément au schéma SQL.
         */
        @Converter(autoApply = false)
        public static class PriorityConverter implements AttributeConverter<Priority, String> {

            /**
             * Convertit l'enum Java en valeur SQL minuscule.
             *
             * @param priority la priorité à convertir
             * @return la valeur string correspondante en base
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
                if (value == null) return null;
                for (Priority p : Priority.values()) {
                    if (p.value.equals(value)) return p;
                }
                throw new IllegalArgumentException("Priorité inconnue : " + value);
            }
        }
    }
}