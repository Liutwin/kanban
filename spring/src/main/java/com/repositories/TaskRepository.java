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
 * ainsi que des requêtes métier pour la lecture triée et le réordonnancement
 * des tâches au sein d'une colonne.
 *
 * <p>Le réordonnancement intra-colonne suit la même logique que la procédure
 * SQL {@code deplacer_colonne} pour les colonnes : avant de placer la tâche
 * à sa nouvelle position, {@link #shiftPositions} décale les tâches voisines
 * afin de préserver l'unicité de la contrainte
 * {@code uq_tsk_position_col (col_id, tsk_position)}.</p>
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
     * Décale la position ({@code tsk_position}) d'un ensemble de tâches
     * d'une même colonne d'une valeur {@code delta} ({@code +1} ou {@code -1}).
     *
     * <p>Utilisé par {@link com.services.impl.TaskServiceImpl#moveTask} pour
     * maintenir la cohérence des positions lors d'un réordonnancement
     * intra-colonne, de la même façon que la procédure SQL
     * {@code deplacer_colonne} gère les colonnes :</p>
     * <ul>
     *   <li><b>Déplacement vers le haut</b> (nouvelle position &lt; ancienne) :
     *       les tâches situées dans {@code [newPos .. oldPos - 1]} sont décalées
     *       de {@code +1}.</li>
     *   <li><b>Déplacement vers le bas</b> (nouvelle position &gt; ancienne) :
     *       les tâches situées dans {@code [oldPos + 1 .. newPos]} sont décalées
     *       de {@code -1}.</li>
     * </ul>
     *
     * <p>La tâche en cours de déplacement ({@code excludeId}) est exclue de
     * la mise à jour pour éviter de modifier sa propre position avant qu'elle
     * ne soit repositionnée par l'appelant.</p>
     *
     * @param colId     l'identifiant de la colonne dans laquelle le décalage
     *                  s'applique
     * @param delta     valeur du décalage : {@code +1} ou {@code -1}
     * @param from      borne inférieure inclusive de la plage à décaler
     * @param to        borne supérieure inclusive de la plage à décaler
     * @param excludeId identifiant de la tâche à exclure du décalage
     */
    @Modifying
    @Transactional
    @Query("UPDATE Task t SET t.position = t.position + :delta " +
            "WHERE t.boardColumn.id = :colId " +
            "AND t.position >= :from AND t.position <= :to " +
            "AND t.id <> :excludeId")
    void shiftPositions(@Param("colId")     Long colId,
                        @Param("delta")     int  delta,
                        @Param("from")      int  from,
                        @Param("to")        int  to,
                        @Param("excludeId") Long excludeId);

    /**
     * Retourne le nombre de tâches présentes dans une colonne.
     *
     * <p>Utilisé par {@link com.services.impl.TaskServiceImpl#moveTask} pour
     * borner la position cible au maximum existant dans la colonne, de la
     * même façon que {@code deplacer_colonne} borne {@code p_new_num} à
     * {@code v_max_num}.</p>
     *
     * @param columnId l'identifiant de la colonne
     * @return le nombre de tâches dans la colonne
     */
    long countByBoardColumnId(Long columnId);
}