package com.services.impl;

import com.dtos.UserCreateDTO;
import com.dtos.UserDTO;
import com.dtos.UserPasswordDTO;
import com.entities.User;
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

    /**
     * {@inheritDoc}
     */
    @Override
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        return userMapper.toDTO(user);
    }

    /** Fonction utilitaire pour mettre la première lettre en majuscule **/
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
    public UserDTO updateUser(Long id, UserDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        user.setEmail(dto.getEmail());
        user.setLastName(dto.getLastName());
        user.setFirstName(dto.getFirstName());
        user.setAdmin(dto.isAdmin());
        return userMapper.toDTO(userRepository.save(user));
    }

    /** {@inheritDoc} */
    @Override
    public void changePassword(Long id, UserPasswordDTO dto) {
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
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("Utilisateur introuvable : " + id);
        }
        userRepository.deleteById(id);
    }

    /** {@inheritDoc} */
    @Override
    public UserDTO uploadAvatar(Long id, MultipartFile file) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));

        // Vérification du type MIME
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Le fichier doit être une image (JPEG, PNG, GIF, WebP…)");
        }

        try {
            // Crée le dossier avatars si nécessaire
            Path dir = Paths.get(uploadDir, "avatars");
            Files.createDirectories(dir);

            // Supprime l'ancien avatar physique s'il existe
            if (user.getAvatarURL() != null && !user.getAvatarURL().isBlank()) {
                try {
                    Files.deleteIfExists(Paths.get(user.getAvatarURL()));
                } catch (IOException ignored) { }
            }

            // Préfixe UUID pour éviter les collisions
            String original = file.getOriginalFilename();
            String ext      = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf(".")).toLowerCase()
                    : "";
            String filename    = "user_" + id + ext;
            Path destination = dir.resolve(filename);
            file.transferTo(destination);

            // Sauvegarde le chemin dans l'entité
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
}