package com.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entité JPA représentant un token de réinitialisation de mot de passe.
 * Mappée sur la table {@code reset_token_rtk} en base MariaDB.
 *
 * <p>Un token est généré par Deno lors d'une demande "mot de passe oublié",
 * valable 15 minutes, et consommé (supprimé) dès qu'il est utilisé.
 * La relation {@code ManyToOne} vers {@link User} garantit la suppression
 * en cascade si l'utilisateur est supprimé.</p>
 */
@Entity
@Table(name = "reset_token_rtk")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResetToken {

    /**
     * Identifiant unique auto-généré du token.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rtk_id")
    private Long id;

    /**
     * Valeur du token UUID — unique en base.
     */
    @Column(name = "rtk_token", nullable = false, unique = true, length = 64)
    private String token;

    /**
     * Date et heure d'expiration du token.
     * Au-delà de cette date, le token est considéré invalide.
     */
    @Column(name = "rtk_expiry", nullable = false)
    private LocalDateTime expiry;

    /**
     * Utilisateur auquel ce token est associé.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usr_id", nullable = false)
    private User user;
}
