package com.services.impl;

import com.dtos.TaskDTO;
import com.entities.BoardColumn;
import com.entities.Task;
import com.entities.User;
import com.mappers.TaskMapper;
import com.repositories.BoardColumnRepository;
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
 */
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final UserRepository userRepository;
    private final TaskMapper taskMapper;

    /** {@inheritDoc} */
    @Override
    public List<TaskDTO> getTasksByBoardColumn(Long columnId) {
        return taskRepository.findByAssignedId(columnId)
                .stream()
                .map(taskMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<TaskDTO> getTasksByAssigned(Long assignedId) {
        return taskRepository.findByAssignedId(assignedId)
                .stream()
                .map(taskMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<TaskDTO> getTasksByColumnAndPriority(Long columnId, Task.Priority priority) {
        return taskRepository.findByBoardColumnIdAndPriority(columnId, priority)
                .stream()
                .map(taskMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO getTaskById(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        return taskMapper.toDTO(task);
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO createTask(TaskDTO dto) {
        if (!boardColumnRepository.existsById(dto.getBoardColumnId())) {
            throw new RuntimeException("Colonne introuvable : " + dto.getBoardColumnId());
        }
        if (!userRepository.existsById(dto.getCreatorId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getCreatorId());
        }
        return taskMapper.toDTO(taskRepository.save(taskMapper.toEntity(dto)));
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO updateTask(Long id, TaskDTO dto) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        task.setTitle(dto.getTitre());
        task.setDetails(dto.getDetails());
        task.setDateLimite(dto.getDateLimite());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : task.getPriority());
        return taskMapper.toDTO(taskRepository.save(task));
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO assignTask(Long id, Long assignedId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
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
    public TaskDTO moveTask(Long id, Long columnId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        BoardColumn boardColumn = boardColumnRepository.findById(columnId)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + columnId));
        task.setBoardColumn(boardColumn);
        return taskMapper.toDTO(taskRepository.save(task));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new RuntimeException("Tâche introuvable : " + id);
        }
        taskRepository.deleteById(id);
    }
}