package com.mappers;

import com.dtos.ParticipationDTO;
import com.entities.Participation;
import com.entities.Tableau;
import com.entities.Utilisateur;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Participation}
 * et son DTO {@link ParticipationDTO}.
 */
@Component
public class ParticipationMapper {

    /**
     * Convertit une entité {@link Participation} en {@link ParticipationDTO}.
     *
     * @param participation l'entité à convertir
     * @return le DTO correspondant
     */
    public ParticipationDTO toDTO(Participation participation) {
        return new ParticipationDTO(
                participation.getId().getUserId(),
                participation.getId().getTableauId(),
                participation.getRole()
        );
    }

    /**
     * Convertit un {@link ParticipationDTO} en entité {@link Participation}.
     * Les entités {@link Utilisateur} et {@link Tableau} sont reconstruites
     * avec uniquement leur ID — JPA résoudra les relations en base.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public Participation toEntity(ParticipationDTO dto) {
        Participation.ParticipationId id = new Participation.ParticipationId(dto.getUserId(), dto.getTableauId());

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setId(dto.getUserId());

        Tableau tableau = new Tableau();
        tableau.setId(dto.getTableauId());

        return new Participation(id, utilisateur, tableau,
                dto.getRole() != null ? dto.getRole() : Participation.Role.LECTEUR);
    }
}