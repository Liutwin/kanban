package com.controllers;

import com.dtos.BoardDTO;
import com.services.BoardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des tableaux Kanban.
 * Préfixe de route : {@code /tableaux}
 */
@RestController
@RequestMapping("/tableaux")
@RequiredArgsConstructor
@Tag(name = "Tableaux", description = "Gestion des tableaux Kanban")
public class BoardController {

    private final BoardService boardService;

    /**
     * Récupère tous les tableaux.
     *
     * @return liste de {@link BoardDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister tous les tableaux")
    @GetMapping
    public ResponseEntity<List<BoardDTO>> getAllTableaux() {
        return ResponseEntity.ok(boardService.getAllTables());
    }

    /**
     * Récupère un tableau par son identifiant.
     *
     * @param id l'identifiant du tableau
     * @return le {@link BoardDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un tableau par ID")
    @GetMapping("/{id}")
    public ResponseEntity<BoardDTO> getTableauById(@PathVariable Long id) {
        return ResponseEntity.ok(boardService.getTableById(id));
    }

    /**
     * Récupère tous les tableaux d'un utilisateur donné.
     *
     * @param createurId l'identifiant de l'utilisateur créateur
     * @return liste de {@link BoardDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tableaux d'un utilisateur")
    @GetMapping("/user/{createurId}")
    public ResponseEntity<List<BoardDTO>> getTableauxByCreateur(@PathVariable Long createurId) {
        return ResponseEntity.ok(boardService.getTablesByCreator(createurId));
    }

    /**
     * Crée un nouveau tableau.
     *
     * @param dto les données du nouveau tableau
     * @return le {@link BoardDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer un tableau")
    @PostMapping
    public ResponseEntity<BoardDTO> createTableau(@RequestBody BoardDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(boardService.createTable(dto));
    }

    /**
     * Met à jour un tableau existant.
     *
     * @param id  l'identifiant du tableau à modifier
     * @param dto les nouvelles données
     * @return le {@link BoardDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour un tableau")
    @PutMapping("/{id}")
    public ResponseEntity<BoardDTO> updateTableau(@PathVariable Long id, @RequestBody BoardDTO dto) {
        return ResponseEntity.ok(boardService.updateTable(id, dto));
    }

    /**
     * Supprime un tableau par son identifiant.
     *
     * @param id l'identifiant du tableau à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer un tableau")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTableau(@PathVariable Long id) {
        boardService.deleteTable(id);
        return ResponseEntity.noContent().build();
    }
}