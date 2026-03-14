package com.repositories;

import com.entities.BoardColumn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA pour l'entité {@link BoardColumn}.
 * Fournit les opérations CRUD de base, des requêtes métier,
 * et l'appel à la procédure stockée {@code deplacer_colonne}.
 */
@Repository
public interface BoardColumnRepository extends JpaRepository<BoardColumn, Long> {

    /**
     * Récupère toutes les colonnes d'un tableau, triées par numéro.
     *
     * @param boardId l'identifiant du tableau
     * @return liste des colonnes ordonnées
     */
    List<BoardColumn> findByBoardIdOrderByNumeroAsc(Long boardId);

    /**
     * Appelle la procédure stockée {@code deplacer_colonne} en base.
     * Gère la permutation des {@code col_numero} de manière atomique.
     *
     * @param colId  l'identifiant de la colonne à déplacer
     * @param newNum la nouvelle position cible
     */
    @Query(value = "CALL deplacer_colonne(:colId, :newNum)", nativeQuery = true)
    void moveBoardColumn(@Param("colId") Long colId, @Param("newNum") int newNum);

    /**
     * Décale de -1 toutes les colonnes dont le numéro est supérieur à {@code deletedNum}
     * dans le tableau donné. À appeler après la suppression d'une colonne pour
     * rétablir une numérotation continue.
     *
     * <p>Active le flag {@code @_in_deplacer_colonne} avant l'appel et le désactive
     * après pour contourner le trigger {@code before_update_colonne}.</p>
     *
     * @param tabId      l'identifiant du tableau
     * @param deletedNum le numéro de la colonne supprimée
     */
    @Modifying
    @Query(value = """
            UPDATE colonne_col
            SET col_numero = col_numero - 1
            WHERE tab_id = :tabId
              AND col_numero > :deletedNum
            """, nativeQuery = true)
    void shiftColumnsAfterDelete(@Param("tabId") Long tabId,
                                 @Param("deletedNum") int deletedNum);

    /**
     * Active le flag de session {@code @_in_deplacer_colonne}.
     * Autorise les modifications de {@code col_numero} contournant
     * le trigger {@code before_update_colonne}.
     */
    @Modifying
    @Query(value = "SET @_in_deplacer_colonne = 1", nativeQuery = true)
    void setShiftFlag();

    /**
     * Désactive le flag de session {@code @_in_deplacer_colonne}.
     * Réactive la protection du trigger {@code before_update_colonne}.
     */
    @Modifying
    @Query(value = "SET @_in_deplacer_colonne = NULL", nativeQuery = true)
    void clearShiftFlag();
}