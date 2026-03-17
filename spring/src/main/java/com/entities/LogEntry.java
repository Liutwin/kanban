package com.entities;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entité JPA représentant une entrée du journal d'activité Kanban.
 * Mappée sur la table {@code journal_log} en base MariaDB.
 *
 * <p>Les entrées sont générées automatiquement par les triggers SQL
 * {@code after_insert_tache} et {@code after_update_tache}. Elles sont
 * en lecture seule côté application : aucun endpoint de création ou de
 * modification n'est exposé.</p>
 *
 * <p>Les trois clés étrangères {@link #author}, {@link #task} et
 * {@link #board} sont toutes optionnelles ({@code ON DELETE SET NULL} /
 * {@code ON DELETE SET NULL}) : une entrée de log peut persister après
 * la suppression de l'entité référencée.</p>
 */
@Entity
@Table(name = "journal_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LogEntry {

    /**
     * Identifiant unique auto-généré de l'entrée de journal.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long id;

    /**
     * Type de l'action journalisée.
     * Géré via un converter pour correspondre aux valeurs SQL en minuscules.
     */
    @Convert(converter = LogEntry.LogType.LogTypeConverter.class)
    @Column(name = "log_type", nullable = false, length = 15)
    private LogType type;

    /**
     * Date et heure de l'action, définie par le trigger SQL
     * ({@code DEFAULT CURRENT_TIMESTAMP}).
     */
    @Column(name = "log_date", nullable = false)
    private LocalDateTime date;

    /**
     * Description textuelle de l'action (256 caractères maximum), optionnelle.
     * Générée par le trigger sous la forme {@code "Tâche créée : <titre>"}.
     */
    @Column(name = "log_description", length = 256)
    private String description;

    /**
     * Utilisateur à l'origine de l'action, optionnel.
     * Mis à {@code NULL} en base si l'utilisateur est supprimé
     * ({@code ON DELETE SET NULL}).
     */
    @ManyToOne
    @JoinColumn(name = "usr_auteur")
    private User author;

    /**
     * Tâche concernée par l'action, optionnelle.
     * Mis à {@code NULL} en base si la tâche est supprimée
     * ({@code ON DELETE SET NULL}).
     */
    @ManyToOne
    @JoinColumn(name = "tsk_id")
    private Task task;

    /**
     * Tableau dans lequel l'action a eu lieu, optionnel.
     * Mis à {@code NULL} en base si le tableau est supprimé
     * ({@code ON DELETE SET NULL}).
     */
    @ManyToOne
    @JoinColumn(name = "tab_id")
    private Board board;

    // =========================================================================

    /**
     * Énumération des types d'actions journalisées.
     * Les valeurs sont stockées en minuscules en base de données
     * ({@code creation}, {@code deplacement}, {@code modification}).
     */
    public enum LogType {

        /** Création d'une tâche. */
        CREATION("creation"),

        /** Déplacement d'une tâche (inter-colonnes ou réordonnancement). */
        DEPLACEMENT("deplacement"),

        /** Modification des champs métier d'une tâche sans déplacement. */
        MODIFICATION("modification");

        private final String value;

        LogType(String value) {
            this.value = value;
        }

        /**
         * Retourne la valeur string stockée en base et sérialisée en JSON.
         *
         * @return la valeur minuscule correspondant à ce type d'action
         */
        @JsonValue
        public String getValue() {
            return value;
        }

        /**
         * Désérialise une valeur string JSON vers l'enum correspondant.
         *
         * @param value la valeur string à convertir ({@code "creation"},
         *              {@code "deplacement"} ou {@code "modification"})
         * @return l'enum correspondant
         * @throws IllegalArgumentException si la valeur est inconnue ou nulle
         */
        @JsonCreator
        public static LogType fromValue(String value) {
            if (value == null) return null;
            for (LogType t : LogType.values()) {
                if (t.value.equals(value)) return t;
            }
            throw new IllegalArgumentException("Type de log inconnu : " + value);
        }

        /**
         * Converter JPA pour persister les valeurs en minuscules
         * conformément au schéma SQL
         * ({@code ENUM('creation','deplacement','modification')}).
         */
        @Converter(autoApply = false)
        public static class LogTypeConverter
                implements AttributeConverter<LogType, String> {

            /**
             * Convertit l'enum Java en valeur SQL minuscule.
             *
             * @param type le type à convertir, peut être {@code null}
             * @return la valeur string correspondante, ou {@code null}
             */
            @Override
            public String convertToDatabaseColumn(LogType type) {
                return type == null ? null : type.value;
            }

            /**
             * Convertit une valeur SQL en enum Java.
             *
             * @param value la valeur lue en base
             * @return l'enum correspondant
             * @throws IllegalArgumentException si la valeur est inconnue
             */
            @Override
            public LogType convertToEntityAttribute(String value) {
                return fromValue(value);
            }
        }
    }
}
