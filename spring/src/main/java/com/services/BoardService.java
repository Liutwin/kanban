package com.services;

import com.dtos.BoardDTO;
import com.dtos.BoardMemberDTO;
import com.entities.BoardMember;

import java.util.List;

/**
 * Interface du service métier pour la gestion des tableaux Kanban.
 * Définit le contrat des opérations CRUD disponibles sur les tableaux.
 */
public interface BoardService {

    /**
     * Récupère tous les tableaux existants.
     *
     * @return liste de {@link BoardDTO}
     */
    List<BoardDTO> getAllTables();

    /**
     * Récupère un tableau par son identifiant.
     *
     * @param id l'identifiant du tableau
     * @return le {@link BoardDTO} correspondant
     * @throws RuntimeException si le tableau n'est pas trouvé
     */
    BoardDTO getBoardById(Long id);

    /**
     * Récupère tous les tableaux créés par un utilisateur donné.
     *
     * @param createurId l'identifiant de l'utilisateur créateur
     * @return liste de {@link BoardDTO}
     */
    List<BoardDTO> getBoardsByCreator(Long createurId);

    /**
     * Crée un nouveau tableau.
     *
     * @param dto les données du nouveau tableau
     * @return le {@link BoardDTO} créé avec son ID généré
     * @throws RuntimeException si l'utilisateur créateur n'existe pas
     */
    BoardDTO createTable(BoardDTO dto);

    /**
     * Met à jour un tableau existant.
     *
     * @param id  l'identifiant du tableau à modifier
     * @param dto les nouvelles données
     * @return le {@link BoardDTO} mis à jour
     * @throws RuntimeException si le tableau n'est pas trouvé
     */
    BoardDTO updateTable(Long id, BoardDTO dto);

    /**
     * Supprime un tableau par son identifiant.
     *
     * @param id l'identifiant du tableau à supprimer
     * @throws RuntimeException si le tableau n'est pas trouvé
     */
    void deleteTable(Long id);

    /**
     * Récupère tous les membres d'un tableau.
     *
     * @param boardId l'identifiant du tableau
     * @return liste de {@link BoardMemberDTO}
     * @throws RuntimeException si le tableau n'existe pas
     */
    List<BoardMemberDTO> getMembersByBoard(Long boardId);

    /**
     * Ajoute un utilisateur à un tableau avec le rôle spécifié.
     *
     * @param boardId l'identifiant du tableau
     * @param dto     les données de la participation (userId + role)
     * @return le {@link BoardMemberDTO} créé
     * @throws RuntimeException si la participation existe déjà
     * @throws RuntimeException si l'utilisateur ou le tableau n'existe pas
     */
    BoardMemberDTO addMember(Long boardId, BoardMemberDTO dto);

    /**
     * Met à jour le rôle d'un membre dans un tableau.
     *
     * @param boardId l'identifiant du tableau
     * @param userId  l'identifiant de l'utilisateur
     * @param role    le nouveau rôle
     * @return le {@link BoardMemberDTO} mis à jour
     * @throws RuntimeException si la participation n'existe pas
     */
    BoardMemberDTO updateMemberRole(Long boardId, Long userId, BoardMember.Role role);

    /**
     * Retire un utilisateur d'un tableau.
     *
     * @param boardId l'identifiant du tableau
     * @param userId  l'identifiant de l'utilisateur
     * @throws RuntimeException si la participation n'existe pas
     */
    void removeMember(Long boardId, Long userId);
}