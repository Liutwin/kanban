package com.controllers;

import com.dtos.CommentDTO;
import com.services.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des commentaires.
 * Préfixe de route : {@code /commentaires}
 * Les commentaires sont stockés dans MongoDB (collection commentaire_com).
 */
@RestController
@RequestMapping("/comments")
@RequiredArgsConstructor
@Tag(name = "Commentaires", description = "Gestion des commentaires d'une tâche Kanban")
public class CommentController {

    private final CommentService commentService;

    /**
     * Récupère tous les commentaires d'une tâche, triés par date croissante.
     *
     * @param id l'identifiant de la tâche (référence MariaDB)
     * @return liste de {@link CommentDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les commentaires d'une tâche")
    @GetMapping("/task/{id}")
    public ResponseEntity<List<CommentDTO>> getByTask(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.getCommentsByTache(id));
    }

    /**
     * Récupère un commentaire par son identifiant MongoDB.
     *
     * @param id l'identifiant du commentaire (ObjectId en String)
     * @return le {@link CommentDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un commentaire par ID")
    @GetMapping("/{id}")
    public ResponseEntity<CommentDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(commentService.getCommentById(id));
    }

    /**
     * Ajoute un commentaire à une tâche.
     *
     * @param dto les données du commentaire (tskId et usrId obligatoires)
     * @return le {@link CommentDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Ajouter un commentaire à une tâche")
    @PostMapping
    public ResponseEntity<CommentDTO> addComment(@RequestBody CommentDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.addComment(dto));
    }

    /**
     * Met à jour le contenu d'un commentaire existant.
     *
     * @param id  l'identifiant du commentaire
     * @param dto les nouvelles données
     * @return le {@link CommentDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour un commentaire")
    @PutMapping("/{id}")
    public ResponseEntity<CommentDTO> updateComment(@PathVariable String id,
                                                    @RequestBody CommentDTO dto) {
        return ResponseEntity.ok(commentService.updateComment(id, dto));
    }

    /**
     * Supprime un commentaire par son identifiant.
     *
     * @param id l'identifiant du commentaire à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer un commentaire")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable String id) {
        commentService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }
}
