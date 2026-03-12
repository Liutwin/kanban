package com.repositories;

import com.entities.BoardColumn;
import org.springframework.data.jpa.repository.JpaRepository;
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
}