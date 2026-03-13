package com.controllers;

import com.dtos.FileDTO;
import com.services.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des pièces jointes.
 * Préfixe de route : {@code /fichiers}
 * Les documents sont stockés dans MongoDB (collection document_doc).
 */
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Tag(name = "Fichiers", description = "Gestion des pièces jointes d'une tâche Kanban")
public class FileController {

    private final FileService fileService;

    /**
     * Récupère toutes les pièces jointes d'une tâche.
     *
     * @param id l'identifiant de la tâche (référence MariaDB)
     * @return liste de {@link FileDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les fichiers d'une tâche")
    @GetMapping("/task/{id}")
    public ResponseEntity<List<FileDTO>> getByTask(@PathVariable Long id) {
        return ResponseEntity.ok(fileService.getFilesByTask(id));
    }

    /**
     * Récupère toutes les pièces jointes liées à un commentaire.
     *
     * @param id l'identifiant du commentaire (ObjectId en String)
     * @return liste de {@link FileDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les fichiers d'un commentaire")
    @GetMapping("/comment/{id}")
    public ResponseEntity<List<FileDTO>> getByComment(@PathVariable String id) {
        return ResponseEntity.ok(fileService.getFilesByComment(id));
    }

    /**
     * Récupère un fichier par son identifiant MongoDB.
     *
     * @param id l'identifiant du fichier (ObjectId en String)
     * @return le {@link FileDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un fichier par ID")
    @GetMapping("/{id}")
    public ResponseEntity<FileDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(fileService.getFileById(id));
    }

    /**
     * Enregistre les métadonnées d'un fichier déposé sur une tâche.
     *
     * @param dto les métadonnées du fichier (tskId et usrId obligatoires)
     * @return le {@link FileDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Ajouter un fichier à une tâche")
    @PostMapping
    public ResponseEntity<FileDTO> addFile(@RequestBody FileDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(fileService.addFile(dto));
    }

    /**
     * Supprime un fichier par son identifiant.
     *
     * @param id l'identifiant du fichier à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer un fichier")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable String id) {
        fileService.deleteFile(id);
        return ResponseEntity.noContent().build();
    }
}
