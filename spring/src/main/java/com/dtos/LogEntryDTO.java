package com.dtos;

import com.entities.LogEntry;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Objet de transfert de données pour l'entité {@link LogEntry}.
 * Expose les informations d'une entrée de journal sans les relations JPA.
 *
 * <p>Le journal est en lecture seule : ce DTO n'est utilisé qu'en sortie
 * des endpoints REST. Tous les champs sont annotés
 * {@link JsonProperty.Access#READ_ONLY} par convention, à l'exception
 * de {@link #type} qui peut servir de critère de filtre dans les requêtes
 * entrantes (paramètre de query string {@code ?type=}).</p>
 *
 * <p>Les identifiants des entités liées ({@link #authorId}, {@link #taskId},
 * {@link #boardId}) peuvent être {@code null} si l'entité référencée a été
 * supprimée depuis la création du log.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LogEntryDTO {

    /**
     * Identifiant unique de l'entrée de journal.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    /**
     * Type de l'action journalisée ({@code creation}, {@code deplacement}
     * ou {@code modification}).
     */
    private LogEntry.LogType type;

    /**
     * Date et heure de l'action.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime date;

    /**
     * Description textuelle générée par le trigger SQL, optionnelle.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String description;

    /**
     * Identifiant de l'utilisateur à l'origine de l'action.
     * {@code null} si l'utilisateur a été supprimé.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long authorId;

    /**
     * Identifiant de la tâche concernée par l'action.
     * {@code null} si la tâche a été supprimée.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long taskId;

    /**
     * Identifiant du tableau dans lequel l'action a eu lieu.
     * {@code null} si le tableau a été supprimé.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long boardId;
}
