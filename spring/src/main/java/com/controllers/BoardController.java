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
 * Préfixe de route : {@code /boards}
 *
 * <p>Chaque endpoint (sauf {@code GET /boards/user/{id}}) reçoit l'en-tête
 * {@code X-User-Id} injecté par le proxy Deno. Cet identifiant est transmis
 * au service afin de vérifier que l'utilisateur authentifié est bien
 * autorisé à accéder à la ressource demandée.</p>
 */
@RestController
@RequestMapping("/boards")
@RequiredArgsConstructor
@Tag(name = "Tableaux", description = "Gestion des tableaux Kanban")
public class BoardController {

    private final BoardService boardService;

    /**
     * Récupère tous les tableaux existants.
     *
     * <p><strong>Réservé à l'administration.</strong></p>
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
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau.</p>
     *
     * @param id          l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return le {@link BoardDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un tableau par ID")
    @GetMapping("/{id}")
    public ResponseEntity<BoardDTO> getBoardById(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.getBoardById(id, requesterId));
    }

    /**
     * Récupère tous les tableaux auxquels un utilisateur participe
     * (créés par lui ou dont il est membre).
     *
     * @param id l'identifiant de l'utilisateur
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
                .body(boardService.createBoard(dto));
    }

    /**
     * Met à jour un tableau existant.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas administrateur du tableau.</p>
     *
     * @param id          l'identifiant du tableau à modifier
     * @param dto         les nouvelles données
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return le {@link BoardDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour un tableau")
    @PutMapping("/{id}")
    public ResponseEntity<BoardDTO> updateBoard(
            @PathVariable Long id,
            @RequestBody BoardDTO dto,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.updateTable(id, dto, requesterId));
    }

    /**
     * Supprime un tableau par son identifiant.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas le créateur du tableau.</p>
     *
     * @param id          l'identifiant du tableau à supprimer
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer un tableau")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBoard(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        boardService.deleteTable(id, requesterId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Récupère la liste des membres d'un tableau.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau.</p>
     *
     * @param id          l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return liste de {@link BoardMemberDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les membres d'un tableau")
    @GetMapping("/{id}/members")
    public ResponseEntity<List<BoardMemberDTO>> getMembers(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.getMembersByBoard(id, requesterId));
    }

    /**
     * Ajoute un membre à un tableau.
     *
     * <p>Le {@code boardId} de l'URL fait foi ; le champ {@code boardId} du corps
     * est ignoré et écrasé par la valeur de l'URL.</p>
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas administrateur du tableau.</p>
     *
     * @param id          l'identifiant du tableau
     * @param dto         les données du nouveau membre (userId + role)
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return le {@link BoardMemberDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Ajouter un membre à un tableau")
    @PostMapping("/{id}/members")
    public ResponseEntity<BoardMemberDTO> addMember(
            @PathVariable Long id,
            @RequestBody BoardMemberDTO dto,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(boardService.addMember(id, dto, requesterId));
    }

    /**
     * Met à jour le rôle d'un membre dans un tableau.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas administrateur du tableau.</p>
     *
     * @param id          l'identifiant du tableau
     * @param userId      l'identifiant de l'utilisateur dont le rôle est modifié
     * @param role        le nouveau rôle
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return le {@link BoardMemberDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour le rôle d'un membre")
    @PutMapping("/{id}/members/{userId}")
    public ResponseEntity<BoardMemberDTO> updateMemberRole(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestParam BoardMember.Role role,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.updateMemberRole(id, userId, role, requesterId));
    }

    /**
     * Retire un membre d'un tableau.
     *
     * <p>Autorisé pour l'administrateur du tableau, son créateur,
     * ou l'utilisateur lui-même (auto-retrait).</p>
     * <p>Retourne HTTP 403 dans tous les autres cas.</p>
     *
     * @param id          l'identifiant du tableau
     * @param userId      l'identifiant de l'utilisateur à retirer
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Retirer un membre d'un tableau")
    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestHeader("X-User-Id") Long requesterId) {
        boardService.removeMember(id, userId, requesterId);
        return ResponseEntity.noContent().build();
    }
}