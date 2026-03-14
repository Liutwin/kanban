package com.services;

import com.dtos.TaskDTO;
import com.entities.Task;
import com.exceptions.ForbiddenException;

import java.util.List;

/**
 * Interface du service métier pour la gestion des tâches Kanban.
 * Définit le contrat des opérations CRUD disponibles sur les tâches.
 *
 * <p>Les opérations d'écriture (création, modification, déplacement,
 * assignation, suppression) acceptent un {@code requesterId} afin de
 * vérifier que l'utilisateur est bien membre du tableau concerné avant
 * d'exécuter l'opération. En cas de violation, une {@link ForbiddenException}
 * est levée (HTTP 403).</p>
 */
public interface TaskService {

    /**
     * Récupère toutes les tâches d'une colonne.
     *
     * @param colonneId   l'identifiant de la colonne
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link TaskDTO}
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    List<TaskDTO> getTasksByBoardColumn(Long colonneId, Long requesterId);

    /**
     * Récupère toutes les tâches assignées à un utilisateur.
     *
     * <p>Aucune vérification d'appartenance au tableau n'est effectuée ici :
     * un utilisateur peut toujours consulter ses propres tâches.</p>
     *
     * @param assignedId l'identifiant de l'utilisateur
     * @return liste de {@link TaskDTO}
     */
    List<TaskDTO> getTasksByAssigned(Long assignedId);

    /**
     * Récupère les tâches d'une colonne filtrées par priorité.
     *
     * @param colonneId   l'identifiant de la colonne
     * @param priorite    le niveau de priorité recherché
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link TaskDTO}
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    List<TaskDTO> getTasksByColumnAndPriority(Long colonneId, Task.Priority priorite, Long requesterId);

    /**
     * Récupère une tâche par son identifiant.
     *
     * @param id          l'identifiant de la tâche
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link TaskDTO} correspondant
     * @throws RuntimeException   si la tâche n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    TaskDTO getTaskById(Long id, Long requesterId);

    /**
     * Crée une nouvelle tâche.
     *
     * @param dto         les données de la nouvelle tâche
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link TaskDTO} créé avec son identifiant généré
     * @throws RuntimeException   si la colonne ou le créateur n'existe pas
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    TaskDTO createTask(TaskDTO dto, Long requesterId);

    /**
     * Met à jour une tâche existante.
     *
     * @param id          l'identifiant de la tâche à modifier
     * @param dto         les nouvelles données
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link TaskDTO} mis à jour
     * @throws RuntimeException   si la tâche n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    TaskDTO updateTask(Long id, TaskDTO dto, Long requesterId);

    /**
     * Assigne une tâche à un utilisateur.
     *
     * @param id          l'identifiant de la tâche
     * @param assigneeId  l'identifiant de l'utilisateur à assigner,
     *                    {@code null} pour retirer l'assignation
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link TaskDTO} mis à jour
     * @throws RuntimeException   si la tâche n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    TaskDTO assignTask(Long id, Long assigneeId, Long requesterId);

    /**
     * Déplace une tâche vers une autre colonne du même tableau.
     *
     * @param id          l'identifiant de la tâche
     * @param colonneId   l'identifiant de la colonne cible
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link TaskDTO} mis à jour
     * @throws RuntimeException     si la tâche ou la colonne n'est pas trouvée
     * @throws IllegalArgumentException si la colonne cible appartient à un tableau différent
     * @throws ForbiddenException   si le requérant n'est pas membre du tableau
     */
    TaskDTO moveTask(Long id, Long colonneId, Long requesterId);

    /**
     * Supprime une tâche par son identifiant.
     *
     * @param id          l'identifiant de la tâche à supprimer
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @throws RuntimeException   si la tâche n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    void deleteTask(Long id, Long requesterId);
}