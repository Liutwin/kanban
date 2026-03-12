package com.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entité JPA représentant un utilisateur de l'application Kanban.
 * Mappée sur la table {@code t_utilisateur_usr} en base MariaDB.
 */
@Entity
@Table(name = "utilisateur_usr")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    /**
     * Identifiant unique auto-généré de l'utilisateur.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "usr_id")
    private Long id;

    /**
     * Adresse email de l'utilisateur — doit être unique.
     * Sert également d'identifiant de connexion.
     */
    @Column(name = "usr_mail", nullable = false, unique = true, length = 50)
    private String email;

    /**
     * Pseudo affiché de l'utilisateur dans l'interface.
     */
    @Column(name = "usr_pseudo", nullable = false, length = 20)
    private String pseudo;

    /**
     * Mot de passe hashé avec crypt.
     * Ne doit jamais être exposé dans les réponses API.
     */
    @Column(name = "usr_mdp", nullable = false, length = 254)
    private String password;

    /**
     * Nom de famille de l'utilisateur (optionnel).
     */
    @Column(name = "usr_nom", length = 50, nullable = true)
    private String lastName;

    /**
     * Prénom de l'utilisateur (optionnel).
     */
    @Column(name = "usr_prenom", length = 50, nullable = true)
    private String firstName;

    /**
     * URL de l'avatar de l'utilisateur (optionnel).
     */
    @Column(name = "usr_avatar", length = 255, nullable = true)
    private String avatarURL;
}