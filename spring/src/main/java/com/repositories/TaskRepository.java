package com.repositories;

import com.entities.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA pour l'entité {@link Task}.
 * Fournit les opérations CRUD et des requêtes métier sur les tâches.
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    /**
     * Récupère toutes les tâches d'une colonne donnée.
     *
     * @param colomnId l'identifiant de la colonne
     * @return liste des tâches correspondantes
     */
    List<Task> findByBoardColumnId(Long colomnId);

    /**
     * Récupère toutes les tâches assignées à un utilisateur donné.
     *
     * @param assignedId l'identifiant de l'utilisateur assigné
     * @return liste des tâches correspondantes
     */
    List<Task> findByAssignedId(Long assignedId);

    /**
     * Récupère toutes les tâches d'une priorité donnée dans une colonne.
     *
     * @param colomnId l'identifiant de la colonne
     * @param priority  le niveau de priorité recherché
     * @return liste des tâches correspondantes
     */
    List<Task> findByBoardColumnIdAndPriority(Long colomnId, Task.Priority priority);
}