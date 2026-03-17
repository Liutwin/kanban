package com.controllers;

import com.dtos.UserCreateDTO;
import com.dtos.UserDTO;
import com.dtos.UserPasswordDTO;
import com.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des utilisateurs.
 * Préfixe de route : {@code /users}
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "Gestion des comptes utilisateurs")
public class UserController {

    private final UserService userService;

    /**
     * Récupère la liste de tous les utilisateurs.
     *
     * @return une liste de {@link UserDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister tous les utilisateurs")
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /**
     * Récupère un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur
     * @return le {@link UserDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un utilisateur par ID")
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    /**
     * Crée un nouvel utilisateur.
     *
     * @param dto les données du nouvel utilisateur
     * @return le {@link UserDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer un utilisateur")
    @PostMapping
    public ResponseEntity<UserDTO> createUser(@RequestBody UserCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.createUser(dto));
    }

    /**
     * Met à jour un utilisateur existant.
     *
     * @param id  l'identifiant de l'utilisateur à modifier
     * @param dto les nouvelles données
     * @return le {@link UserDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour un utilisateur")
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @RequestBody UserDTO dto) {
        return ResponseEntity.ok(userService.updateUser(id, dto));
    }


    /**
     * Change le mot de passe d'un utilisateur.
     *
     * @param id  l'identifiant de l'utilisateur
     * @param dto contient l'ancien et le nouveau mot de passe
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Changer le mot de passe d'un utilisateur")
    @PatchMapping("/{id}/password")
    public ResponseEntity<Void> changePassword(@PathVariable Long id,
                                               @RequestBody UserPasswordDTO dto) {
        userService.changePassword(id, dto);
        return ResponseEntity.noContent().build();
    }

    /**
     * Supprime un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer un utilisateur")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Upload un avatar pour un utilisateur.
     * Le fichier est stocké sur disque et le chemin est enregistré dans la base.
     *
     * @param id   l'identifiant de l'utilisateur
     * @param file le fichier image uploadé
     * @return le {@link UserDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Uploader un avatar")
    @PostMapping(value = "/{id}/avatar", consumes = "multipart/form-data")
    public ResponseEntity<UserDTO> uploadAvatar(@PathVariable Long id,
                                                @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.uploadAvatar(id, file));
    }

    /**
     * Télécharge l'avatar d'un utilisateur.
     *
     * @param id l'identifiant de l'utilisateur
     * @return le contenu de l'image avec statut HTTP 200
     */
    @Operation(summary = "Récupérer l'avatar d'un utilisateur")
    @GetMapping("/{id}/avatar")
    public ResponseEntity<Resource> getAvatar(@PathVariable Long id) {
        Resource resource = userService.getAvatar(id);
        // Détecte le type MIME réel du fichier (PNG, JPEG, WebP…)
        MediaType mediaType = MediaType.IMAGE_JPEG;
        try {
            String filename = resource.getFilename();
            if (filename != null) {
                String lower = filename.toLowerCase();
                if (lower.endsWith(".png"))       mediaType = MediaType.IMAGE_PNG;
                else if (lower.endsWith(".gif"))   mediaType = MediaType.IMAGE_GIF;
                else if (lower.endsWith(".webp"))  mediaType = MediaType.parseMediaType("image/webp");
                else if (lower.endsWith(".svg"))   mediaType = MediaType.parseMediaType("image/svg+xml");
            }
        } catch (Exception ignored) { }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(resource);
    }
}