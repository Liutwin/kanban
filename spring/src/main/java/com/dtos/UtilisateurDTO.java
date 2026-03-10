package com.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Objet de transfert de données pour l'entité {@link com.example.entity.User}.
 * Utilisé pour exposer les informations utilisateur via l'API REST,
 * sans jamais exposer le mot de passe.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UtilisateurDTO {

    /**
     * Identifiant unique de l'utilisateur.
     */
    private Long id;

    /**
     * Adresse email de l'utilisateur.
     */
    private String email;

    /**
     * Pseudo affiché de l'utilisateur.
     */
    private String pseudo;
}