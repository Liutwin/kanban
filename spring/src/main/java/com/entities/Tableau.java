package com.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Entité JPA représentant un tableau Kanban.
 * Mappée sur la table {@code tableau_tab} en base MariaDB.
 */
@Entity
@jakarta.persistence.Table(name = "tableau_tab")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tableau {

    /**
     * Identifiant unique auto-généré du tableau.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tab_id")
    private Long id;

    /**
     * Nom du tableau affiché dans l'interface.
     */
    @Column(name = "tab_nom", nullable = false, length = 50)
    private String nom;

    /**
     * Utilisateur ayant créé le tableau.
     * Relation Many-to-One vers {@link Utilisateur}.
     */
    @ManyToOne
    @JoinColumn(name = "usr_createur", nullable = false)
    private Utilisateur createur;
}