package com.services;

import com.dtos.UtilisateurDTO;
import java.util.List;

/**
 * Interface du service métier pour la gestion des utilisateurs.
 * Définit le contrat des opérations disponibles sur les utilisateurs.
 */
public interface UtilisateurService {

    /**
     * Récupère la liste de tous les utilisateurs.
     *
     * @return liste de {@link UtilisateurDTO}
     */
    List<UtilisateurDTO> getAllUsers();

    /**
     * Récupère un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur
     * @return le {@link UtilisateurDTO} correspondant
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     */
    UtilisateurDTO getUserById(Long id);

    /**
     * Crée un nouvel utilisateur.
     *
     * @param dto les données du nouvel utilisateur
     * @return le {@link UtilisateurDTO} créé avec son ID généré
     * @throws RuntimeException si l'email est déjà utilisé
     */
    UtilisateurDTO createUser(UtilisateurDTO dto);

    /**
     * Met à jour un utilisateur existant.
     *
     * @param id  l'identifiant de l'utilisateur à modifier
     * @param dto les nouvelles données
     * @return le {@link UtilisateurDTO} mis à jour
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     */
    UtilisateurDTO updateUser(Long id, UtilisateurDTO dto);

    /**
     * Supprime un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur à supprimer
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     */
    void deleteUser(Long id);
}