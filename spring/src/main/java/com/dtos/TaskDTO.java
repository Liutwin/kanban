package com.dtos;

import com.entities.Task;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Objet de transfert de données pour l'entité {@link Task}.
 * Expose les informations d'une tâche sans les relations JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {

    /**
     * Identifiant unique de la tâche.
     */
    private Long id;

    /**
     * Titre de la tâche.
     */
    private String titre;

    /**
     * Description détaillée de la tâche.
     */
    private String details;

    /**
     * Date limite d'accomplissement.
     */
    private LocalDateTime dateLimite;

    /**
     * Niveau de priorité de la tâche.
     */
    private Task.Priority priority;

    /**
     * Identifiant de la colonne contenant la tâche.
     */
    private Long boardColumnId;

    /**
     * Identifiant de l'utilisateur créateur.
     */
    private Long creatorId;

    /**
     * Identifiant de l'utilisateur assigné, peut être null.
     */
    private Long assigneeId;
}