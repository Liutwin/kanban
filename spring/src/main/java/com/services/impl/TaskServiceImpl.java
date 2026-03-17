package com.services.impl;

import com.dtos.TaskDTO;
import com.entities.Board;
import com.entities.BoardColumn;
import com.entities.BoardMember;
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
import com.services.MailService;
import com.services.TaskService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link TaskService}.
 * Orchestre les appels aux repositories et les conversions via le mapper.
 *
 * <h3>Contrôle d'accès</h3>
 * <p>Pour chaque opération, l'appartenance au tableau est vérifiée en
 * remontant la chaîne {@code tâche → colonne → tableau}.
 * Deux niveaux de contrôle sont appliqués :</p>
 * <ul>
 *   <li><b>Lecture</b> ({@link #checkReadAccess}) : tout membre, quel que
 *       soit son rôle, peut consulter les tâches.</li>
 *   <li><b>Écriture</b> ({@link #checkWriteAccess}) : seuls le créateur du
 *       tableau et les membres avec le rôle {@code EDITEUR} ou {@code ADMIN}
 *       peuvent créer, modifier, déplacer, assigner ou supprimer des tâches.
 *       Un {@code LECTEUR} se verra refuser ces opérations (HTTP 403).</li>
 * </ul>
 *
 * <h3>Réordonnancement et déplacement</h3>
 * <p>{@link #moveTask} délègue entièrement à la procédure stockée SQL
 * {@code deplacer_tache}, qui gère les deux cas (intra et inter-colonnes),
 * le clamp de la position cible, et l'insertion du log dans
 * {@code journal_log}. Le cache JPA de la session est ensuite invalidé via
 * {@link jakarta.persistence.EntityManager#refresh} pour retourner l'état
 * réel persisté.</p>
 */
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository       taskRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository      boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final CommentRepository    commentRepository;
    private final UserRepository       userRepository;
    private final TaskMapper           taskMapper;
    private final EntityManager        entityManager;
    private final MailService          mailService;

    // =========================================================================
    // Méthodes utilitaires privées
    // =========================================================================

    /**
     * Vérifie que l'utilisateur est membre ou créateur du tableau (accès en lecture).
     *
     * @param boardId     l'identifiant du tableau à contrôler
     * @param requesterId l'identifiant de l'utilisateur à vérifier
     * @throws RuntimeException   si le tableau n'est pas trouvé
     * @throws ForbiddenException si l'utilisateur n'est ni créateur ni membre
     */
    private void checkReadAccess(Long boardId, Long requesterId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        boolean isCreator = board.getCreator().getId().equals(requesterId);
        boolean isMember  = boardMemberRepository.existsByUserIdAndBoardId(requesterId, boardId);
        if (!isCreator && !isMember) {
            throw new ForbiddenException("Accès interdit au tableau : " + boardId);
        }
    }

    /**
     * Vérifie que l'utilisateur peut modifier le tableau (accès en écriture).
     * Sont autorisés : le créateur du tableau et les membres avec le rôle
     * {@code EDITEUR} ou {@code ADMIN}. Un membre {@code LECTEUR} sera refusé.
     *
     * @param boardId     l'identifiant du tableau à contrôler
     * @param requesterId l'identifiant de l'utilisateur à vérifier
     * @throws RuntimeException   si le tableau n'est pas trouvé
     * @throws ForbiddenException si l'utilisateur est lecteur ou n'est pas membre
     */
    private void checkWriteAccess(Long boardId, Long requesterId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        if (board.getCreator().getId().equals(requesterId)) {
            return; // le créateur a tous les droits
        }
        BoardMember.ParticipationId pid = new BoardMember.ParticipationId(requesterId, boardId);
        BoardMember member = boardMemberRepository.findById(pid)
                .orElseThrow(() -> new ForbiddenException("Accès interdit au tableau : " + boardId));
        if (member.getRole() == BoardMember.Role.LECTEUR) {
            throw new ForbiddenException("Les lecteurs ne peuvent pas modifier ce tableau.");
        }
    }

    // =========================================================================
    // Implémentation de TaskService
    // =========================================================================

    /** {@inheritDoc} */
    @Override
    public List<TaskDTO> getTasksByBoardColumn(Long colonneId, Long requesterId) {
        BoardColumn col = boardColumnRepository.findById(colonneId)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + colonneId));
        checkReadAccess(col.getBoard().getId(), requesterId);
        return taskRepository.findByBoardColumnIdOrderByPosition(colonneId)
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
    public List<TaskDTO> getTasksByColumnAndPriority(Long colonneId, Task.Priority priorite,
                                                     Long requesterId) {
        BoardColumn col = boardColumnRepository.findById(colonneId)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + colonneId));
        checkReadAccess(col.getBoard().getId(), requesterId);
        return taskRepository.findByBoardColumnIdAndPriorityOrderByPosition(colonneId, priorite)
                .stream()
                .map(taskMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO getTaskById(Long id, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkReadAccess(task.getBoardColumn().getBoard().getId(), requesterId);
        return taskMapper.toDTO(task);
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO createTask(TaskDTO dto, Long requesterId) {
        BoardColumn col = boardColumnRepository.findById(dto.getBoardColumnId())
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + dto.getBoardColumnId()));
        checkWriteAccess(col.getBoard().getId(), requesterId);
        if (!userRepository.existsById(dto.getCreatorId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getCreatorId());
        }
        // tsk_position calculé automatiquement par le trigger before_insert_tache
        return taskMapper.toDTO(taskRepository.save(taskMapper.toEntity(dto)));
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO updateTask(Long id, TaskDTO dto, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkWriteAccess(task.getBoardColumn().getBoard().getId(), requesterId);
        task.setTitle(dto.getTitle());
        task.setDetails(dto.getDetails());
        task.setDueDate(dto.getDueDate());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : task.getPriority());
        task.setValidated(dto.isValidated());
        return taskMapper.toDTO(taskRepository.save(task));
    }

    /** {@inheritDoc} */
    @Override
    public TaskDTO assignTask(Long id, Long assigneeId, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkWriteAccess(task.getBoardColumn().getBoard().getId(), requesterId);
        if (assigneeId == null) {
            task.setAssigned(null);
        } else {
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + assigneeId));
            task.setAssigned(assignee);

            // Notification mail uniquement si l'assigné n'est pas la personne qui assigne
            if (!assigneeId.equals(requesterId)) {
                User assigner = userRepository.findById(requesterId)
                        .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + requesterId));
                String boardName = task.getBoardColumn().getBoard().getName();
                mailService.sendTaskAssigned(
                        assignee.getEmail(),
                        assignee.getFirstName(),
                        task.getTitle(),
                        boardName,
                        assigner.getFirstName() + " " + assigner.getLastName()
                );
            }
        }
        return taskMapper.toDTO(taskRepository.save(task));
    }

    /**
     * {@inheritDoc}
     *
     * <p>Délègue intégralement à la procédure stockée {@code deplacer_tache},
     * qui gère le clamp de la position cible, le réordonnancement des tâches
     * voisines (intra et inter-colonnes) et l'insertion du log dans
     * {@code journal_log}. Le cache de la session JPA est ensuite invalidé
     * via {@link EntityManager#refresh} pour retourner l'état réel persisté.</p>
     */
    @Override
    @Transactional
    public TaskDTO moveTask(Long id, Long targetColumnId, int targetPosition, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        Long boardId = task.getBoardColumn().getBoard().getId();
        checkWriteAccess(boardId, requesterId);

        BoardColumn targetColumn = boardColumnRepository.findById(targetColumnId)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + targetColumnId));
        if (!targetColumn.getBoard().getId().equals(boardId)) {
            throw new IllegalArgumentException(
                    "La colonne cible n'appartient pas au même tableau.");
        }

        taskRepository.deplacerTache(id, targetColumnId, targetPosition, requesterId);

        // Invalide le cache JPA pour lire l'état réel après les UPDATE de la procédure
        entityManager.refresh(task);
        return taskMapper.toDTO(task);
    }

    /** {@inheritDoc} */
    @Override
    public List<TaskDTO> searchTasks(
            Long boardId,
            String keyword,
            Long assignedId,
            String priority,
            Long requesterId
    ) {
        checkReadAccess(boardId, requesterId);
        // Normalise le mot-clé : chaîne vide → null (ignoré dans la requête SQL)
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        // Normalise la priorité : chaîne vide → null
        String prio = (priority != null && !priority.isBlank()) ? priority.trim() : null;
        return taskRepository.searchTasks(boardId, kw, assignedId, prio)
                .stream()
                .map(taskMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public void deleteTask(Long id, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkWriteAccess(task.getBoardColumn().getBoard().getId(), requesterId);
        commentRepository.deleteByTskId(id);
        taskRepository.deleteById(id);
    }
}