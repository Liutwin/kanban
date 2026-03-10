package com.controllers;

import com.dtos.TableauDTO;
import com.services.TableauService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des tableaux Kanban.
 * Préfixe de route : {@code /tableaux}
 */
@RestController
@RequestMapping("/tableaux")
@RequiredArgsConstructor
@Tag(name = "Tableaux", description = "Gestion des tableaux Kanban")
public class TableauController {

    private final TableauService tableauService;

    /**
     * Récupère tous les tableaux.
     *
     * @return liste de {@link TableauDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister tous les tableaux")
    @GetMapping
    public ResponseEntity<List<TableauDTO>> getAllTableaux() {
        return ResponseEntity.ok(tableauService.getAllTableaux());
    }

    /**
     * Récupère un tableau par son identifiant.
     *
     * @param id l'identifiant du tableau
     * @return le {@link TableauDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer un tableau par ID")
    @GetMapping("/{id}")
    public ResponseEntity<TableauDTO> getTableauById(@PathVariable Long id) {
        return ResponseEntity.ok(tableauService.getTableauById(id));
    }

    /**
     * Récupère tous les tableaux d'un utilisateur donné.
     *
     * @param createurId l'identifiant de l'utilisateur créateur
     * @return liste de {@link TableauDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les tableaux d'un utilisateur")
    @GetMapping("/user/{createurId}")
    public ResponseEntity<List<TableauDTO>> getTableauxByCreateur(@PathVariable Long createurId) {
        return ResponseEntity.ok(tableauService.getTableauxByCreateur(createurId));
    }

    /**
     * Crée un nouveau tableau.
     *
     * @param dto les données du nouveau tableau
     * @return le {@link TableauDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer un tableau")
    @PostMapping
    public ResponseEntity<TableauDTO> createTableau(@RequestBody TableauDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tableauService.createTableau(dto));
    }

    /**
     * Met à jour un tableau existant.
     *
     * @param id  l'identifiant du tableau à modifier
     * @param dto les nouvelles données
     * @return le {@link TableauDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Mettre à jour un tableau")
    @PutMapping("/{id}")
    public ResponseEntity<TableauDTO> updateTableau(@PathVariable Long id, @RequestBody TableauDTO dto) {
        return ResponseEntity.ok(tableauService.updateTableau(id, dto));
    }

    /**
     * Supprime un tableau par son identifiant.
     *
     * @param id l'identifiant du tableau à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer un tableau")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTableau(@PathVariable Long id) {
        tableauService.deleteTableau(id);
        return ResponseEntity.noContent().build();
    }
}