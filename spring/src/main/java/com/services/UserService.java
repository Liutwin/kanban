package com.services;

import com.dtos.UserDTO;
import java.util.List;

/**
 * Interface du service métier pour la gestion des utilisateurs.
 * Définit le contrat des opérations disponibles sur les utilisateurs.
 */
public interface UserService {

    /**
     * Récupère la liste de tous les utilisateurs.
     *
     * @return liste de {@link UserDTO}
     */
    List<UserDTO> getAllUsers();

    /**
     * Récupère un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur
     * @return le {@link UserDTO} correspondant
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     */
    UserDTO getUserById(Long id);

    /**
     * Crée un nouvel utilisateur.
     *
     * @param dto les données du nouvel utilisateur
     * @return le {@link UserDTO} créé avec son ID généré
     * @throws RuntimeException si l'email est déjà utilisé
     */
    UserDTO createUser(UserDTO dto);

    /**
     * Met à jour un utilisateur existant.
     *
     * @param id  l'identifiant de l'utilisateur à modifier
     * @param dto les nouvelles données
     * @return le {@link UserDTO} mis à jour
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     */
    UserDTO updateUser(Long id, UserDTO dto);

    /**
     * Supprime un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur à supprimer
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     */
    void deleteUser(Long id);
}