package com.controllers;

import com.dtos.ParticipationDTO;
import com.entities.Participation;
import com.services.ParticipationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des participations aux tableaux.
 * Préfixe de route : {@code /participations}
 */
@RestController
@RequestMapping("/participations")
@RequiredArgsConstructor
@Tag(name = "Participations", description = "Gestion des membres des tableaux Kanban")
public class ParticipationController {

    private final ParticipationService participationService;

    /**
     * Récupère tous les tableaux auxquels un utilisateur participe.
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste de {@link ParticipationDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tableaux d'un utilisateur")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ParticipationDTO>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(participationService.getParticipationsByUser(userId));
    }

    /**
     * Récupère tous les membres d'un tableau.
     *
     * @param tableauId l'identifiant du tableau
     * @return liste de {@link ParticipationDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les membres d'un tableau")
    @GetMapping("/tableau/{tableauId}")
    public ResponseEntity<List<ParticipationDTO>> getByTableau(@PathVariable Long tableauId) {
        return ResponseEntity.ok(participationService.getParticipationsByTableau(tableauId));
    }

    /**
     * Ajoute un utilisateur à un tableau.
     *
     * @param dto les données de la participation
     * @return le {@link ParticipationDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Ajouter un membre à un tableau")
    @PostMapping
    public ResponseEntity<ParticipationDTO> addParticipation(@RequestBody ParticipationDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(participationService.addParticipation(dto));
    }

    /**
     * Met à jour le rôle d'un membre dans un tableau.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @param role      le nouveau rôle
     * @return le {@link ParticipationDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour le rôle d'un membre")
    @PutMapping("/user/{userId}/tableau/{tableauId}")
    public ResponseEntity<ParticipationDTO> updateRole(
            @PathVariable Long userId,
            @PathVariable Long tableauId,
            @RequestParam Participation.Role role) {
        return ResponseEntity.ok(participationService.updateRole(userId, tableauId, role));
    }

    /**
     * Retire un membre d'un tableau.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Retirer un membre d'un tableau")
    @DeleteMapping("/user/{userId}/tableau/{tableauId}")
    public ResponseEntity<Void> removeParticipation(
            @PathVariable Long userId,
            @PathVariable Long tableauId) {
        participationService.removeParticipation(userId, tableauId);
        return ResponseEntity.noContent().build();
    }
}