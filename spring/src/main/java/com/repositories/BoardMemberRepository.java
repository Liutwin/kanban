package com.repositories;

import com.entities.BoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA pour l'entité {@link BoardMember}.
 * Fournit les opérations CRUD et des requêtes métier
 * sur les participations aux tableaux.
 */
@Repository
public interface BoardMemberRepository extends JpaRepository<BoardMember, BoardMember.ParticipationId> {

    /**
     * Récupère toutes les participations d'un utilisateur donné.
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste des participations correspondantes
     */
    List<BoardMember> findByUserId(Long userId);

    /**
     * Récupère toutes les participations d'un tableau donné.
     *
     * @param tableauId l'identifiant du tableau
     * @return liste des participations correspondantes
     */
    List<BoardMember> findByBoardId(Long tableauId);

    /**
     * Vérifie si un utilisateur participe déjà à un tableau donné.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @return {@code true} si la participation existe déjà
     */
    boolean existsByUserIdAndBoardId(Long userId, Long tableauId);
}