package com.dtos;

import com.entities.BoardColumn;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Objet de transfert de données pour l'entité {@link BoardColumn}.
 * Expose les informations d'une colonne sans les relations JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardColumnDTO {

    /**
     * Identifiant unique de la colonne.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    /**
     * Position de la colonne dans le tableau (lecture seule).
     */
    private Integer numero;

    /**
     * Nom affiché de la colonne.
     */
    private String name;

    /**
     * Identifiant du tableau auquel appartient la colonne.
     */
    private Long boardId;
}