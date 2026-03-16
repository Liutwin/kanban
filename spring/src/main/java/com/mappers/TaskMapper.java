package com.mappers;

import com.dtos.TaskDTO;
import com.entities.BoardColumn;
import com.entities.Task;
import com.entities.User;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Task}
 * et son DTO {@link TaskDTO}.
 *
 * <p>Les conversions sont effectuées manuellement (sans MapStruct) afin de
 * contrôler précisément la reconstruction des relations JPA : seuls les
 * identifiants des entités associées ({@link BoardColumn}, {@link User})
 * sont utilisés — JPA résoudra les proxies en base à la première utilisation.</p>
 */
@Component
public class TaskMapper {

    /**
     * Convertit une entité {@link Task} en {@link TaskDTO}.
     *
     * <p>L'identifiant de l'assigné est extrait uniquement si la relation
     * {@code assigned} n'est pas nulle.</p>
     *
     * @param task l'entité à convertir, ne doit pas être {@code null}
     * @return le DTO correspondant avec tous les champs renseignés
     */
    public TaskDTO toDTO(Task task) {
        return new TaskDTO(
                task.getId(),
                task.getTitle(),
                task.getDetails(),
                task.getDueDate(),
                task.getPriority(),
                task.isValidated(),
                task.getPosition(),
                task.getBoardColumn().getId(),
                task.getCreator().getId(),
                task.getAssigned() != null ? task.getAssigned().getId() : null
        );
    }

    /**
     * Convertit un {@link TaskDTO} en entité {@link Task}.
     *
     * <p>Les relations {@link BoardColumn} et {@link User} (créateur, assigné)
     * sont reconstruites avec uniquement leur identifiant. JPA résoudra
     * les entités complètes depuis le contexte de persistance lors de la
     * prochaine opération en base.</p>
     *
     * <p>La priorité est positionnée à {@link Task.Priority#MEDIUM} si le DTO
     * ne fournit pas de valeur. L'assigné est optionnel : si
     * {@link TaskDTO#getAssignedId()} est {@code null}, le champ {@code assigned}
     * de l'entité reste {@code null}.</p>
     *
     * <p><strong>Note :</strong> le champ {@link Task#getPosition()} est
     * volontairement non renseigné ici. À la création, il est calculé
     * automatiquement par le trigger SQL {@code before_insert_tache}.
     * Lors d'un réordonnancement, il est mis à jour directement dans
     * {@link com.services.impl.TaskServiceImpl#moveTask}.</p>
     *
     * @param dto le DTO à convertir, ne doit pas être {@code null}
     * @return l'entité correspondante prête à être persistée
     */
    public Task toEntity(TaskDTO dto) {
        Task task = new Task();
        task.setTitle(dto.getTitle());
        task.setDetails(dto.getDetails());
        task.setDueDate(dto.getDueDate());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : Task.Priority.MEDIUM);
        task.setValidated(dto.isValidated());

        BoardColumn boardColumn = new BoardColumn();
        boardColumn.setId(dto.getBoardColumnId());
        task.setBoardColumn(boardColumn);

        User creator = new User();
        creator.setId(dto.getCreatorId());
        task.setCreator(creator);

        if (dto.getAssignedId() != null) {
            User assigned = new User();
            assigned.setId(dto.getAssignedId());
            task.setAssigned(assigned);
        }

        return task;
    }
}