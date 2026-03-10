package com.mappers;

import com.dtos.TableauDTO;
import com.entities.Tableau;
import com.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Tableau}
 * et son DTO {@link TableauDTO}.
 */
@Component
@RequiredArgsConstructor
public class TableauMapper {

    /**
     * Convertit une entité {@link Tableau} en {@link TableauDTO}.
     *
     * @param tableau l'entité à convertir
     * @return le DTO correspondant
     */
    public TableauDTO toDTO(Tableau tableau) {
        return new TableauDTO(
                tableau.getId(),
                tableau.getNom(),
                tableau.getCreateur().getId()
        );
    }

    /**
     * Convertit un {@link TableauDTO} en entité {@link Tableau}.
     * L'utilisateur créateur est reconstruit avec uniquement son ID —
     * JPA résoudra la relation en base.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public Tableau toEntity(TableauDTO dto) {
        Tableau tableau = new Tableau();
        tableau.setId(dto.getId());
        tableau.setNom(dto.getNom());
        User createur = new User();
        createur.setId(dto.getCreateurId());
        tableau.setCreateur(createur);
        return tableau;
    }
}