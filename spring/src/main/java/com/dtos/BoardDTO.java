package com.dtos;

import com.entities.Board;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Objet de transfert de données pour l'entité {@link Board}.
 * Expose les informations d'un tableau sans les relations JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardDTO {

    /**
     * Identifiant unique du tableau.
     */
    private Long id;

    /**
     * Nom du tableau.
     */
    private String name;

    /**
     * Identifiant de l'utilisateur créateur.
     */
    private Long creatorId;
}