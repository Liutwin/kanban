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
public class Utilisateur {

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
     * Mot de passe hashé en SHA-256.
     * Ne doit jamais être exposé dans les réponses API.
     */
    @Column(name = "usr_mdp", nullable = false, length = 254)
    private String password;
}