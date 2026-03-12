package com.controllers;

import com.dtos.BoardMemberDTO;
import com.entities.BoardMember;
import com.services.BoardMemberService;
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
public class BoardMemberController {

    private final BoardMemberService boardMemberService;

    /**
     * Récupère tous les tableaux auxquels un utilisateur participe.
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste de {@link BoardMemberDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tableaux d'un utilisateur")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BoardMemberDTO>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(boardMemberService.getParticipationsByUser(userId));
    }

    /**
     * Récupère tous les membres d'un tableau.
     *
     * @param tableauId l'identifiant du tableau
     * @return liste de {@link BoardMemberDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les membres d'un tableau")
    @GetMapping("/tableau/{tableauId}")
    public ResponseEntity<List<BoardMemberDTO>> getByTableau(@PathVariable Long tableauId) {
        return ResponseEntity.ok(boardMemberService.getParticipationsByTableau(tableauId));
    }

    /**
     * Ajoute un utilisateur à un tableau.
     *
     * @param dto les données de la participation
     * @return le {@link BoardMemberDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Ajouter un membre à un tableau")
    @PostMapping
    public ResponseEntity<BoardMemberDTO> addParticipation(@RequestBody BoardMemberDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(boardMemberService.addParticipation(dto));
    }

    /**
     * Met à jour le rôle d'un membre dans un tableau.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @param role      le nouveau rôle
     * @return le {@link BoardMemberDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour le rôle d'un membre")
    @PutMapping("/user/{userId}/tableau/{tableauId}")
    public ResponseEntity<BoardMemberDTO> updateRole(
            @PathVariable Long userId,
            @PathVariable Long tableauId,
            @RequestParam BoardMember.Role role) {
        return ResponseEntity.ok(boardMemberService.updateRole(userId, tableauId, role));
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
        boardMemberService.removeParticipation(userId, tableauId);
        return ResponseEntity.noContent().build();
    }
}