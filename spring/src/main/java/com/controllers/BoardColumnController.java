package com.controllers;

import com.dtos.BoardColumnDTO;
import com.services.BoardColumnService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des colonnes Kanban.
 * Préfixe de route : {@code /boards/{id}/columns}
 */
@RestController
@RequestMapping("/boards/{boardId}/columns")
@RequiredArgsConstructor
@Tag(name = "Colonnes", description = "Gestion des colonnes d'un tableau Kanban")
public class BoardColumnController {

    private final BoardColumnService boardColumnService;

    /**
     * Récupère toutes les colonnes d'un tableau, triées par numéro.
     *
     * @param boardId l'identifiant du tableau
     * @return liste de {@link BoardColumnDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les colonnes d'un tableau")
    @GetMapping
    public ResponseEntity<List<BoardColumnDTO>> getColumns(@PathVariable Long boardId) {
        return ResponseEntity.ok(boardColumnService.getColumnsByTableau(boardId));
    }

    /**
     * Récupère une colonne par son identifiant.
     *
     * @param id l'identifiant de la colonne
     * @return le {@link BoardColumnDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer une colonne par ID")
    @GetMapping("/{id}")
    public ResponseEntity<BoardColumnDTO> getColumn(@PathVariable Long boardId,
                                                    @PathVariable Long id) {
        return ResponseEntity.ok(boardColumnService.getColumnById(id));
    }

    /**
     * Crée une nouvelle colonne dans un tableau.
     *
     * @param boardId l'identifiant du tableau
     * @param dto       les données de la nouvelle colonne
     * @return le {@link BoardColumnDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer une colonne")
    @PostMapping
    public ResponseEntity<BoardColumnDTO> createColumn(@PathVariable Long boardId,
                                                       @RequestBody BoardColumnDTO dto) {
        dto.setBoardId(boardId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(boardColumnService.createColumn(dto));
    }

    /**
     * Renomme une colonne existante.
     *
     * @param id  l'identifiant de la colonne
     * @param dto les nouvelles données
     * @return le {@link BoardColumnDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Renommer une colonne")
    @PutMapping("/{id}")
    public ResponseEntity<BoardColumnDTO> updateColonne(@PathVariable Long boardId,
                                                        @PathVariable Long id,
                                                        @RequestBody BoardColumnDTO dto) {
        return ResponseEntity.ok(boardColumnService.updateColumn(id, dto));
    }

    /**
     * Déplace une colonne vers une nouvelle position.
     *
     * @param id     l'identifiant de la colonne à déplacer
     * @param newNum la nouvelle position cible
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Déplacer une colonne")
    @PatchMapping("/{id}/move")
    public ResponseEntity<Void> deplacerColonne(@PathVariable Long boardd,
                                                @PathVariable Long id,
                                                @RequestParam int newNum) {
        boardColumnService.moveColumn(id, newNum);
        return ResponseEntity.noContent().build();
    }

    /**
     * Supprime une colonne par son identifiant.
     *
     * @param id l'identifiant de la colonne à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer une colonne")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteColonne(@PathVariable Long boardId,
                                              @PathVariable Long id) {
        boardColumnService.deleteColumn(id);
        return ResponseEntity.noContent().build();
    }
}