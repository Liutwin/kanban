package com.mappers;

import com.dtos.ColonneDTO;
import com.entities.Colonne;
import com.entities.Tableau;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Colonne}
 * et son DTO {@link ColonneDTO}.
 */
@Component
public class ColonneMapper {

    /**
     * Convertit une entité {@link Colonne} en {@link ColonneDTO}.
     *
     * @param colonne l'entité à convertir
     * @return le DTO correspondant
     */
    public ColonneDTO toDTO(Colonne colonne) {
        return new ColonneDTO(
                colonne.getId(),
                colonne.getNumero(),
                colonne.getNom(),
                colonne.getTableau().getId()
        );
    }

    /**
     * Convertit un {@link ColonneDTO} en entité {@link Colonne}.
     * Le {@code numero} n'est pas transmis — il est géré par le trigger SQL.
     * Le {@link Tableau} est reconstruit avec uniquement son ID.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public Colonne toEntity(ColonneDTO dto) {
        Colonne colonne = new Colonne();
        colonne.setId(dto.getId());
        colonne.setNom(dto.getNom());
        // numero intentionnellement omis : géré par le trigger before_insert_colonne
        Tableau tableau = new Tableau();
        tableau.setId(dto.getTableauId());
        colonne.setTableau(tableau);
        return colonne;
    }
}