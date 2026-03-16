package com.repositories;

import com.entities.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Repository JPA pour l'entité {@link Task}.
 * Fournit les opérations CRUD standard héritées de {@link JpaRepository}
 * ainsi que des requêtes métier pour la lecture triée des tâches.
 *
 * <p>Le déplacement (intra et inter-colonnes) est entièrement délégué à la
 * procédure stockée SQL {@code deplacer_tache} via
 * {@link #deplacerTache(Long, Long, int, Long)}, qui gère le réordonnancement
 * des positions voisines et le logging dans {@code journal_log}.</p>
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    /**
     * Récupère toutes les tâches d'une colonne, triées par position croissante.
     *
     * <p>À utiliser à la place de {@code findByBoardColumnId} dès lors que
     * l'ordre d'affichage dans la colonne doit être respecté.</p>
     *
     * @param columnId l'identifiant de la colonne
     * @return liste des tâches ordonnées par {@code tsk_position} croissant
     */
    List<Task> findByBoardColumnIdOrderByPosition(Long columnId);

    /**
     * Récupère toutes les tâches assignées à un utilisateur donné.
     *
     * @param assignedId l'identifiant de l'utilisateur assigné
     * @return liste des tâches correspondantes
     */
    List<Task> findByAssignedId(Long assignedId);

    /**
     * Récupère toutes les tâches d'un niveau de priorité donné dans une colonne,
     * triées par position croissante.
     *
     * @param columnId l'identifiant de la colonne
     * @param priority  le niveau de priorité recherché
     * @return liste des tâches correspondantes ordonnées par {@code tsk_position}
     */
    List<Task> findByBoardColumnIdAndPriorityOrderByPosition(Long columnId, Task.Priority priority);

    /**
     * Appelle la procédure stockée {@code deplacer_tache} pour déplacer
     * une tâche vers une nouvelle position, dans la même colonne ou dans
     * une colonne différente.
     *
     * <p>La procédure gère intégralement :</p>
     * <ul>
     *   <li>le borne-clamp de {@code p_new_pos} au maximum autorisé ;</li>
     *   <li>le réordonnancement des tâches voisines (intra-colonne) ;</li>
     *   <li>la fermeture du trou dans la colonne source et l'ouverture
     *       d'une place dans la colonne cible (inter-colonnes) ;</li>
     *   <li>l'insertion du log {@code deplacement} dans {@code journal_log}.</li>
     * </ul>
     *
     * @param tskId      identifiant de la tâche à déplacer
     * @param colIdCible identifiant de la colonne cible (peut être la colonne courante)
     * @param newPos     position cible (0-based)
     * @param usrAuteur  identifiant de l'utilisateur déclenchant l'action (pour le log)
     */
    @Modifying
    @Transactional
    @Query(value = "CALL deplacer_tache(:tskId, :colIdCible, :newPos, :usrAuteur)",
            nativeQuery = true)
    void deplacerTache(@Param("tskId")      Long tskId,
                       @Param("colIdCible") Long colIdCible,
                       @Param("newPos")     int  newPos,
                       @Param("usrAuteur")  Long usrAuteur);
}