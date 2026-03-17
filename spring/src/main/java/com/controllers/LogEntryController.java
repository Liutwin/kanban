package com.controllers;

import com.dtos.LogEntryDTO;
import com.entities.LogEntry;
import com.services.LogEntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de consultation du journal d'activité.
 *
 * <p>Les logs sont exposés en lecture seule via trois routes imbriquées,
 * selon l'axe de navigation naturel :</p>
 * <ul>
 *   <li>{@code GET /boards/{id}/logs}  — historique d'un tableau ;</li>
 *   <li>{@code GET /tasks/{id}/logs}   — cycle de vie d'une tâche ;</li>
 *   <li>{@code GET /users/{id}/logs}   — activité d'un utilisateur.</li>
 * </ul>
 *
 * <p>Chaque endpoint accepte les paramètres de filtre optionnels suivants :</p>
 * <ul>
 *   <li>{@code type}  — valeur de {@link LogEntry.LogType} en minuscules
 *       ({@code creation}, {@code deplacement}, {@code modification}) ;</li>
 *   <li>{@code from}  — borne inférieure de la plage de dates (ISO 8601) ;</li>
 *   <li>{@code to}    — borne supérieure de la plage de dates (ISO 8601).</li>
 * </ul>
 *
 * <p>Chaque endpoint reçoit l'en-tête {@code X-User-Id} injecté par le proxy
 * Deno, utilisé pour vérifier les droits d'accès dans le service.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Journaux", description = "Consultation du journal d'activité des tableaux Kanban")
public class LogEntryController {

    private final LogEntryService logEntryService;

    /**
     * Récupère le journal d'activité d'un tableau.
     *
     * <p>Retourne HTTP 403 si le requérant n'est pas membre du tableau
     * et n'est pas administrateur global.</p>
     *
     * @param boardId     l'identifiant du tableau
     * @param type        filtre optionnel sur le type d'action
     * @param from        filtre optionnel : borne inférieure de date (inclusive)
     * @param to          filtre optionnel : borne supérieure de date (inclusive)
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return liste de {@link LogEntryDTO} triée par date décroissante,
     *         avec statut HTTP 200
     */
    @Operation(summary = "Lister le journal d'un tableau")
    @GetMapping("/boards/{id}/logs")
    public ResponseEntity<List<LogEntryDTO>> getLogsByBoard(
            @PathVariable("id") Long boardId,
            @RequestParam(required = false) LogEntry.LogType type,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestHeader("X-User-Id") Long requesterId) {

        return ResponseEntity.ok(
                logEntryService.getLogsByBoard(boardId, type, from, to, requesterId));
    }

    /**
     * Récupère le journal d'activité d'une tâche.
     *
     * <p>Retourne HTTP 403 si le requérant n'est pas membre du tableau
     * contenant la tâche et n'est pas administrateur global.</p>
     *
     * @param taskId      l'identifiant de la tâche
     * @param type        filtre optionnel sur le type d'action
     * @param from        filtre optionnel : borne inférieure de date (inclusive)
     * @param to          filtre optionnel : borne supérieure de date (inclusive)
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return liste de {@link LogEntryDTO} triée par date décroissante,
     *         avec statut HTTP 200
     */
    @Operation(summary = "Lister le journal d'une tâche")
    @GetMapping("/tasks/{id}/logs")
    public ResponseEntity<List<LogEntryDTO>> getLogsByTask(
            @PathVariable("id") Long taskId,
            @RequestParam(required = false) LogEntry.LogType type,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestHeader("X-User-Id") Long requesterId) {

        return ResponseEntity.ok(
                logEntryService.getLogsByTask(taskId, type, from, to, requesterId));
    }

    /**
     * Récupère le journal d'activité d'un utilisateur.
     *
     * <p>Accessible par l'utilisateur lui-même ou par un administrateur global.
     * Retourne HTTP 403 dans les autres cas.</p>
     *
     * @param userId      l'identifiant de l'utilisateur cible
     * @param type        filtre optionnel sur le type d'action
     * @param from        filtre optionnel : borne inférieure de date (inclusive)
     * @param to          filtre optionnel : borne supérieure de date (inclusive)
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par Deno
     *                    via l'en-tête {@code X-User-Id}
     * @return liste de {@link LogEntryDTO} triée par date décroissante,
     *         avec statut HTTP 200
     */
    @Operation(summary = "Lister le journal d'un utilisateur")
    @GetMapping("/users/{id}/logs")
    public ResponseEntity<List<LogEntryDTO>> getLogsByUser(
            @PathVariable("id") Long userId,
            @RequestParam(required = false) LogEntry.LogType type,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestHeader("X-User-Id") Long requesterId) {

        return ResponseEntity.ok(
                logEntryService.getLogsByUser(userId, type, from, to, requesterId));
    }
}
