package com.mappers;

import com.dtos.UserDTO;
import com.entities.User;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link User}
 * et son DTO {@link UserDTO}.
 * Garantit que le mot de passe n'est jamais exposé côté API.
 */
@Component
public class UtilisateurMapper {

    /**
     * Convertit une entité {@link User} en {@link UserDTO}.
     *
     * @param user l'entité à convertir
     * @return le DTO correspondant, sans le mot de passe
     */
    public UserDTO toDTO(User user) {
        return new UserDTO(
                user.getId(),
                user.getEmail(),
                user.getPseudo()
        );
    }

    /**
     * Convertit un {@link UserDTO} en entité {@link User}.
     * Le mot de passe n'est pas géré ici — il doit être hashé
     * et assigné séparément dans le service.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public User toEntity(UserDTO dto) {
        User user = new User();
        user.setId(dto.getId());
        user.setEmail(dto.getEmail());
        user.setPseudo(dto.getPseudo());
        return user;
    }
}