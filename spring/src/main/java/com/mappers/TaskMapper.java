package com.mappers;

import com.dtos.TaskDTO;
import com.entities.BoardColumn;
import com.entities.Task;
import com.entities.User;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Task}
 * et son DTO {@link TaskDTO}.
 */
@Component
public class TaskMapper {

    /**
     * Convertit une entité {@link Task} en {@link TaskDTO}.
     *
     * @param task l'entité à convertir
     * @return le DTO correspondant
     */
    public TaskDTO toDTO(Task task) {
        return new TaskDTO(
                task.getId(),
                task.getTitle(),
                task.getDetails(),
                task.getDueDate(),
                task.getPriority(),
                task.getBoardColumn().getId(),
                task.getCreator().getId(),
                task.getAssigned() != null ? task.getAssigned().getId() : null
        );
    }

    /**
     * Convertit un {@link TaskDTO} en entité {@link Task}.
     * Les relations sont reconstruites avec uniquement leur ID —
     * JPA résoudra les relations en base.
     * L'assignee est optionnel et peut être null.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public Task toEntity(TaskDTO dto) {
        Task task = new Task();
        task.setTitle(dto.getTitle());
        task.setDetails(dto.getDetails());
        task.setDueDate(dto.getDueDate());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : Task.Priority.MEDIUM);

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