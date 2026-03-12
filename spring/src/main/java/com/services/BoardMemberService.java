package com.services;

import com.dtos.BoardMemberDTO;
import com.entities.BoardMember;

import java.util.List;

/**
 * Interface du service métier pour la gestion des participations aux tableaux.
 * Définit le contrat des opérations CRUD disponibles sur les participations.
 */
public interface BoardMemberService {

    /**
     * Récupère toutes les participations d'un utilisateur.
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste de {@link BoardMemberDTO}
     */
    List<BoardMemberDTO> getParticipationsByUser(Long userId);

    /**
     * Récupère tous les membres d'un tableau.
     *
     * @param tableauId l'identifiant du tableau
     * @return liste de {@link BoardMemberDTO}
     */
    List<BoardMemberDTO> getParticipationsByTableau(Long tableauId);

    /**
     * Ajoute un utilisateur à un tableau avec un rôle donné.
     *
     * @param dto les données de la participation
     * @return le {@link BoardMemberDTO} créé
     * @throws RuntimeException si la participation existe déjà
     * @throws RuntimeException si l'utilisateur ou le tableau n'existe pas
     */
    BoardMemberDTO addParticipation(BoardMemberDTO dto);

    /**
     * Met à jour le rôle d'un participant dans un tableau.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @param role      le nouveau rôle
     * @return le {@link BoardMemberDTO} mis à jour
     * @throws RuntimeException si la participation n'existe pas
     */
    BoardMemberDTO updateRole(Long userId, Long tableauId, BoardMember.Role role);

    /**
     * Retire un utilisateur d'un tableau.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @throws RuntimeException si la participation n'existe pas
     */
    void removeParticipation(Long userId, Long tableauId);
}