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
 *
 * <p>L'en-tête {@code X-User-Id} injecté par le proxy Deno est transmis
 * au service sur chaque opération sensible. Le service relit systématiquement
 * le rôle du requester en base de données afin qu'une révocation de droits
 * soit effective immédiatement, sans attendre l'expiration du JWT.</p>
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "Gestion des comptes utilisateurs")
public class UserController {

    private final UserService userService;

    /**
     * Récupère la liste de tous les utilisateurs.
     * Réservé aux administrateurs.
     *
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @return une liste de {@link UserDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister tous les utilisateurs")
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(userService.getAllUsers(requesterId));
    }

    /**
     * Récupère un utilisateur par son identifiant.
     * Accessible par l'utilisateur lui-même ou par un administrateur.
     *
     * @param id          l'identifiant de l'utilisateur cible
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @return le {@link UserDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un utilisateur par ID")
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(userService.getUserById(id, requesterId));
    }

    /**
     * Crée un nouvel utilisateur (inscription libre).
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
     * Accessible par l'utilisateur lui-même ou par un administrateur.
     * La modification de {@code isAdmin} est réservée aux administrateurs.
     *
     * @param id          l'identifiant de l'utilisateur à modifier
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @param dto         les nouvelles données
     * @return le {@link UserDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour un utilisateur")
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId,
            @RequestBody UserDTO dto) {
        return ResponseEntity.ok(userService.updateUser(id, requesterId, dto));
    }

    /**
     * Change le mot de passe d'un utilisateur.
     * Accessible par l'utilisateur lui-même uniquement.
     *
     * @param id          l'identifiant de l'utilisateur
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @param dto         contient l'ancien et le nouveau mot de passe
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Changer le mot de passe d'un utilisateur")
    @PatchMapping("/{id}/password")
    public ResponseEntity<Void> changePassword(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId,
            @RequestBody UserPasswordDTO dto) {
        userService.changePassword(id, requesterId, dto);
        return ResponseEntity.noContent().build();
    }

    /**
     * Supprime un utilisateur par son identifiant.
     * Réservé aux administrateurs.
     *
     * @param id          l'identifiant de l'utilisateur à supprimer
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer un utilisateur")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        userService.deleteUser(id, requesterId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Upload un avatar pour un utilisateur.
     * Accessible par l'utilisateur lui-même ou par un administrateur.
     *
     * @param id          l'identifiant de l'utilisateur
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @param file        le fichier image uploadé
     * @return le {@link UserDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Uploader un avatar")
    @PostMapping(value = "/{id}/avatar", consumes = "multipart/form-data")
    public ResponseEntity<UserDTO> uploadAvatar(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.uploadAvatar(id, requesterId, file));
    }

    /**
     * Télécharge l'avatar d'un utilisateur (accès public).
     *
     * @param id l'identifiant de l'utilisateur
     * @return le contenu de l'image avec statut HTTP 200
     */
    @Operation(summary = "Récupérer l'avatar d'un utilisateur")
    @GetMapping("/{id}/avatar")
    public ResponseEntity<Resource> getAvatar(@PathVariable Long id) {
        Resource resource = userService.getAvatar(id);
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