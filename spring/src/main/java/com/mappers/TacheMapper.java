package com.mappers;

import com.dtos.TacheDTO;
import com.entities.Colonne;
import com.entities.Tache;
import com.entities.Utilisateur;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Tache}
 * et son DTO {@link TacheDTO}.
 */
@Component
public class TacheMapper {

    /**
     * Convertit une entité {@link Tache} en {@link TacheDTO}.
     *
     * @param tache l'entité à convertir
     * @return le DTO correspondant
     */
    public TacheDTO toDTO(Tache tache) {
        return new TacheDTO(
                tache.getId(),
                tache.getTitre(),
                tache.getDetails(),
                tache.getDateLimite(),
                tache.getPriorite(),
                tache.getColonne().getId(),
                tache.getCreateur().getId(),
                tache.getAssignee() != null ? tache.getAssignee().getId() : null
        );
    }

    /**
     * Convertit un {@link TacheDTO} en entité {@link Tache}.
     * Les relations sont reconstruites avec uniquement leur ID —
     * JPA résoudra les relations en base.
     * L'assignee est optionnel et peut être null.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public Tache toEntity(TacheDTO dto) {
        Tache tache = new Tache();
        tache.setId(dto.getId());
        tache.setTitre(dto.getTitre());
        tache.setDetails(dto.getDetails());
        tache.setDateLimite(dto.getDateLimite());
        tache.setPriorite(dto.getPriority() != null ? dto.getPriority() : Tache.Priority.MOYENNE);

        Colonne colonne = new Colonne();
        colonne.setId(dto.getColonneId());
        tache.setColonne(colonne);

        Utilisateur createur = new Utilisateur();
        createur.setId(dto.getCreateurId());
        tache.setCreateur(createur);

        if (dto.getAssigneeId() != null) {
            Utilisateur assignee = new Utilisateur();
            assignee.setId(dto.getAssigneeId());
            tache.setAssignee(assignee);
        }

        return tache;
    }
}