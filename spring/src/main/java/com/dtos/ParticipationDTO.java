package com.dtos;

import com.entities.Participation;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Objet de transfert de données pour l'entité {@link com.entities.Participation}.
 * Expose les informations de participation sans les relations JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParticipationDTO {

    /**
     * Identifiant de l'utilisateur participant.
     */
    private Long userId;

    /**
     * Identifiant du tableau concerné.
     */
    private Long tableauId;

    /**
     * Rôle de l'utilisateur dans le tableau.
     */
    private Participation.Role role;
}