package com.controllers;

import com.dtos.TaskDTO;
import com.entities.Task;
import com.services.TaskService;
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
@RequestMapping("/tasks")
@RequiredArgsConstructor
@Tag(name = "Tâches", description = "Gestion des tâches d'un tableau Kanban")
public class TaskController {

    private final TaskService taskService;

    /**
     * Récupère toutes les tâches d'une colonne.
     *
     * @param id l'identifiant de la colonne
     * @return liste de {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tâches d'une colonne")
    @GetMapping("/column/{id}")
    public ResponseEntity<List<TaskDTO>> getByColumn(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTasksByBoardColumn(id));
    }

    /**
     * Récupère toutes les tâches assignées à un utilisateur.
     *
     * @param id l'identifiant de l'utilisateur
     * @return liste de {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tâches d'un utilisateur")
    @GetMapping("/assigned/{id}")
    public ResponseEntity<List<TaskDTO>> getByAssigned(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTasksByAssigned(id));
    }

    /**
     * Récupère les tâches d'une colonne filtrées par priorité.
     *
     * @param id l'identifiant de la colonne
     * @param priority  le niveau de priorité
     * @return liste de {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tâches par priorité")
    @GetMapping("/column/{id}/priority/{priority}")
    public ResponseEntity<List<TaskDTO>> getByPriority(@PathVariable Long id,
                                                       @PathVariable Task.Priority priority) {
        return ResponseEntity.ok(taskService.getTasksByColumnAndPriority(id, priority));
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
        return ResponseEntity.ok(taskService.getTaskById(id));
    }

    /**
     * Crée une nouvelle tâche.
     *
     * @param dto les données de la nouvelle tâche
     * @return le {@link TaskDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer une tâche")
    @PostMapping
    public ResponseEntity<TaskDTO> createTask(@RequestBody TaskDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.createTask(dto));
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
    public ResponseEntity<TaskDTO> updateTask(@PathVariable Long id,
                                              @RequestBody TaskDTO dto) {
        return ResponseEntity.ok(taskService.updateTask(id, dto));
    }

    /**
     * Déplace une tâche vers une autre colonne.
     *
     * @param id        l'identifiant de la tâche
     * @param newId l'identifiant de la colonne cible
     * @return le {@link TaskDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Déplacer une tâche vers une autre colonne")
    @PatchMapping("/{id}/move")
    public ResponseEntity<TaskDTO> moveTask(@PathVariable Long id,
                                            @RequestParam Long newId) {
        return ResponseEntity.ok(taskService.moveTask(id, newId));
    }

    /**
     * Assigne une tâche à un utilisateur.
     *
     * @param id         l'identifiant de la tâche
     * @param userId l'identifiant de l'utilisateur, ou {@code null} pour retirer
     * @return le {@link TaskDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Assigner une tâche à un utilisateur")
    @PatchMapping("/{id}/assign")
    public ResponseEntity<TaskDTO> assignTask(@PathVariable Long id,
                                              @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(taskService.assignTask(id, userId));
    }

    /**
     * Supprime une tâche par son identifiant.
     *
     * @param id l'identifiant de la tâche à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer une tâche")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}