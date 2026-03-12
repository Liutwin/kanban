package com.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * DTO dédié au changement de mot de passe d'un utilisateur.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPasswordDTO {

    /**
     * Ancien mot de passe pour vérification.
     */
    private String oldPassword;

    /**
     * Nouveau mot de passe souhaité.
     */
    private String newPassword;
}