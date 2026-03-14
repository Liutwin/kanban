package com.services;

import com.dtos.BoardColumnDTO;
import com.exceptions.ForbiddenException;

import java.util.List;

/**
 * Interface du service métier pour la gestion des colonnes Kanban.
 * Définit le contrat des opérations CRUD et de déplacement des colonnes.
 *
 * <p>Les opérations d'écriture (création, modification, déplacement,
 * suppression) acceptent un {@code requesterId} afin de vérifier que
 * l'utilisateur est bien membre du tableau concerné avant d'exécuter
 * l'opération. En cas de violation, une {@link ForbiddenException}
 * est levée (HTTP 403).</p>
 */
public interface BoardColumnService {

    /**
     * Récupère toutes les colonnes d'un tableau, triées par numéro.
     *
     * @param boardId     l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link BoardColumnDTO} ordonnée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    List<BoardColumnDTO> getColumnsByTableau(Long boardId, Long requesterId);

    /**
     * Récupère une colonne par son identifiant.
     *
     * @param id          l'identifiant de la colonne
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link BoardColumnDTO} correspondant
     * @throws RuntimeException   si la colonne n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    BoardColumnDTO getColumnById(Long id, Long requesterId);

    /**
     * Crée une nouvelle colonne dans un tableau.
     * Le numéro de position est attribué automatiquement par le trigger SQL.
     *
     * @param dto         les données de la nouvelle colonne
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link BoardColumnDTO} créé avec son numéro assigné
     * @throws RuntimeException   si le tableau n'existe pas
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    BoardColumnDTO createColumn(BoardColumnDTO dto, Long requesterId);

    /**
     * Renomme une colonne existante.
     *
     * @param id          l'identifiant de la colonne
     * @param dto         les nouvelles données
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link BoardColumnDTO} mis à jour
     * @throws RuntimeException   si la colonne n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    BoardColumnDTO updateColumn(Long id, BoardColumnDTO dto, Long requesterId);

    /**
     * Déplace une colonne vers une nouvelle position via la procédure stockée.
     *
     * @param id          l'identifiant de la colonne à déplacer
     * @param newNum      la nouvelle position cible
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @throws RuntimeException   si la colonne n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    void moveColumn(Long id, int newNum, Long requesterId);

    /**
     * Supprime une colonne par son identifiant.
     *
     * @param id          l'identifiant de la colonne à supprimer
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @throws RuntimeException   si la colonne n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     */
    void deleteColumn(Long id, Long requesterId);
}