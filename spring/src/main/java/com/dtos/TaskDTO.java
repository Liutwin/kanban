package com.dtos;

import com.entities.Task;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Objet de transfert de données pour l'entité {@link Task}.
 * Expose les informations d'une tâche sans les relations JPA.
 *
 * <p>Utilisé en entrée (création, modification) et en sortie (lecture)
 * des endpoints REST. L'identifiant {@link #id} est en lecture seule
 * et ignoré lors de la désérialisation JSON d'une requête entrante.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {

    /**
     * Identifiant unique de la tâche.
     * Ignoré lors de la désérialisation (fourni par la base à la création).
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    /**
     * Titre court de la tâche (50 caractères maximum).
     */
    private String title;

    /**
     * Description détaillée de la tâche (256 caractères maximum), optionnelle.
     */
    private String details;

    /**
     * Date limite d'accomplissement de la tâche, optionnelle.
     */
    private LocalDateTime dueDate;

    /**
     * Niveau de priorité de la tâche ({@code basse}, {@code moyenne} ou {@code haute}).
     * Par défaut {@link Task.Priority#MEDIUM} si non renseigné.
     */
    private Task.Priority priority;

    /**
     * Indique si la tâche a été validée par un utilisateur.
     */
    private boolean isValidated;

    /**
     * Position de la tâche au sein de sa colonne (index 0-based).
     *
     * <p>En lecture, reflète l'ordre d'affichage retourné par la base.
     * En écriture (déplacement intra-colonne via
     * {@code PATCH /tasks/{id}/move}), indique la position cible.</p>
     */
    private int position;

    /**
     * Identifiant de la colonne contenant la tâche.
     */
    private Long boardColumnId;

    /**
     * Identifiant de l'utilisateur créateur de la tâche.
     */
    private Long creatorId;

    /**
     * Identifiant de l'utilisateur assigné à la tâche.
     * {@code null} si aucun utilisateur n'est assigné.
     */
    private Long assignedId;
}