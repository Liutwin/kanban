package com.controllers;

import com.dtos.UtilisateurDTO;
import com.services.UtilisateurService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des utilisateurs.
 * Préfixe de route : {@code /users}
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "Gestion des comptes utilisateurs")
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    /**
     * Récupère la liste de tous les utilisateurs.
     *
     * @return une liste de {@link UtilisateurDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister tous les utilisateurs")
    @GetMapping
    public ResponseEntity<List<UtilisateurDTO>> getAllUsers() {
        return ResponseEntity.ok(utilisateurService.getAllUsers());
    }

    /**
     * Récupère un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur
     * @return le {@link UtilisateurDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un utilisateur par ID")
    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(utilisateurService.getUserById(id));
    }

    /**
     * Crée un nouvel utilisateur.
     *
     * @param dto les données du nouvel utilisateur
     * @return le {@link UtilisateurDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer un utilisateur")
    @PostMapping
    public ResponseEntity<UtilisateurDTO> createUser(@RequestBody UtilisateurDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(utilisateurService.createUser(dto));
    }

    /**
     * Met à jour un utilisateur existant.
     *
     * @param id  l'identifiant de l'utilisateur à modifier
     * @param dto les nouvelles données
     * @return le {@link UtilisateurDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour un utilisateur")
    @PutMapping("/{id}")
    public ResponseEntity<UtilisateurDTO> updateUser(@PathVariable Long id, @RequestBody UtilisateurDTO dto) {
        return ResponseEntity.ok(utilisateurService.updateUser(id, dto));
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
        utilisateurService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}