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

@RestController
@RequestMapping("/boards")
@RequiredArgsConstructor
@Tag(name = "Tableaux", description = "Gestion des tableaux Kanban")
public class BoardController {

    private final BoardService boardService;

    // -------------------------------------------------------------------------
    // Tableaux
    // -------------------------------------------------------------------------

    @Operation(summary = "Lister tous les tableaux")
    @GetMapping
    public ResponseEntity<List<BoardDTO>> getAllBoards() {
        return ResponseEntity.ok(boardService.getAllTables());
    }

    @Operation(summary = "Récupérer un tableau par ID")
    @GetMapping("/{id}")
    public ResponseEntity<BoardDTO> getBoardById(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.getBoardById(id, requesterId));
    }

    @Operation(summary = "Lister les tableaux d'un utilisateur")
    @GetMapping("/user/{id}")
    public ResponseEntity<List<BoardDTO>> getBoardsByUser(@PathVariable Long id) {
        return ResponseEntity.ok(boardService.getBoardsByUser(id));
    }

    @Operation(summary = "Créer un tableau")
    @PostMapping
    public ResponseEntity<BoardDTO> createBoard(@RequestBody BoardDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(boardService.createBoard(dto));
    }

    @Operation(summary = "Mettre à jour un tableau")
    @PutMapping("/{id}")
    public ResponseEntity<BoardDTO> updateBoard(
            @PathVariable Long id,
            @RequestBody BoardDTO dto,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.updateTable(id, dto, requesterId));
    }

    @Operation(summary = "Supprimer un tableau")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBoard(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        boardService.deleteTable(id, requesterId);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // Membres
    // -------------------------------------------------------------------------

    @Operation(summary = "Lister les membres d'un tableau")
    @GetMapping("/{id}/members")
    public ResponseEntity<List<BoardMemberDTO>> getMembers(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.getMembersByBoard(id, requesterId));
    }

    @Operation(summary = "Inviter un membre dans un tableau")
    @PostMapping("/{id}/members")
    public ResponseEntity<BoardMemberDTO> addMember(
            @PathVariable Long id,
            @RequestBody BoardMemberDTO dto,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(boardService.addMember(id, dto, requesterId));
    }

    @Operation(summary = "Mettre à jour le rôle d'un membre")
    @PutMapping("/{id}/members/{userId}")
    public ResponseEntity<BoardMemberDTO> updateMemberRole(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestParam BoardMember.Role role,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.updateMemberRole(id, userId, role, requesterId));
    }

    @Operation(summary = "Retirer un membre d'un tableau")
    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestHeader("X-User-Id") Long requesterId) {
        boardService.removeMember(id, userId, requesterId);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // Invitations — côté admin
    // -------------------------------------------------------------------------

    @Operation(summary = "Lister les invitations en attente d'un tableau (admin)")
    @GetMapping("/{id}/members/pending")
    public ResponseEntity<List<BoardMemberDTO>> getPendingInvitations(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.getPendingInvitations(id, requesterId));
    }

    @Operation(summary = "Valider manuellement une invitation (admin)")
    @PatchMapping("/{id}/members/{userId}/validate")
    public ResponseEntity<BoardMemberDTO> validateInvitation(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.validateInvitation(id, userId, requesterId));
    }

    // -------------------------------------------------------------------------
    // Invitations — côté utilisateur (page Boards)
    // -------------------------------------------------------------------------

    @Operation(summary = "Lister mes invitations en attente")
    @GetMapping("/invitations/me")
    public ResponseEntity<List<BoardMemberDTO>> getMyPendingInvitations(
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.getMyPendingInvitations(requesterId));
    }

    @Operation(summary = "Accepter mon invitation à un tableau")
    @PatchMapping("/{id}/members/me/accept")
    public ResponseEntity<BoardMemberDTO> acceptInvitation(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(boardService.acceptInvitation(id, requesterId));
    }

    @Operation(summary = "Refuser mon invitation à un tableau")
    @DeleteMapping("/{id}/members/me/decline")
    public ResponseEntity<Void> declineInvitation(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        boardService.declineInvitation(id, requesterId);
        return ResponseEntity.noContent().build();
    }
}