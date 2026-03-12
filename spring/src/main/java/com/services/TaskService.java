package com.services;

import com.dtos.TaskDTO;
import com.entities.Task;

import java.util.List;

/**
 * Interface du service métier pour la gestion des tâches Kanban.
 * Définit le contrat des opérations CRUD disponibles sur les tâches.
 */
public interface TaskService {

    /**
     * Récupère toutes les tâches d'une colonne.
     *
     * @param colonneId l'identifiant de la colonne
     * @return liste de {@link TaskDTO}
     */
    List<TaskDTO> getTasksByBoardColumn(Long colonneId);

    /**
     * Récupère toutes les tâches assignées à un utilisateur.
     *
     * @param assignedId l'identifiant de l'utilisateur
     * @return liste de {@link TaskDTO}
     */
    List<TaskDTO> getTasksByAssigned(Long assignedId);

    /**
     * Récupère les tâches d'une colonne filtrées par priorité.
     *
     * @param colonneId l'identifiant de la colonne
     * @param priorite  le niveau de priorité recherché
     * @return liste de {@link TaskDTO}
     */
    List<TaskDTO> getTasksByColumnAndPriority(Long colonneId, Task.Priority priorite);

    /**
     * Récupère une tâche par son identifiant.
     *
     * @param id l'identifiant de la tâche
     * @return le {@link TaskDTO} correspondant
     * @throws RuntimeException si la tâche n'est pas trouvée
     */
    TaskDTO getTaskById(Long id);

    /**
     * Crée une nouvelle tâche.
     *
     * @param dto les données de la nouvelle tâche
     * @return le {@link TaskDTO} créé avec son ID généré
     * @throws RuntimeException si la colonne ou le créateur n'existe pas
     */
    TaskDTO createTask(TaskDTO dto);

    /**
     * Met à jour une tâche existante.
     *
     * @param id  l'identifiant de la tâche à modifier
     * @param dto les nouvelles données
     * @return le {@link TaskDTO} mis à jour
     * @throws RuntimeException si la tâche n'est pas trouvée
     */
    TaskDTO updateTask(Long id, TaskDTO dto);

    /**
     * Assigne une tâche à un utilisateur.
     *
     * @param id         l'identifiant de la tâche
     * @param assigneeId l'identifiant de l'utilisateur à assigner, null pour désassigner
     * @return le {@link TaskDTO} mis à jour
     * @throws RuntimeException si la tâche n'est pas trouvée
     */
    TaskDTO assignTask(Long id, Long assigneeId);

    /**
     * Déplace une tâche vers une autre colonne.
     *
     * @param id        l'identifiant de la tâche
     * @param colonneId l'identifiant de la colonne cible
     * @return le {@link TaskDTO} mis à jour
     * @throws RuntimeException si la tâche ou la colonne n'est pas trouvée
     */
    TaskDTO moveTask(Long id, Long colonneId);

    /**
     * Supprime une tâche par son identifiant.
     *
     * @param id l'identifiant de la tâche à supprimer
     * @throws RuntimeException si la tâche n'est pas trouvée
     */
    void deleteTask(Long id);
}