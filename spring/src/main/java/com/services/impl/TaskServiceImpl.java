package com.services.impl;

import com.dtos.TaskDTO;
import com.entities.BoardColumn;
import com.entities.Task;
import com.entities.User;
import com.exceptions.ForbiddenException;
import com.mappers.TaskMapper;
import com.repositories.BoardColumnRepository;
import com.repositories.BoardMemberRepository;
import com.repositories.BoardRepository;
import com.repositories.CommentRepository;
import com.repositories.TaskRepository;
import com.repositories.UserRepository;
import com.services.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link TaskService}.
 * Orchestre les appels aux repositories et les conversions via le mapper.
 *
 * <p>Pour chaque opération, l'appartenance au tableau est vérifiée en
 * remontant la chaîne {@code tâche → colonne → tableau}. La vérification
 * repose sur {@link BoardMemberRepository#existsByUserIdAndBoardId} et
 * sur le créateur stocké dans l'entité {@link com.entities.Board}.</p>
 */
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final TaskMapper taskMapper;

    // -------------------------------------------------------------------------
    // Méthode utilitaire privée
    // -------------------------------------------------------------------------

    /**
     * Vérifie que l'utilisateur est membre ou créateur du tableau identifié
     * par {@code boardId}. Lève une {@link ForbiddenException} sinon.
     *
     * @param boardId     l'identifiant du tableau à contrôler
     * @param requesterId l'identifiant de l'utilisateur à vérifier
     * @throws RuntimeException   si le tableau n'est pas trouvé
     * @throws ForbiddenException si l'utilisateur n'a aucun accès au tableau
     */
    private void checkBoardMembership(Long boardId, Long requesterId) {
        var board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        boolean isCreator = board.getCreator().getId().equals(requesterId);
        boolean isMember  = boardMemberRepository.existsByUserIdAndBoardId(requesterId, boardId);
        if (!isCreator && !isMember) {
            throw new ForbiddenException("Accès interdit au tableau : " + boardId);
        }
    }

    // -------------------------------------------------------------------------
    // Implémentation de TaskService
    // -------------------------------------------------------------------------

    /** {@inheritDoc} */
    @Override
    public List<TaskDTO> getTasksByBoardColumn(Long columnId, Long requesterId) {
        BoardColumn col = boardColumnRepository.findById(columnId)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + columnId));
        checkBoardMembership(col.getBoard().getId(), requesterId);
        return taskRepository.findByBoardColumnId(columnId)
                .stream()
                .map(taskMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<TaskDTO> getTasksByAssigned(Long assignedId) {
        // Pas de vérification de tableau : l'utilisateur consulte ses propres tâches
        return taskRepository.findByAssignedId(assignedId)
                .stream()
                .map(taskMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<TaskDTO> getTasksByColumnAndPriority(Long columnId, Task.Priority priority,
                                                     Long requesterId) {
        BoardColumn col = boardColumnRepository.findById(columnId)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + columnId));
        checkBoardMembership(col.getBoard().getId(), requesterId);
        return taskRepository.findByBoardColumnIdAndPriority(columnId, priority)
                .stream()
                .map(taskMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO getTaskById(Long id, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkBoardMembership(task.getBoardColumn().getBoard().getId(), requesterId);
        return taskMapper.toDTO(task);
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO createTask(TaskDTO dto, Long requesterId) {
        BoardColumn col = boardColumnRepository.findById(dto.getBoardColumnId())
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + dto.getBoardColumnId()));
        checkBoardMembership(col.getBoard().getId(), requesterId);
        if (!userRepository.existsById(dto.getCreatorId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getCreatorId());
        }
        return taskMapper.toDTO(taskRepository.save(taskMapper.toEntity(dto)));
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO updateTask(Long id, TaskDTO dto, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkBoardMembership(task.getBoardColumn().getBoard().getId(), requesterId);
        task.setTitle(dto.getTitle());
        task.setDetails(dto.getDetails());
        task.setDueDate(dto.getDueDate());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : task.getPriority());
        return taskMapper.toDTO(taskRepository.save(task));
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO assignTask(Long id, Long assignedId, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkBoardMembership(task.getBoardColumn().getBoard().getId(), requesterId);
        if (assignedId == null) {
            task.setAssigned(null);
        } else {
            User assignee = userRepository.findById(assignedId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + assignedId));
            task.setAssigned(assignee);
        }
        return taskMapper.toDTO(taskRepository.save(task));
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO moveTask(Long id, Long columnId, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        Long boardId = task.getBoardColumn().getBoard().getId();
        checkBoardMembership(boardId, requesterId);
        BoardColumn target = boardColumnRepository.findById(columnId)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + columnId));
        // La colonne cible doit appartenir au même tableau
        if (!target.getBoard().getId().equals(boardId)) {
            throw new IllegalArgumentException(
                    "La colonne cible n'appartient pas au même tableau");
        }
        task.setBoardColumn(target);
        return taskMapper.toDTO(taskRepository.save(task));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteTask(Long id, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkBoardMembership(task.getBoardColumn().getBoard().getId(), requesterId);
        commentRepository.deleteByTskId(id);
        taskRepository.deleteById(id);
    }
}