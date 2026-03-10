package com.dtos;

import com.entities.Tache;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Objet de transfert de données pour l'entité {@link Tache}.
 * Expose les informations d'une tâche sans les relations JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TacheDTO {

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
    private Tache.Priority priority;

    /**
     * Identifiant de la colonne contenant la tâche.
     */
    private Long colonneId;

    /**
     * Identifiant de l'utilisateur créateur.
     */
    private Long createurId;

    /**
     * Identifiant de l'utilisateur assigné, peut être null.
     */
    private Long assigneeId;
}