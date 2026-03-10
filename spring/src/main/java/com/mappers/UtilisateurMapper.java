package com.mappers;

import com.dtos.UtilisateurDTO;
import com.entities.Utilisateur;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Utilisateur}
 * et son DTO {@link UtilisateurDTO}.
 * Garantit que le mot de passe n'est jamais exposé côté API.
 */
@Component
public class UtilisateurMapper {

    /**
     * Convertit une entité {@link Utilisateur} en {@link UtilisateurDTO}.
     *
     * @param utilisateur l'entité à convertir
     * @return le DTO correspondant, sans le mot de passe
     */
    public UtilisateurDTO toDTO(Utilisateur utilisateur) {
        return new UtilisateurDTO(
                utilisateur.getId(),
                utilisateur.getEmail(),
                utilisateur.getPseudo()
        );
    }

    /**
     * Convertit un {@link UtilisateurDTO} en entité {@link Utilisateur}.
     * Le mot de passe n'est pas géré ici — il doit être hashé
     * et assigné séparément dans le service.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public Utilisateur toEntity(UtilisateurDTO dto) {
        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setId(dto.getId());
        utilisateur.setEmail(dto.getEmail());
        utilisateur.setPseudo(dto.getPseudo());
        return utilisateur;
    }
}