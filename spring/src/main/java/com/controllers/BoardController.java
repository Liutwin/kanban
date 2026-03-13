package com.controllers;

import com.dtos.BoardDTO;
import com.dtos.BoardMemberDTO;
import com.entities.BoardMember;
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
@RequestMapping("/boards")
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
    public ResponseEntity<List<BoardDTO>> getAllBoards() {
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
    public ResponseEntity<BoardDTO> getBoardById(@PathVariable Long id) {
        return ResponseEntity.ok(boardService.getBoardById(id));
    }

    /**
     * Récupère tous les tableaux d'un utilisateur donné.
     *
     * @param id l'identifiant de l'utilisateur créateur
     * @return liste de {@link BoardDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tableaux d'un utilisateur")
    @GetMapping("/user/{id}")
    public ResponseEntity<List<BoardDTO>> getBoardsByUser(@PathVariable Long id) {
        return ResponseEntity.ok(boardService.getBoardsByUser(id));
    }

    /**
     * Crée un nouveau tableau.
     *
     * @param dto les données du nouveau tableau
     * @return le {@link BoardDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer un tableau")
    @PostMapping
    public ResponseEntity<BoardDTO> createBoard(@RequestBody BoardDTO dto) {
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
    public ResponseEntity<BoardDTO> updateBoard(@PathVariable Long id, @RequestBody BoardDTO dto) {
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
    public ResponseEntity<Void> deleteBoard(@PathVariable Long id) {
        boardService.deleteTable(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Récupère la liste des membres d'un tableau.
     *
     * @param id l'identifiant du tableau
     * @return liste de {@link BoardMemberDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les membres d'un tableau")
    @GetMapping("/{id}/members")
    public ResponseEntity<List<BoardMemberDTO>> getMembers(@PathVariable Long id) {
        return ResponseEntity.ok(boardService.getMembersByBoard(id));
    }

    /**
     * Ajoute un membre à un tableau.
     * Le {@code boardId} de l'URL fait foi ; le champ {@code tableauId} du corps
     * est ignoré et écrasé par la valeur de l'URL.
     *
     * @param id  l'identifiant du tableau
     * @param dto les données du nouveau membre (userId + role)
     * @return le {@link BoardMemberDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Ajouter un membre à un tableau")
    @PostMapping("/{id}/members")
    public ResponseEntity<BoardMemberDTO> addMember(
            @PathVariable Long id,
            @RequestBody BoardMemberDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(boardService.addMember(id, dto));
    }

    /**
     * Met à jour le rôle d'un membre dans un tableau.
     *
     * @param id     l'identifiant du tableau
     * @param userId l'identifiant de l'utilisateur
     * @param role   le nouveau rôle
     * @return le {@link BoardMemberDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour le rôle d'un membre")
    @PutMapping("/{id}/members/{userId}")
    public ResponseEntity<BoardMemberDTO> updateMemberRole(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestParam BoardMember.Role role) {
        return ResponseEntity.ok(boardService.updateMemberRole(id, userId, role));
    }

    /**
     * Retire un membre d'un tableau.
     *
     * @param id     l'identifiant du tableau
     * @param userId l'identifiant de l'utilisateur à retirer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Retirer un membre d'un tableau")
    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @PathVariable Long userId) {
        boardService.removeMember(id, userId);
        return ResponseEntity.noContent().build();
    }
}