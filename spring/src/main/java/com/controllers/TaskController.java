package com.controllers;

import com.dtos.TaskDTO;
import com.entities.Task;
import com.services.TacheService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des tâches Kanban.
 * Préfixe de route : {@code /taches}
 */
@RestController
@RequestMapping("/taches")
@RequiredArgsConstructor
@Tag(name = "Tâches", description = "Gestion des tâches d'un tableau Kanban")
public class TaskController {

    private final TacheService tacheService;

    /**
     * Récupère toutes les tâches d'une colonne.
     *
     * @param colonneId l'identifiant de la colonne
     * @return liste de {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tâches d'une colonne")
    @GetMapping("/colonne/{colonneId}")
    public ResponseEntity<List<TaskDTO>> getByColonne(@PathVariable Long colonneId) {
        return ResponseEntity.ok(tacheService.getTasksByBoardColumn(colonneId));
    }

    /**
     * Récupère toutes les tâches assignées à un utilisateur.
     *
     * @param assigneeId l'identifiant de l'utilisateur
     * @return liste de {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tâches d'un utilisateur")
    @GetMapping("/assignee/{assigneeId}")
    public ResponseEntity<List<TaskDTO>> getByAssignee(@PathVariable Long assigneeId) {
        return ResponseEntity.ok(tacheService.getTasksByAssigned(assigneeId));
    }

    /**
     * Récupère les tâches d'une colonne filtrées par priorité.
     *
     * @param colonneId l'identifiant de la colonne
     * @param priorite  le niveau de priorité
     * @return liste de {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tâches par priorité")
    @GetMapping("/colonne/{colonneId}/priorite/{priorite}")
    public ResponseEntity<List<TaskDTO>> getByPriorite(@PathVariable Long colonneId,
                                                       @PathVariable Task.Priority priorite) {
        return ResponseEntity.ok(tacheService.getTasksByColumnAndPriority(colonneId, priorite));
    }

    /**
     * Récupère une tâche par son identifiant.
     *
     * @param id l'identifiant de la tâche
     * @return le {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer une tâche par ID")
    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(tacheService.getTaskById(id));
    }

    /**
     * Crée une nouvelle tâche.
     *
     * @param dto les données de la nouvelle tâche
     * @return le {@link TaskDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer une tâche")
    @PostMapping
    public ResponseEntity<TaskDTO> createTache(@RequestBody TaskDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tacheService.createTask(dto));
    }

    /**
     * Met à jour une tâche existante.
     *
     * @param id  l'identifiant de la tâche
     * @param dto les nouvelles données
     * @return le {@link TaskDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour une tâche")
    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> updateTache(@PathVariable Long id,
                                               @RequestBody TaskDTO dto) {
        return ResponseEntity.ok(tacheService.updateTask(id, dto));
    }

    /**
     * Déplace une tâche vers une autre colonne.
     *
     * @param id        l'identifiant de la tâche
     * @param colonneId l'identifiant de la colonne cible
     * @return le {@link TaskDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Déplacer une tâche vers une autre colonne")
    @PatchMapping("/{id}/deplacer")
    public ResponseEntity<TaskDTO> deplacerTache(@PathVariable Long id,
                                                 @RequestParam Long colonneId) {
        return ResponseEntity.ok(tacheService.moveTask(id, colonneId));
    }

    /**
     * Assigne une tâche à un utilisateur.
     *
     * @param id         l'identifiant de la tâche
     * @param assigneeId l'identifiant de l'utilisateur, ou {@code null} pour retirer
     * @return le {@link TaskDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Assigner une tâche à un utilisateur")
    @PatchMapping("/{id}/assigner")
    public ResponseEntity<TaskDTO> assignerTache(@PathVariable Long id,
                                                 @RequestParam(required = false) Long assigneeId) {
        return ResponseEntity.ok(tacheService.assignTask(id, assigneeId));
    }

    /**
     * Supprime une tâche par son identifiant.
     *
     * @param id l'identifiant de la tâche à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer une tâche")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTache(@PathVariable Long id) {
        tacheService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}