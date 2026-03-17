package com.repositories;

import com.entities.LogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository JPA pour l'entité {@link LogEntry}.
 * Fournit trois familles de requêtes filtrées : par tableau, par tâche
 * et par auteur, chacune avec des filtres optionnels sur le type d'action
 * et la plage de dates.
 *
 * <p>Les paramètres {@code type}, {@code from} et {@code to} sont
 * optionnels : lorsqu'ils sont {@code null}, la clause correspondante
 * est court-circuitée via le prédicat {@code :param IS NULL OR …},
 * ce qui évite de multiplier les variantes de méthodes.</p>
 *
 * <p>Tous les résultats sont triés par date décroissante (entrée la plus
 * récente en premier), conformément à l'usage attendu d'un journal
 * d'activité.</p>
 */
@Repository
public interface LogEntryRepository extends JpaRepository<LogEntry, Long> {

    /**
     * Récupère les entrées de journal d'un tableau, avec filtres optionnels.
     *
     * <p>Inclut les entrées dont la FK {@code tab_id} est non nulle et correspond
     * à {@code boardId}. Les entrées dont le tableau a été supprimé (FK nulle)
     * sont exclues.</p>
     *
     * @param boardId l'identifiant du tableau
     * @param type    le type d'action à filtrer ; {@code null} pour ignorer
     * @param from    borne inférieure de la plage de dates (inclusive) ;
     *                {@code null} pour ignorer
     * @param to      borne supérieure de la plage de dates (inclusive) ;
     *                {@code null} pour ignorer
     * @return liste d'entrées de log triée par date décroissante
     */
    @Query("""
            SELECT l FROM LogEntry l
            WHERE l.board.id = :boardId
              AND (:type IS NULL OR l.type = :type)
              AND (:from IS NULL OR l.date >= :from)
              AND (:to   IS NULL OR l.date <= :to)
            ORDER BY l.date DESC
            """)
    List<LogEntry> findByBoard(
            @Param("boardId") Long boardId,
            @Param("type")    LogEntry.LogType type,
            @Param("from")    LocalDateTime from,
            @Param("to")      LocalDateTime to
    );

    /**
     * Récupère les entrées de journal d'une tâche, avec filtres optionnels.
     *
     * <p>Inclut les entrées dont la FK {@code tsk_id} est non nulle et correspond
     * à {@code taskId}. Les entrées dont la tâche a été supprimée (FK nulle)
     * sont exclues.</p>
     *
     * @param taskId l'identifiant de la tâche
     * @param type   le type d'action à filtrer ; {@code null} pour ignorer
     * @param from   borne inférieure de la plage de dates (inclusive) ;
     *               {@code null} pour ignorer
     * @param to     borne supérieure de la plage de dates (inclusive) ;
     *               {@code null} pour ignorer
     * @return liste d'entrées de log triée par date décroissante
     */
    @Query("""
            SELECT l FROM LogEntry l
            WHERE l.task.id = :taskId
              AND (:type IS NULL OR l.type = :type)
              AND (:from IS NULL OR l.date >= :from)
              AND (:to   IS NULL OR l.date <= :to)
            ORDER BY l.date DESC
            """)
    List<LogEntry> findByTask(
            @Param("taskId") Long taskId,
            @Param("type")   LogEntry.LogType type,
            @Param("from")   LocalDateTime from,
            @Param("to")     LocalDateTime to
    );

    /**
     * Récupère les entrées de journal dont l'auteur correspond à {@code userId},
     * avec filtres optionnels.
     *
     * <p>Inclut les entrées dont la FK {@code usr_auteur} est non nulle et
     * correspond à {@code userId}. Les entrées dont l'auteur a été supprimé
     * (FK nulle) sont exclues.</p>
     *
     * @param userId l'identifiant de l'utilisateur auteur
     * @param type   le type d'action à filtrer ; {@code null} pour ignorer
     * @param from   borne inférieure de la plage de dates (inclusive) ;
     *               {@code null} pour ignorer
     * @param to     borne supérieure de la plage de dates (inclusive) ;
     *               {@code null} pour ignorer
     * @return liste d'entrées de log triée par date décroissante
     */
    @Query("""
            SELECT l FROM LogEntry l
            WHERE l.author.id = :userId
              AND (:type IS NULL OR l.type = :type)
              AND (:from IS NULL OR l.date >= :from)
              AND (:to   IS NULL OR l.date <= :to)
            ORDER BY l.date DESC
            """)
    List<LogEntry> findByAuthor(
            @Param("userId") Long userId,
            @Param("type")   LogEntry.LogType type,
            @Param("from")   LocalDateTime from,
            @Param("to")     LocalDateTime to
    );
}
