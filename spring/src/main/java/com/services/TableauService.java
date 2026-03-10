package com.services;

import com.dtos.TableauDTO;
import java.util.List;

/**
 * Interface du service métier pour la gestion des tableaux Kanban.
 * Définit le contrat des opérations CRUD disponibles sur les tableaux.
 */
public interface TableauService {

    /**
     * Récupère tous les tableaux existants.
     *
     * @return liste de {@link TableauDTO}
     */
    List<TableauDTO> getAllTableaux();

    /**
     * Récupère un tableau par son identifiant.
     *
     * @param id l'identifiant du tableau
     * @return le {@link TableauDTO} correspondant
     * @throws RuntimeException si le tableau n'est pas trouvé
     */
    TableauDTO getTableauById(Long id);

    /**
     * Récupère tous les tableaux créés par un utilisateur donné.
     *
     * @param createurId l'identifiant de l'utilisateur créateur
     * @return liste de {@link TableauDTO}
     */
    List<TableauDTO> getTableauxByCreateur(Long createurId);

    /**
     * Crée un nouveau tableau.
     *
     * @param dto les données du nouveau tableau
     * @return le {@link TableauDTO} créé avec son ID généré
     * @throws RuntimeException si l'utilisateur créateur n'existe pas
     */
    TableauDTO createTableau(TableauDTO dto);

    /**
     * Met à jour un tableau existant.
     *
     * @param id  l'identifiant du tableau à modifier
     * @param dto les nouvelles données
     * @return le {@link TableauDTO} mis à jour
     * @throws RuntimeException si le tableau n'est pas trouvé
     */
    TableauDTO updateTableau(Long id, TableauDTO dto);

    /**
     * Supprime un tableau par son identifiant.
     *
     * @param id l'identifiant du tableau à supprimer
     * @throws RuntimeException si le tableau n'est pas trouvé
     */
    void deleteTableau(Long id);
}