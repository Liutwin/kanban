package com.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Objet de transfert de données pour l'entité {@link User}.
 * Utilisé pour exposer les informations utilisateur via l'API REST,
 * sans jamais exposer le mot de passe.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    /**
     * Identifiant unique de l'utilisateur.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    /**
     * Adresse email de l'utilisateur.
     */
    private String email;

    /**
     * Pseudo affiché de l'utilisateur.
     */
    private String pseudo;

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