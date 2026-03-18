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
     * @param boardId l'identifiant du tableau
     * @return liste des participations correspondantes
     */
    List<BoardMember> findByBoardId(Long boardId);

    /**
     * Récupère les invitations en attente d'un tableau (non encore acceptées).
     * Utilisé par les admins du tableau pour consulter ou valider manuellement
     * les invitations via {@code GET /boards/{id}/members/pending}.
     *
     * @param boardId l'identifiant du tableau
     * @return liste des participations avec {@code notified = false}
     */
    List<BoardMember> findByBoardIdAndNotifiedFalse(Long boardId);

    /**
     * Récupère les invitations en attente d'un utilisateur donné.
     * Utilisé pour alimenter la section "Invitations en attente" de la page Boards
     * via {@code GET /boards/invitations/me}.
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste des participations avec {@code notified = false}
     */
    List<BoardMember> findByUserIdAndNotifiedFalse(Long userId);

    /**
     * Vérifie si un utilisateur est membre <em>actif</em> d'un tableau,
     * c'est-à-dire qu'il a accepté son invitation ({@code notified = true}).
     * Utilisé par {@code checkMembership} pour autoriser l'accès au tableau.
     *
     * @param userId  l'identifiant de l'utilisateur
     * @param boardId l'identifiant du tableau
     * @return {@code true} si la participation est validée
     */
    boolean existsByUserIdAndBoardIdAndNotifiedTrue(Long userId, Long boardId);

    /**
     * Vérifie si une participation existe pour cet utilisateur et ce tableau,
     * qu'elle soit validée ou non. Utilisé lors de la création d'une invitation
     * pour éviter les doublons.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param boardId   l'identifiant du tableau
     * @return {@code true} si la participation existe déjà
     */
    boolean existsByUserIdAndBoardId(Long userId, Long boardId);
}