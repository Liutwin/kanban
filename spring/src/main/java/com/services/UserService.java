package com.services;

import com.dtos.UserCreateDTO;
import com.dtos.UserDTO;
import com.dtos.UserPasswordDTO;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Interface du service métier pour la gestion des utilisateurs.
 */
public interface UserService {

    List<UserDTO> getAllUsers(Long requesterId);
    UserDTO getUserById(Long id, Long requesterId);
    UserDTO createUser(UserCreateDTO dto);
    UserDTO updateUser(Long id, Long requesterId, UserDTO dto);
    void changePassword(Long id, Long requesterId, UserPasswordDTO dto);

    /**
     * Met à jour le mot de passe haché d'un utilisateur et envoie le mot de
     * passe temporaire par mail (étape 2 du flux "mot de passe oublié").
     *
     * <p>Cet endpoint est appelé exclusivement par le proxy Deno, après
     * validation du token de reset. Le mot de passe est déjà haché (scrypt)
     * avant d'arriver ici ; le clair est transmis uniquement pour l'e-mail.</p>
     *
     * @param email          adresse e-mail de l'utilisateur
     * @param hashedPassword nouveau mot de passe déjà haché (format hash.salt)
     * @param tempPassword   mot de passe en clair à inclure dans l'e-mail
     * @throws RuntimeException si l'email est introuvable
     */
    void resetPassword(String email, String hashedPassword, String tempPassword);

    void deleteUser(Long id, Long requesterId);
    UserDTO uploadAvatar(Long id, Long requesterId, MultipartFile file);
    Resource getAvatar(Long id);

    /**
     * Envoie le mail contenant le lien de confirmation de reset (étape 1).
     * N'effectue aucune modification en base.
     *
     * @param email      adresse e-mail de l'utilisateur
     * @param firstName  prénom (fourni par Deno depuis sa requête MariaDB)
     * @param resetLink  lien complet de confirmation
     */
    void sendResetEmail(String email, String firstName, String resetLink);
}
