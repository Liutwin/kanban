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
import com.services.FileService;
import com.services.TaskService;
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
 * <h3>Réordonnancement intra-colonne</h3>
 * <p>{@link #moveTask} gère deux cas distincts selon que la colonne cible
 * diffère ou non de la colonne courante :</p>
 * <ul>
 *   <li><b>Inter-colonnes</b> : la tâche est placée en fin de la colonne
 *       cible, sans renuméroter la colonne source.</li>
 *   <li><b>Intra-colonne</b> : suit la logique de la procédure SQL
 *       {@code deplacer_colonne} — les tâches situées entre l'ancienne et
 *       la nouvelle position sont décalées de ±1 via
 *       {@link TaskRepository#shiftPositions} avant le repositionnement.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository        taskRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository       boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final CommentRepository     commentRepository;
    private final UserRepository        userRepository;
    private final TaskMapper            taskMapper;
    private final FileService fileService;

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
        }
        return taskMapper.toDTO(taskRepository.save(task));
    }

    /**
     * {@inheritDoc}
     *
     * <h4>Algorithme de réordonnancement intra-colonne</h4>
     * <p>Identique à la procédure SQL {@code deplacer_colonne} :</p>
     * <ol>
     *   <li>Borne {@code targetPosition} à {@code [0 .. maxPosition]}.</li>
     *   <li>Si {@code targetPosition == oldPosition} : rien à faire.</li>
     *   <li>Si {@code targetPosition < oldPosition} (déplacement vers le haut) :
     *       décale de {@code +1} les tâches dans {@code [targetPosition .. oldPosition - 1]}.</li>
     *   <li>Si {@code targetPosition > oldPosition} (déplacement vers le bas) :
     *       décale de {@code -1} les tâches dans {@code [oldPosition + 1 .. targetPosition]}.</li>
     *   <li>Positionne la tâche à {@code targetPosition}.</li>
     * </ol>
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

        boolean sameColumn = task.getBoardColumn().getId().equals(targetColumnId);

        if (sameColumn) {
            // ---------------------------------------------------------------
            // Réordonnancement intra-colonne
            // ---------------------------------------------------------------
            int oldPosition = task.getPosition();
            // Le frontend calcule targetPosition comme index d'insertion dans la liste
            // SANS la tâche déplacée (count-1 éléments), donc les indices valides
            // sont [0 .. count-1] : 0 = en tête, count-1 = en queue.
            // L'ancienne borne count-2 était fausse : elle empêchait de placer
            // la tâche en dernière position (index count-1 = append).
            int maxPosition = (int) taskRepository.countByBoardColumnId(targetColumnId) - 1;
            if (maxPosition < 0) maxPosition = 0;
            if (targetPosition > maxPosition) targetPosition = maxPosition;
            if (targetPosition < 0)           targetPosition = 0;

            // Rien à faire si même position effective
            if (oldPosition == targetPosition) {
                return taskMapper.toDTO(task);
            }

            if (targetPosition < oldPosition) {
                // Déplacement vers le haut : les tâches [targetPos .. oldPos-1] décalent de +1
                taskRepository.shiftPositions(targetColumnId, +1, targetPosition, oldPosition - 1, id);
            } else {
                // Déplacement vers le bas : les tâches [oldPos+1 .. targetPos] décalent de -1
                taskRepository.shiftPositions(targetColumnId, -1, oldPosition + 1, targetPosition, id);
            }

            task.setPosition(targetPosition);

        } else {
            // ---------------------------------------------------------------
            // Déplacement inter-colonnes : place la tâche en fin de la colonne cible
            // ---------------------------------------------------------------
            int newPosition = (int) taskRepository.countByBoardColumnId(targetColumnId);
            task.setBoardColumn(targetColumn);
            task.setPosition(newPosition);
        }

        return taskMapper.toDTO(taskRepository.save(task));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteTask(Long id, Long requesterId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        checkWriteAccess(task.getBoardColumn().getBoard().getId(), requesterId);
        fileService.deleteByTache(id);
        commentRepository.deleteByTskId(id);
        taskRepository.deleteById(id);
    }
}