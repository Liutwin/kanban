package com.mappers;

import com.dtos.UserCreateDTO;
import com.dtos.UserDTO;
import com.entities.User;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link User}
 * et son DTO {@link UserDTO}.
 * Garantit que le mot de passe n'est jamais exposé côté API.
 */
@Component
public class UserMapper {

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
                user.getPseudo(),
                user.getLastName(),
                user.getFirstName(),
                user.getAvatarURL(),
                user.isAdmin()
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
        user.setLastName(dto.getLastName());
        user.setFirstName(dto.getFirstName());
        user.setAvatarURL(dto.getAvatarURL());
        user.setAdmin(dto.isAdmin());
        return user;
    }

    /**
     * Convertit un {@link UserCreateDTO} en entité {@link User}.
     * Le mot de passe sera hashé séparément dans le service.
     *
     * @param dto le DTO de création à convertir
     * @return l'entité correspondante
     */
    public User toEntityFromCreate(UserCreateDTO dto) {
        User user = new User();
        user.setEmail(dto.getEmail());
        user.setPseudo(dto.getPseudo());
        user.setPassword(dto.getPassword());
        user.setLastName(dto.getLastName());
        user.setFirstName(dto.getFirstName());
        user.setAvatarURL(dto.getAvatarURL());
        return user;
    }
}