package com.repositories;

import com.entities.Board;
import org.springframework.data.jpa.repository.JpaRepository;
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
     * Récupère tous les tableaux créés par un utilisateur donné.
     *
     * @param creatorId l'identifiant de l'utilisateur créateur
     * @return liste des tableaux correspondants
     */
    List<Board> findByCreatorId(Long creatorId);
}