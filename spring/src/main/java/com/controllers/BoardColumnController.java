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
 * Préfixe de route : {@code /boards/{boardId}/columns}
 *
 * <p>L'en-tête {@code X-User-Id} injecté par le proxy Deno est transmis
 * au service à chaque opération afin de vérifier que l'utilisateur
 * authentifié est bien membre du tableau concerné.</p>
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
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau.</p>
     *
     * @param boardId     l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return liste de {@link BoardColumnDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les colonnes d'un tableau")
    @GetMapping
    public ResponseEntity<List<BoardColumnDTO>> getColumns(
            @PathVariable Long boardId,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardColumnService.getColumnsByTableau(boardId, requesterId));
    }

    /**
     * Récupère une colonne par son identifiant.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau
     * auquel appartient la colonne.</p>
     *
     * @param boardId     l'identifiant du tableau (utilisé pour le routage)
     * @param id          l'identifiant de la colonne
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return le {@link BoardColumnDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer une colonne par ID")
    @GetMapping("/{id}")
    public ResponseEntity<BoardColumnDTO> getColumn(
            @PathVariable Long boardId,
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardColumnService.getColumnById(id, requesterId));
    }

    /**
     * Crée une nouvelle colonne dans un tableau.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau.</p>
     *
     * @param boardId     l'identifiant du tableau
     * @param dto         les données de la nouvelle colonne
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return le {@link BoardColumnDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer une colonne")
    @PostMapping
    public ResponseEntity<BoardColumnDTO> createColumn(
            @PathVariable Long boardId,
            @RequestBody BoardColumnDTO dto,
            @RequestHeader("X-User-Id") Long requesterId) {
        dto.setBoardId(boardId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(boardColumnService.createColumn(dto, requesterId));
    }

    /**
     * Renomme une colonne existante.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau.</p>
     *
     * @param boardId     l'identifiant du tableau (utilisé pour le routage)
     * @param id          l'identifiant de la colonne
     * @param dto         les nouvelles données
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return le {@link BoardColumnDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Renommer une colonne")
    @PutMapping("/{id}")
    public ResponseEntity<BoardColumnDTO> updateColumn(
            @PathVariable Long boardId,
            @PathVariable Long id,
            @RequestBody BoardColumnDTO dto,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardColumnService.updateColumn(id, dto, requesterId));
    }

    /**
     * Déplace une colonne vers une nouvelle position.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau.</p>
     *
     * @param boardId     l'identifiant du tableau (utilisé pour le routage)
     * @param id          l'identifiant de la colonne à déplacer
     * @param newNum      la nouvelle position cible
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Déplacer une colonne")
    @PatchMapping("/{id}/move")
    public ResponseEntity<Void> moveColumn(
            @PathVariable Long boardId,
            @PathVariable Long id,
            @RequestParam int newNum,
            @RequestHeader("X-User-Id") Long requesterId) {
        boardColumnService.moveColumn(id, newNum, requesterId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Supprime une colonne par son identifiant.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau.</p>
     *
     * @param boardId     l'identifiant du tableau (utilisé pour le routage)
     * @param id          l'identifiant de la colonne à supprimer
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer une colonne")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteColumn(
            @PathVariable Long boardId,
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        boardColumnService.deleteColumn(id, requesterId);
        return ResponseEntity.noContent().build();
    }
}