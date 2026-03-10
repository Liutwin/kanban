package com.dtos;

import com.entities.Colonne;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Objet de transfert de données pour l'entité {@link Colonne}.
 * Expose les informations d'une colonne sans les relations JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColonneDTO {

    /**
     * Identifiant unique de la colonne.
     */
    private Long id;

    /**
     * Position de la colonne dans le tableau (lecture seule).
     */
    private Integer numero;

    /**
     * Nom affiché de la colonne.
     */
    private String nom;

    /**
     * Identifiant du tableau auquel appartient la colonne.
     */
    private Long tableauId;
}