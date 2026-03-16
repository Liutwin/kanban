package com.mappers;

import com.dtos.UserViewDTO;
import com.entities.UserView;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link UserView}
 * et son DTO {@link UserViewDTO}.
 *
 * <p>Les conversions sont effectuées manuellement (sans MapStruct) afin de
 * rester cohérent avec le reste du projet.</p>
 */
@Component
public class UserViewMapper {

    /**
     * Convertit une entité {@link UserView} en {@link UserViewDTO}.
     *
     * @param view l'entité à convertir, ne doit pas être {@code null}
     * @return le DTO correspondant avec tous les champs renseignés
     */
    public UserViewDTO toDTO(UserView view) {
        return new UserViewDTO(
                view.getId(),
                view.getFirstName(),
                view.getLastName(),
                view.getEmail(),
                view.getAvatarURL(),
                view.isAdmin(),
                view.getBoardsCreated(),
                view.getParticipations(),
                view.getTasksCreated(),
                view.getTasksAssigned(),
                view.getActions(),
                view.getLastActivity()
        );
    }
}
