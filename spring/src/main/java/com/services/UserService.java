package com.services;

import com.dtos.UserCreateDTO;
import com.dtos.UserDTO;
import com.dtos.UserPasswordDTO;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Interface du service métier pour la gestion des utilisateurs.
 * Définit le contrat des opérations disponibles sur les utilisateurs.
 *
 * <p>Toutes les opérations sensibles reçoivent un {@code requesterId} identifiant
 * l'appelant (injecté par le proxy Deno via {@code X-User-Id}). Le rôle du requester
 * est systématiquement relu en base de données afin qu'une révocation de droits
 * soit effective immédiatement, sans attendre l'expiration du JWT.</p>
 */
public interface UserService {

    /**
     * Récupère la liste de tous les utilisateurs.
     * Réservé aux administrateurs.
     *
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @return liste de {@link UserDTO}
     * @throws com.exceptions.ForbiddenException si le requester n'est pas admin
     */
    List<UserDTO> getAllUsers(Long requesterId);

    /**
     * Récupère un utilisateur par son identifiant.
     * Accessible par l'utilisateur lui-même ou par un administrateur.
     *
     * @param id          l'identifiant de l'utilisateur cible
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @return le {@link UserDTO} correspondant
     * @throws RuntimeException              si l'utilisateur n'est pas trouvé
     * @throws com.exceptions.ForbiddenException si le requester n'est ni la cible ni admin
     */
    UserDTO getUserById(Long id, Long requesterId);

    /**
     * Crée un nouvel utilisateur (inscription libre, sans contrôle d'accès).
     *
     * @param dto les données du nouvel utilisateur
     * @return le {@link UserDTO} créé avec son ID généré
     * @throws RuntimeException si l'email est déjà utilisé
     */
    UserDTO createUser(UserCreateDTO dto);

    /**
     * Met à jour un utilisateur existant.
     *
     * <p>Si le champ {@code isAdmin} du DTO diffère de la valeur en base,
     * le requester doit être administrateur (vérifié en base, pas depuis le JWT).
     * Cela garantit qu'un token JWT périmé ne peut pas conserver des droits révoqués.</p>
     *
     * @param id          l'identifiant de l'utilisateur à modifier
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @param dto         les nouvelles données
     * @return le {@link UserDTO} mis à jour
     * @throws RuntimeException              si l'utilisateur n'est pas trouvé
     * @throws com.exceptions.ForbiddenException si le requester n'est pas admin (pour isAdmin)
     *                                        ou n'est ni la cible ni admin (pour les autres champs)
     */
    UserDTO updateUser(Long id, Long requesterId, UserDTO dto);

    /**
     * Change le mot de passe d'un utilisateur.
     * Accessible par l'utilisateur lui-même uniquement.
     *
     * @param id          l'identifiant de l'utilisateur
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @param dto         contient l'ancien et le nouveau mot de passe
     * @throws RuntimeException              si l'utilisateur n'est pas trouvé ou mdp incorrect
     * @throws com.exceptions.ForbiddenException si le requester n'est pas la cible
     */
    void changePassword(Long id, Long requesterId, UserPasswordDTO dto);

    /**
     * Supprime un utilisateur par son identifiant.
     * Réservé aux administrateurs.
     *
     * @param id          l'identifiant de l'utilisateur à supprimer
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @throws RuntimeException              si l'utilisateur n'est pas trouvé
     * @throws com.exceptions.ForbiddenException si le requester n'est pas admin
     */
    void deleteUser(Long id, Long requesterId);

    /**
     * Upload et enregistre un avatar pour l'utilisateur.
     * Accessible par l'utilisateur lui-même ou par un administrateur.
     *
     * @param id          l'identifiant de l'utilisateur
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @param file        le fichier image uploadé
     * @return le {@link UserDTO} mis à jour avec l'URL de l'avatar
     * @throws RuntimeException              si l'utilisateur n'est pas trouvé ou fichier invalide
     * @throws com.exceptions.ForbiddenException si le requester n'est ni la cible ni admin
     */
    UserDTO uploadAvatar(Long id, Long requesterId, MultipartFile file);

    /**
     * Retourne le fichier avatar d'un utilisateur sous forme de {@link Resource}.
     * Accessible publiquement (avatars visibles dans l'UI par tous les membres).
     *
     * @param id l'identifiant de l'utilisateur
     * @return la ressource lisible
     * @throws RuntimeException si l'utilisateur ou le fichier est introuvable
     */
    Resource getAvatar(Long id);
}