package com.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Objet de transfert de données pour l'entité {@link com.entities.Tableau}.
 * Expose les informations d'un tableau sans les relations JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TableauDTO {

    /**
     * Identifiant unique du tableau.
     */
    private Long id;

    /**
     * Nom du tableau.
     */
    private String nom;

    /**
     * Identifiant de l'utilisateur créateur.
     */
    private Long createurId;
}