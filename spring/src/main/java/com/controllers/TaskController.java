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
 * Préfixe de route : {@code /tasks}
 *
 * <p>L'en-tête {@code X-User-Id} injecté par le proxy Deno est transmis
 * au service à chaque opération afin de vérifier que l'utilisateur
 * authentifié est bien membre du tableau auquel appartient la tâche.</p>
 *
 * <p>Les réponses en liste retournent les tâches triées par
 * {@code tsk_position} croissant, reflétant l'ordre d'affichage
 * défini dans la colonne.</p>
 */
@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
@Tag(name = "Tâches", description = "Gestion des tâches d'un tableau Kanban")
public class TaskController {

    private final TaskService taskService;

    /**
     * Récupère toutes les tâches d'une colonne, triées par position croissante.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau
     * auquel appartient la colonne.</p>
     *
     * @param id          l'identifiant de la colonne
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par
     *                    Deno via l'en-tête {@code X-User-Id}
     * @return liste de {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tâches d'une colonne")
    @GetMapping("/column/{id}")
    public ResponseEntity<List<TaskDTO>> getByColumn(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(taskService.getTasksByBoardColumn(id, requesterId));
    }

    /**
     * Récupère toutes les tâches assignées à un utilisateur.
     *
     * <p>Aucun contrôle d'appartenance au tableau n'est appliqué :
     * un utilisateur peut toujours consulter ses propres tâches.</p>
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
     * Récupère les tâches d'une colonne filtrées par priorité,
     * triées par position croissante.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau
     * auquel appartient la colonne.</p>
     *
     * @param id          l'identifiant de la colonne
     * @param priority    le niveau de priorité recherché
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par
     *                    Deno via l'en-tête {@code X-User-Id}
     * @return liste de {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tâches par priorité")
    @GetMapping("/column/{id}/priority/{priority}")
    public ResponseEntity<List<TaskDTO>> getByPriority(
            @PathVariable Long id,
            @PathVariable Task.Priority priority,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(taskService.getTasksByColumnAndPriority(id, priority, requesterId));
    }

    /**
     * Récupère une tâche par son identifiant.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau
     * auquel appartient la tâche.</p>
     *
     * @param id          l'identifiant de la tâche
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par
     *                    Deno via l'en-tête {@code X-User-Id}
     * @return le {@link TaskDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer une tâche par ID")
    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getById(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(taskService.getTaskById(id, requesterId));
    }

    /**
     * Crée une nouvelle tâche.
     *
     * <p>La position de la tâche dans sa colonne est calculée automatiquement
     * par le trigger SQL {@code before_insert_tache} : la tâche est placée
     * en fin de colonne ({@code MAX(tsk_position) + 1}).</p>
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau
     * auquel appartient la colonne cible.</p>
     *
     * @param dto         les données de la nouvelle tâche
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par
     *                    Deno via l'en-tête {@code X-User-Id}
     * @return le {@link TaskDTO} créé avec son identifiant et sa position
     *         générés, avec statut HTTP 201
     */
    @Operation(summary = "Créer une tâche")
    @PostMapping
    public ResponseEntity<TaskDTO> createTask(
            @RequestBody TaskDTO dto,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.createTask(dto, requesterId));
    }

    /**
     * Met à jour les champs métier d'une tâche existante (titre, détails,
     * date limite, priorité). Ne modifie ni la colonne ni la position.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau
     * auquel appartient la tâche.</p>
     *
     * @param id          l'identifiant de la tâche
     * @param dto         les nouvelles données
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par
     *                    Deno via l'en-tête {@code X-User-Id}
     * @return le {@link TaskDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour une tâche")
    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> updateTask(
            @PathVariable Long id,
            @RequestBody TaskDTO dto,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(taskService.updateTask(id, dto, requesterId));
    }

    /**
     * Déplace une tâche vers une autre colonne du même tableau, ou la
     * réordonne au sein de sa colonne courante.
     *
     * <ul>
     *   <li>Si {@code newId} diffère de la colonne courante :
     *       déplacement inter-colonnes — la tâche est placée en fin de la
     *       colonne cible et {@code position} est ignoré.</li>
     *   <li>Si {@code newId} est la colonne courante :
     *       réordonnancement intra-colonne — les tâches voisines sont
     *       décalées pour que la tâche occupe {@code position}.</li>
     * </ul>
     *
     * <p>Retourne HTTP 400 si la colonne cible appartient à un tableau
     * différent. Retourne HTTP 403 si l'utilisateur n'est pas membre du
     * tableau.</p>
     *
     * @param id          l'identifiant de la tâche à déplacer
     * @param newId       l'identifiant de la colonne cible (peut être la
     *                    colonne courante)
     * @param position    la position cible dans la colonne (0-based) ;
     *                    ignorée si la colonne change
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par
     *                    Deno via l'en-tête {@code X-User-Id}
     * @return le {@link TaskDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Déplacer une tâche vers une autre colonne")
    @PatchMapping("/{id}/move")
    public ResponseEntity<TaskDTO> moveTask(
            @PathVariable Long id,
            @RequestParam Long newId,
            @RequestParam(defaultValue = "0") int position,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(taskService.moveTask(id, newId, position, requesterId));
    }

    /**
     * Assigne une tâche à un utilisateur.
     *
     * <p>Passer {@code userId=null} (ou omettre le paramètre) retire
     * l'assignation courante.</p>
     *
     * <p>Retourne HTTP 403 si l'utilisateur connecté n'est pas membre du
     * tableau auquel appartient la tâche.</p>
     *
     * @param id          l'identifiant de la tâche
     * @param userId      l'identifiant de l'utilisateur à assigner,
     *                    {@code null} pour retirer l'assignation
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par
     *                    Deno via l'en-tête {@code X-User-Id}
     * @return le {@link TaskDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Assigner une tâche à un utilisateur")
    @PatchMapping("/{id}/assign")
    public ResponseEntity<TaskDTO> assignTask(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId,
            @RequestHeader("X-User-Id") Long requesterId) {
        return ResponseEntity.ok(taskService.assignTask(id, userId, requesterId));
    }

    /**
     * Supprime une tâche et tous ses commentaires associés.
     *
     * <p>Retourne HTTP 403 si l'utilisateur n'est pas membre du tableau
     * auquel appartient la tâche.</p>
     *
     * @param id          l'identifiant de la tâche à supprimer
     * @param requesterId l'identifiant de l'utilisateur connecté, fourni par
     *                    Deno via l'en-tête {@code X-User-Id}
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer une tâche")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long requesterId) {
        taskService.deleteTask(id, requesterId);
        return ResponseEntity.noContent().build();
    }
}