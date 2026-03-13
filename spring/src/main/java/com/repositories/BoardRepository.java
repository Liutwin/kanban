package com.repositories;

import com.entities.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA pour l'entité {@link Board}.
 * Fournit les opérations CRUD de base et des requêtes métier
 * spécifiques aux tableaux.
 */
@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {

    /**
     * Récupère tous les tableaux accessibles par un utilisateur :
     * ceux qu'il a créés OU ceux dont il est membre via participation_ptp.
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste des tableaux correspondants
     */
    @Query("""
        SELECT DISTINCT b FROM Board b
        LEFT JOIN BoardMember bm ON bm.board.id = b.id
        WHERE b.creator.id = :userId OR bm.user.id = :userId
    """)
    List<Board> findAllAccessibleByUser(@Param("userId") Long userId);
}