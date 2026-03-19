package com.services.impl;

import com.dtos.UserCreateDTO;
import com.dtos.UserDTO;
import com.dtos.UserPasswordDTO;
import com.entities.User;
import com.exceptions.ForbiddenException;
import com.mappers.UserMapper;
import com.repositories.UserRepository;
import com.services.MailService;
import com.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link UserService}.
 * Orchestre les appels au {@link UserRepository}
 * et les conversions via le {@link UserMapper}.
 *
 * <p>Toutes les vérifications d'autorisation relisent le rôle du requester
 * <strong>en base de données</strong>, jamais depuis le JWT. Cela garantit
 * qu'une révocation de droits admin est effective immédiatement, sans
 * attendre l'expiration du token.</p>
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final MailService mailService;

    @SuppressWarnings("unused")
    @Value("${app.upload.dir}")
    private String uploadDir;

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers d'autorisation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Charge le requester et vérifie qu'il est administrateur.
     * Le chargement depuis la BDD est intentionnel : si son rôle a été révoqué
     * depuis l'émission de son JWT, la vérification échoue immédiatement.
     */
    private User requireAdmin(Long requesterId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Requester introuvable : " + requesterId));
        if (!requester.isAdmin()) {
            throw new ForbiddenException("Action réservée aux administrateurs.");
        }
        return requester;
    }

    /**
     * Charge le requester et vérifie qu'il est la cible ou un administrateur.
     */
    private User requireSelfOrAdmin(Long targetId, Long requesterId) {
        if (requesterId.equals(targetId)) {
            return userRepository.findById(requesterId)
                    .orElseThrow(() -> new RuntimeException("Requester introuvable : " + requesterId));
        }
        return requireAdmin(requesterId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Opérations
    // ─────────────────────────────────────────────────────────────────────────

    /** {@inheritDoc} */
    @Override
    public List<UserDTO> getAllUsers(Long requesterId) {
        requireAdmin(requesterId);
        return userRepository.findAll()
                .stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public UserDTO getUserById(Long id, Long requesterId) {
        // Tout utilisateur authentifié peut lire le profil basique d'un autre
        // (prénom, nom, avatar) — nécessaire pour afficher les membres d'un tableau.
        userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Requester introuvable : " + requesterId));
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        return userMapper.toDTO(user);
    }

    /** Fonction utilitaire pour mettre la première lettre en majuscule. */
    private String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    /** {@inheritDoc} */
    @Override
    public UserDTO createUser(UserCreateDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email déjà utilisé : " + dto.getEmail());
        }
        dto.setFirstName(capitalize(dto.getFirstName()));
        dto.setLastName(capitalize(dto.getLastName()));
        User user = userMapper.toEntityFromCreate(dto);
        UserDTO saved = userMapper.toDTO(userRepository.save(user));
        mailService.sendWelcome(saved.getEmail(), saved.getFirstName());
        return saved;
    }

    /** {@inheritDoc} */
    @Override
    public UserDTO updateUser(Long id, Long requesterId, UserDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));

        // Modification des champs personnels : soi-même ou admin
        requireSelfOrAdmin(id, requesterId);

        // Modification du rôle admin : admin exclusivement, vérifié en base
        if (dto.isAdmin() != user.isAdmin()) {
            requireAdmin(requesterId);
        }

        user.setEmail(dto.getEmail());
        user.setLastName(dto.getLastName());
        user.setFirstName(dto.getFirstName());
        user.setAdmin(dto.isAdmin());
        return userMapper.toDTO(userRepository.save(user));
    }

    /** {@inheritDoc} */
    @Override
    public void changePassword(Long id, Long requesterId, UserPasswordDTO dto) {
        // Changement de mot de passe : soi-même uniquement
        if (!requesterId.equals(id)) {
            throw new ForbiddenException("Vous ne pouvez modifier que votre propre mot de passe.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        if (!user.getPassword().equals(dto.getOldPassword())) {
            throw new RuntimeException("Ancien mot de passe incorrect");
        }
        user.setPassword(dto.getNewPassword());
        userRepository.save(user);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteUser(Long id, Long requesterId) {
        requireAdmin(requesterId);
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("Utilisateur introuvable : " + id);
        }
        userRepository.deleteById(id);
    }

    /** {@inheritDoc} */
    @Override
    public UserDTO uploadAvatar(Long id, Long requesterId, MultipartFile file) {
        requireSelfOrAdmin(id, requesterId);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Le fichier doit être une image (JPEG, PNG, GIF, WebP…)");
        }

        try {
            Path dir = Paths.get(uploadDir, "avatars");
            Files.createDirectories(dir);

            if (user.getAvatarURL() != null && !user.getAvatarURL().isBlank()) {
                try {
                    Files.deleteIfExists(Paths.get(user.getAvatarURL()));
                } catch (IOException ignored) { }
            }

            String original = file.getOriginalFilename();
            String ext      = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf(".")).toLowerCase()
                    : "";
            String filename    = "user_" + id + ext;
            Path destination = dir.resolve(filename);
            file.transferTo(destination);

            user.setAvatarURL(destination.toString());
            return userMapper.toDTO(userRepository.save(user));

        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de l'enregistrement de l'avatar", e);
        }
    }

    /** {@inheritDoc} */
    @Override
    public Resource getAvatar(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));

        if (user.getAvatarURL() == null || user.getAvatarURL().isBlank()) {
            throw new RuntimeException("Cet utilisateur n'a pas d'avatar");
        }

        try {
            Path path = Paths.get(user.getAvatarURL());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new RuntimeException("Fichier avatar illisible : " + user.getAvatarURL());
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new RuntimeException("Chemin avatar invalide : " + user.getAvatarURL(), e);
        }
    }

    /** {@inheritDoc} */
    @Override
    public void resetPassword(String email, String hashedPassword, String tempPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + email));
        user.setPassword(hashedPassword);
        userRepository.save(user);
        mailService.sendPasswordResetConfirm(user.getEmail(), user.getFirstName(), tempPassword);
    }

    /** {@inheritDoc} */
    @Override
    public void sendResetEmail(String email, String firstName, String resetLink) {
        mailService.sendPasswordResetRequest(email, firstName, resetLink);
    }
}