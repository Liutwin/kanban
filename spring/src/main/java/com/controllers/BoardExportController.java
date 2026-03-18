package com.controllers;

import com.services.BoardExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur REST exposant l'export PDF d'un tableau Kanban.
 * Préfixe de route : {@code /boards/{id}/export}
 *
 * <p>L'en-tête {@code X-User-Id} est injecté par le proxy Deno,
 * comme pour tous les autres endpoints de {@code /boards}.</p>
 */
@RestController
@RequestMapping("/boards")
@RequiredArgsConstructor
@Tag(name = "Tableaux", description = "Gestion des tableaux Kanban")
public class BoardExportController {

    private final BoardExportService boardExportService;

    /**
     * Génère et retourne un export PDF de l'état courant d'un tableau Kanban.
     *
     * <p>Le fichier est renvoyé avec :</p>
     * <ul>
     *   <li>{@code Content-Type: application/pdf}</li>
     *   <li>{@code Content-Disposition: attachment; filename="kanban-{id}.pdf"}</li>
     * </ul>
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau.</p>
     *
     * @param id          l'identifiant du tableau à exporter
     * @param requesterId l'identifiant de l'utilisateur connecté,
     *                    fourni par Deno via l'en-tête {@code X-User-Id}
     * @return le PDF en bytes avec statut HTTP 200
     */
    @Operation(summary = "Exporter un tableau en PDF")
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportBoard(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {

        byte[] pdf = boardExportService.exportBoardToPdf(id, requesterId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"kanban-" + id + ".pdf\"")
                .body(pdf);
    }
}
