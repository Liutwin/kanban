package com.controllers;

import com.dtos.ColonneDTO;
import com.services.ColonneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST exposant les endpoints de gestion des colonnes Kanban.
 * Préfixe de route : {@code /tableaux/{tableauId}/colonnes}
 */
@RestController
@RequestMapping("/tableaux/{tableauId}/colonnes")
@RequiredArgsConstructor
@Tag(name = "Colonnes", description = "Gestion des colonnes d'un tableau Kanban")
public class ColonneController {

    private final ColonneService colonneService;

    /**
     * Récupère toutes les colonnes d'un tableau, triées par numéro.
     *
     * @param tableauId l'identifiant du tableau
     * @return liste de {@link ColonneDTO} avec statut HTTP 200
     */
    @Operation(summary = "Lister les colonnes d'un tableau")
    @GetMapping
    public ResponseEntity<List<ColonneDTO>> getColonnes(@PathVariable Long tableauId) {
        return ResponseEntity.ok(colonneService.getColonnesByTableau(tableauId));
    }

    /**
     * Récupère une colonne par son identifiant.
     *
     * @param id l'identifiant de la colonne
     * @return le {@link ColonneDTO} avec statut HTTP 200
     */
    @Operation(summary = "Récupérer une colonne par ID")
    @GetMapping("/{id}")
    public ResponseEntity<ColonneDTO> getColonne(@PathVariable Long tableauId,
                                                 @PathVariable Long id) {
        return ResponseEntity.ok(colonneService.getColonneById(id));
    }

    /**
     * Crée une nouvelle colonne dans un tableau.
     *
     * @param tableauId l'identifiant du tableau
     * @param dto       les données de la nouvelle colonne
     * @return le {@link ColonneDTO} créé avec statut HTTP 201
     */
    @Operation(summary = "Créer une colonne")
    @PostMapping
    public ResponseEntity<ColonneDTO> createColonne(@PathVariable Long tableauId,
                                                    @RequestBody ColonneDTO dto) {
        dto.setTableauId(tableauId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(colonneService.createColonne(dto));
    }

    /**
     * Renomme une colonne existante.
     *
     * @param id  l'identifiant de la colonne
     * @param dto les nouvelles données
     * @return le {@link ColonneDTO} mis à jour avec statut HTTP 200
     */
    @Operation(summary = "Renommer une colonne")
    @PutMapping("/{id}")
    public ResponseEntity<ColonneDTO> updateColonne(@PathVariable Long tableauId,
                                                    @PathVariable Long id,
                                                    @RequestBody ColonneDTO dto) {
        return ResponseEntity.ok(colonneService.updateColonne(id, dto));
    }

    /**
     * Déplace une colonne vers une nouvelle position.
     *
     * @param id     l'identifiant de la colonne à déplacer
     * @param newNum la nouvelle position cible
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Déplacer une colonne")
    @PatchMapping("/{id}/deplacer")
    public ResponseEntity<Void> deplacerColonne(@PathVariable Long tableauId,
                                                @PathVariable Long id,
                                                @RequestParam int newNum) {
        colonneService.deplacerColonne(id, newNum);
        return ResponseEntity.noContent().build();
    }

    /**
     * Supprime une colonne par son identifiant.
     *
     * @param id l'identifiant de la colonne à supprimer
     * @return statut HTTP 204 sans contenu
     */
    @Operation(summary = "Supprimer une colonne")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteColonne(@PathVariable Long tableauId,
                                              @PathVariable Long id) {
        colonneService.deleteColonne(id);
        return ResponseEntity.noContent().build();
    }
}