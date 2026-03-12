package com.entities;

import com.repositories.BoardColumnRepository;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Entité JPA représentant une colonne d'un tableau Kanban.
 * Mappée sur la table {@code colonne_col} en base MariaDB.
 *
 * <p>Le champ {@code numero} est géré exclusivement par la base de données
 * via le trigger {@code before_insert_colonne}. Il ne doit jamais être
 * écrit ou modifié depuis Spring.</p>
 *
 * <p>La permutation de colonnes doit passer par la procédure stockée
 * {@code deplacer_colonne} via {@link BoardColumnRepository}.</p>
 */
@Entity
@jakarta.persistence.Table(
        name = "colonne_col",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_col_numero_tab",
                columnNames = {"tab_id", "col_numero"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardColumn {

    /**
     * Identifiant unique auto-généré de la colonne.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @jakarta.persistence.Column(name = "col_id")
    private Long id;

    /**
     * Position de la colonne dans le tableau.
     * Géré exclusivement par le trigger {@code before_insert_colonne}
     * et la procédure {@code deplacer_colonne} — jamais écrit par JPA.
     */
    @jakarta.persistence.Column(name = "col_numero", insertable = false, updatable = false)
    private Integer numero;

    /**
     * Nom affiché de la colonne.
     */
    @jakarta.persistence.Column(name = "col_nom", nullable = false, length = 50)
    private String name;

    /**
     * Tableau auquel appartient cette colonne.
     */
    @ManyToOne
    @JoinColumn(name = "tab_id", nullable = false)
    private Board board;
}