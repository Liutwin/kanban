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
 *
 * <p>Toutes les méthodes retournant une liste de tâches renvoient celles-ci
 * triées par {@code tsk_position} croissant, afin de refléter l'ordre
 * d'affichage défini dans la colonne.</p>
 */
public interface TaskService {

    /**
     * Récupère toutes les tâches d'une colonne, triées par position croissante.
     *
     * @param colonneId   l'identifiant de la colonne
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link TaskDTO} ordonnée par {@code tsk_position}
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
     * Récupère les tâches d'une colonne filtrées par priorité,
     * triées par position croissante.
     *
     * @param colonneId   l'identifiant de la colonne
     * @param priorite    le niveau de priorité recherché
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link TaskDTO} ordonnée par {@code tsk_position}
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
     * <p>La position ({@code tsk_position}) n'est pas fournie dans le DTO :
     * le trigger SQL {@code before_insert_tache} la calcule automatiquement
     * en ajoutant la tâche en fin de colonne ({@code MAX(tsk_position) + 1}).</p>
     *
     * @param dto         les données de la nouvelle tâche
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link TaskDTO} créé avec son identifiant et sa position générés
     * @throws RuntimeException   si la colonne ou le créateur n'existe pas
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    TaskDTO createTask(TaskDTO dto, Long requesterId);

    /**
     * Met à jour les champs métier d'une tâche existante (titre, détails,
     * date limite, priorité). Ne modifie ni la colonne ni la position.
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
     * @throws RuntimeException   si la tâche ou l'utilisateur n'est pas trouvé
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    TaskDTO assignTask(Long id, Long assigneeId, Long requesterId);

    /**
     * Déplace une tâche vers une autre colonne du même tableau, ou la
     * réordonne au sein de sa colonne courante.
     *
     * <h4>Déplacement inter-colonnes ({@code targetColumnId != colonne courante})</h4>
     * <p>La tâche est placée en fin de la colonne cible (position =
     * {@code MAX(tsk_position) + 1} dans cette colonne). La colonne source
     * n'est pas renumérotée : les positions restantes y forment des trous,
     * ce qui est acceptable puisque seul l'ordre relatif compte.</p>
     *
     * <h4>Réordonnancement intra-colonne ({@code targetColumnId == colonne courante})</h4>
     * <p>Suit la même logique que la procédure SQL {@code deplacer_colonne} :
     * avant de positionner la tâche à {@code targetPosition}, les tâches situées
     * entre l'ancienne et la nouvelle position sont décalées de ±1 via
     * {@link com.repositories.TaskRepository#shiftPositions}, garantissant
     * ainsi l'unicité de la contrainte {@code uq_tsk_position_col}.</p>
     *
     * @param id             l'identifiant de la tâche à déplacer
     * @param targetColumnId l'identifiant de la colonne cible (peut être la
     *                       colonne courante pour un réordonnancement)
     * @param targetPosition la position cible dans la colonne (ignorée si la
     *                       colonne change — la tâche est alors placée en fin)
     * @param requesterId    l'identifiant de l'utilisateur faisant la demande
     * @return le {@link TaskDTO} mis à jour avec la nouvelle colonne et position
     * @throws RuntimeException         si la tâche ou la colonne n'est pas trouvée
     * @throws IllegalArgumentException si la colonne cible appartient à un tableau
     *                                  différent de celui de la tâche
     * @throws ForbiddenException       si le requérant n'est pas membre du tableau
     */
    TaskDTO moveTask(Long id, Long targetColumnId, int targetPosition, Long requesterId);

    /**
     * Supprime une tâche par son identifiant ainsi que tous ses commentaires.
     *
     * @param id          l'identifiant de la tâche à supprimer
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @throws RuntimeException   si la tâche n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    void deleteTask(Long id, Long requesterId);
}