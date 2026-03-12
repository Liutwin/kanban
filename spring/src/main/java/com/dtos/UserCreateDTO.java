package com.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * DTO dédié à la création d'un utilisateur.
 * Contient le mot de passe en clair qui sera hashé dans le service.
 * Ne doit jamais être utilisé en réponse API.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserCreateDTO {

    /**
     * Adresse email de l'utilisateur — doit être unique.
     */
    private String email;

    /**
     * Pseudo affiché de l'utilisateur.
     */
    private String pseudo;

    /**
     * Mot de passe en clair — sera hashé avant persistance.
     */
    private String password;

    /**
     * Nom de famille (optionnel).
     */
    private String lastName;

    /**
     * Prénom (optionnel).
     */
    private String firstName;

    /**
     * URL de l'avatar de l'utilisateur (optionnel).
     */
    private String avatarURL;
}