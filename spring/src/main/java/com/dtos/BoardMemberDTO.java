package com.dtos;

import com.entities.BoardMember;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Objet de transfert de données pour l'entité {@link BoardMember}.
 * Expose les informations de participation sans les relations JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardMemberDTO {

    /**
     * Identifiant de l'utilisateur participant.
     */
    private Long userId;

    /**
     * Identifiant du tableau concerné.
     */
    private Long boardId;

    /**
     * Rôle de l'utilisateur dans le tableau.
     */
    private BoardMember.Role role;
}