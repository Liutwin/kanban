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
 * Préfixe de route : {@code /users}
 *
 * <p>Ces endpoints sont réservés à l'administration : ils exposent les statistiques
 * agrégées de chaque utilisateur issues de la vue {@code vue_profil_utilisateur}.</p>
 */
@RestController
@RequestMapping("/users/profiles")
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "Gestion des comptes utilisateurs")
public class UserViewController {

    private final UserViewService userViewService;

    /**
     * Récupère la liste de tous les profils utilisateurs,
     * triés par date de dernière activité décroissante.
     *
     * @return une liste de {@link UserViewDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister tous les utilisateurs")
    @GetMapping
    public ResponseEntity<List<UserViewDTO>> getAllProfiles() {
        return ResponseEntity.ok(userViewService.getAllProfiles());
    }

    /**
     * Récupère le profil statistique d'un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur
     * @return le {@link UserViewDTO} correspondant avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un utilisateur par ID")
    @GetMapping("/{id}")
    public ResponseEntity<UserViewDTO> getProfileById(@PathVariable Long id) {
        return ResponseEntity.ok(userViewService.getProfileById(id));
    }

    /**
     * Recherche des profils dont le nom ou le prénom contient la chaîne fournie,
     * sans distinction de casse.
     *
     * @param search la chaîne à rechercher
     * @return la liste des {@link UserViewDTO} correspondants avec statut HTTP 200
     */
    @Operation(summary = "Rechercher des utilisateurs par nom ou prénom")
    @GetMapping(params = "search")
    public ResponseEntity<List<UserViewDTO>> searchProfiles(@RequestParam String search) {
        return ResponseEntity.ok(userViewService.searchProfiles(search));
    }
}
