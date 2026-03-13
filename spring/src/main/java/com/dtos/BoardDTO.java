package com.dtos;

import com.entities.Board;
import com.entities.BoardMember;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    /**
     * Nom du tableau.
     */
    private String name;

    /**
     * Identifiant de l'utilisateur créateur.
     */
    private Long creatorId;

    /**
     * Rôle de l'utilisateur.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private BoardMember.Role role;
}