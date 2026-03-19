package com.controllers;

import com.dtos.UserViewDTO;
import com.services.UserViewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de consultation des profils utilisateurs.
 * Préfixe de route : {@code /users/profiles}
 *
 * <p>Ces endpoints sont réservés à l'administration : ils exposent les statistiques
 * agrégées de chaque utilisateur issues de la vue {@code vue_profil_utilisateur}.
 * L'en-tête {@code X-User-Id} injecté par le proxy Deno est transmis au service,
 * qui vérifie le rôle admin du requester en base de données.</p>
 */
@RestController
@RequestMapping("/users/profiles")
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "Gestion des comptes utilisateurs")
public class UserViewController {

    private final UserViewService userViewService;

    /**
     * Récupère la liste de tous les profils utilisateurs.
     * Réservé aux administrateurs.
     *
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @return une liste de {@link UserViewDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister tous les profils utilisateurs")
    @GetMapping
    public ResponseEntity<List<UserViewDTO>> getAllProfiles(
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(userViewService.getAllProfiles(requesterId));
    }

    /**
     * Récupère le profil statistique d'un utilisateur par son identifiant.
     * Accessible par l'utilisateur lui-même ou par un administrateur.
     *
     * @param id          l'identifiant de l'utilisateur cible
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @return le {@link UserViewDTO} correspondant avec statut HTTP 200
     */
    @Operation(summary = "Récupérer le profil d'un utilisateur par ID")
    @GetMapping("/{id}")
    public ResponseEntity<UserViewDTO> getProfileById(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(userViewService.getProfileById(id, requesterId));
    }

    /**
     * Recherche des profils dont le nom ou le prénom contient la chaîne fournie.
     * Réservé aux administrateurs.
     *
     * @param search      la chaîne à rechercher
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     * @return la liste des {@link UserViewDTO} correspondants avec statut HTTP 200
     */
    @Operation(summary = "Rechercher des utilisateurs par nom ou prénom")
    @GetMapping(params = "search")
    public ResponseEntity<List<UserViewDTO>> searchProfiles(
            @RequestParam String search,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(userViewService.searchProfiles(search, requesterId));
    }
}