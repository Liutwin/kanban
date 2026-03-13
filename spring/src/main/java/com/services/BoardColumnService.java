package com.services;

import com.dtos.BoardColumnDTO;
import java.util.List;

/**
 * Interface du service métier pour la gestion des colonnes Kanban.
 * Définit le contrat des opérations CRUD et de permutation des colonnes.
 */
public interface BoardColumnService {

    /**
     * Récupère toutes les colonnes d'un tableau, triées par numéro.
     *
     * @param tableauId l'identifiant du tableau
     * @return liste de {@link BoardColumnDTO} ordonnée
     */
    List<BoardColumnDTO> getColumnsByTableau(Long tableauId);

    /**
     * Récupère une colonne par son identifiant.
     *
     * @param id l'identifiant de la colonne
     * @return le {@link BoardColumnDTO} correspondant
     * @throws RuntimeException si la colonne n'est pas trouvée
     */
    BoardColumnDTO getColumnById(Long id);

    /**
     * Crée une nouvelle colonne dans un tableau.
     * Le numéro de position est attribué automatiquement par le trigger SQL.
     *
     * @param dto les données de la nouvelle colonne
     * @return le {@link BoardColumnDTO} créé avec son numéro assigné
     * @throws RuntimeException si le tableau n'existe pas
     */
    BoardColumnDTO createColumn(BoardColumnDTO dto);

    /**
     * Renomme une colonne existante.
     *
     * @param id  l'identifiant de la colonne
     * @param dto les nouvelles données
     * @return le {@link BoardColumnDTO} mis à jour
     * @throws RuntimeException si la colonne n'est pas trouvée
     */
    BoardColumnDTO updateColumn(Long id, BoardColumnDTO dto);

    /**
     * Déplace une colonne vers une nouvelle position via la procédure stockée.
     *
     * @param id     l'identifiant de la colonne à déplacer
     * @param newNum la nouvelle position cible
     * @throws RuntimeException si la colonne n'est pas trouvée
     */
    void moveColumn(Long id, int newNum);

    /**
     * Supprime une colonne par son identifiant.
     *
     * @param id l'identifiant de la colonne à supprimer
     * @throws RuntimeException si la colonne n'est pas trouvée
     */
    void deleteColumn(Long id);
}