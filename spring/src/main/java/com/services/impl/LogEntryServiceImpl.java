package com.services.impl;

import com.dtos.LogEntryDTO;
import com.entities.Board;
import com.entities.LogEntry;
import com.entities.Task;
import com.entities.User;
import com.exceptions.ForbiddenException;
import com.mappers.LogEntryMapper;
import com.repositories.BoardMemberRepository;
import com.repositories.BoardRepository;
import com.repositories.LogEntryRepository;
import com.repositories.TaskRepository;
import com.repositories.UserRepository;
import com.services.LogEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Implémentation du service {@link LogEntryService}.
 *
 * <p>Le journal est en lecture seule : cette classe ne contient aucune
 * opération d'écriture. Les entrées sont créées exclusivement par les
 * triggers SQL {@code after_insert_tache} et {@code after_update_tache}.</p>
 *
 * <h3>Règle d'accès commune à {@code getLogsByBoard} et {@code getLogsByTask}</h3>
 * <p>L'accès est autorisé si le requérant est :</p>
 * <ul>
 *   <li>membre du tableau concerné (présence en {@code participation_ptp}), ou</li>
 *   <li>administrateur global ({@code usr_admin = true}).</li>
 * </ul>
 *
 * <h3>Règle d'accès pour {@code getLogsByUser}</h3>
 * <p>L'accès est autorisé si le requérant est :</p>
 * <ul>
 *   <li>l'utilisateur cible lui-même ({@code requesterId == userId}), ou</li>
 *   <li>administrateur global ({@code usr_admin = true}).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class LogEntryServiceImpl implements LogEntryService {

    private final LogEntryRepository logEntryRepository;
    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final LogEntryMapper logEntryMapper;

    // -------------------------------------------------------------------------
    // Helpers d'autorisation
    // -------------------------------------------------------------------------

    /**
     * Vérifie que le requérant est membre d'un tableau ou administrateur global.
     * Lève une {@link ForbiddenException} dans le cas contraire.
     *
     * @param board       le tableau à contrôler
     * @param requesterId l'identifiant du requérant
     * @throws ForbiddenException si l'accès est refusé
     */
    private void checkBoardAccessOrAdmin(Board board, Long requesterId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException(
                        "Utilisateur introuvable : " + requesterId));
        if (requester.isAdmin()) return;

        boolean isCreator = board.getCreator().getId().equals(requesterId);
        boolean isMember  = boardMemberRepository
                .existsByUserIdAndBoardId(requesterId, board.getId());

        if (!isCreator && !isMember) {
            throw new ForbiddenException(
                    "Accès interdit au journal du tableau : " + board.getId());
        }
    }

    /**
     * Vérifie que le requérant est l'utilisateur cible ou administrateur global.
     * Lève une {@link ForbiddenException} dans le cas contraire.
     *
     * @param targetUserId l'identifiant de l'utilisateur dont on consulte les logs
     * @param requesterId  l'identifiant du requérant
     * @throws ForbiddenException si l'accès est refusé
     */
    private void checkSelfOrAdmin(Long targetUserId, Long requesterId) {
        if (requesterId.equals(targetUserId)) return;

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException(
                        "Utilisateur introuvable : " + requesterId));
        if (!requester.isAdmin()) {
            throw new ForbiddenException(
                    "Accès interdit au journal de l'utilisateur : " + targetUserId);
        }
    }

    // -------------------------------------------------------------------------
    // Implémentation de LogEntryService
    // -------------------------------------------------------------------------

    /** {@inheritDoc} */
    @Override
    public List<LogEntryDTO> getLogsByBoard(
            Long boardId,
            LogEntry.LogType type,
            LocalDateTime from,
            LocalDateTime to,
            Long requesterId) {

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException(
                        "Tableau introuvable : " + boardId));

        checkBoardAccessOrAdmin(board, requesterId);

        return logEntryRepository
                .findByBoard(boardId, type, from, to)
                .stream()
                .map(logEntryMapper::toDTO)
                .toList();
    }

    /** {@inheritDoc} */
    @Override
    public List<LogEntryDTO> getLogsByTask(
            Long taskId,
            LogEntry.LogType type,
            LocalDateTime from,
            LocalDateTime to,
            Long requesterId) {

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException(
                        "Tâche introuvable : " + taskId));

        Board board = task.getBoardColumn().getBoard();
        checkBoardAccessOrAdmin(board, requesterId);

        return logEntryRepository
                .findByTask(taskId, type, from, to)
                .stream()
                .map(logEntryMapper::toDTO)
                .toList();
    }

    /** {@inheritDoc} */
    @Override
    public List<LogEntryDTO> getLogsByUser(
            Long userId,
            LogEntry.LogType type,
            LocalDateTime from,
            LocalDateTime to,
            Long requesterId) {

        // Vérifie que l'utilisateur cible existe
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException(
                        "Utilisateur introuvable : " + userId));

        checkSelfOrAdmin(userId, requesterId);

        return logEntryRepository
                .findByAuthor(userId, type, from, to)
                .stream()
                .map(logEntryMapper::toDTO)
                .toList();
    }
}
