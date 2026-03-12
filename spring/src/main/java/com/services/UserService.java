package com.services;

import com.dtos.UserCreateDTO;
import com.dtos.UserDTO;
import com.dtos.UserPasswordDTO;

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
    UserDTO createUser(UserCreateDTO dto);

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
     * Change le mot de passe d'un utilisateur.
     *
     * @param id  l'identifiant de l'utilisateur
     * @param dto contient l'ancien et le nouveau mot de passe
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     * @throws RuntimeException si l'ancien mot de passe est incorrect
     */
    void changePassword(Long id, UserPasswordDTO dto);

    /**
     * Supprime un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur à supprimer
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     */
    void deleteUser(Long id);
}