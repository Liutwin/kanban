package com.controllers;

import com.dtos.FileDTO;
import com.services.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des pièces jointes.
 * Préfixe de route : {@code /files}
 * Les métadonnées sont stockées dans MongoDB (collection document_doc),
 * les fichiers physiques sur le disque du serveur (app.upload.dir).
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
     * Récupère les métadonnées d'un fichier par son identifiant MongoDB.
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
     * Télécharge le contenu binaire d'un fichier.
     * Le header Content-Disposition force le téléchargement avec le nom original du fichier.
     *
     * @param id l'identifiant du fichier (ObjectId en String)
     * @return le contenu du fichier avec statut HTTP 200
     */
    @Operation(summary = "Télécharger un fichier")
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable String id) {
        FileDTO  meta     = fileService.getFileById(id);
        Resource resource = fileService.downloadFile(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(meta.getType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + meta.getName() + "\"")
                .body(resource);
    }

    /**
     * Uploade un fichier et enregistre ses métadonnées dans MongoDB.
     * Reçoit un formulaire multipart avec le fichier binaire et les identifiants associés.
     *
     * @param file  le fichier binaire uploadé
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     * @param usrId l'identifiant de l'utilisateur (référence MariaDB)
     * @param comId l'identifiant du commentaire associé (optionnel, ObjectId en String)
     * @return le {@link FileDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Ajouter un fichier à une tâche")
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<FileDTO> uploadFile(
            @RequestParam("file")                          MultipartFile file,
            @RequestParam("tskId")                         Long          tskId,
            @RequestParam("usrId")                         Long          usrId,
            @RequestParam(value = "comId", required = false) String      comId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(fileService.uploadFile(file, tskId, usrId, comId));
    }

    /**
     * Supprime un fichier par son identifiant (métadonnées + fichier physique).
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