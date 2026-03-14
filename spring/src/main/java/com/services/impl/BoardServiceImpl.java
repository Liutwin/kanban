package com.services.impl;

import com.dtos.BoardDTO;
import com.dtos.BoardMemberDTO;
import com.entities.Board;
import com.entities.BoardMember;
import com.exceptions.ForbiddenException;
import com.mappers.BoardMapper;
import com.mappers.BoardMemberMapper;
import com.repositories.BoardMemberRepository;
import com.repositories.BoardRepository;
import com.repositories.UserRepository;
import com.services.BoardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link BoardService}.
 * Orchestre les appels aux repositories et les conversions via le mapper.
 *
 * <p>Chaque méthode qui opère sur un tableau spécifique reçoit un
 * {@code requesterId} (transmis par Deno via l'en-tête {@code X-User-Id})
 * et vérifie que l'utilisateur est bien membre ou créateur du tableau
 * avant d'exécuter l'opération. En cas de violation, une
 * {@link ForbiddenException} est levée (HTTP 403).</p>
 */
@Service
@RequiredArgsConstructor
public class BoardServiceImpl implements BoardService {

    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final BoardMapper boardMapper;
    private final BoardMemberRepository boardMemberRepository;
    private final BoardMemberMapper boardMemberMapper;

    // -------------------------------------------------------------------------
    // Méthodes utilitaires privées
    // -------------------------------------------------------------------------

    /**
     * Vérifie qu'un utilisateur est membre ou créateur d'un tableau.
     * Lève une {@link ForbiddenException} dans le cas contraire.
     *
     * @param board       le tableau à contrôler
     * @param requesterId l'identifiant de l'utilisateur à vérifier
     * @throws ForbiddenException si l'utilisateur n'a aucun accès au tableau
     */
    private void checkMembership(Board board, Long requesterId) {
        boolean isCreator = board.getCreator().getId().equals(requesterId);
        boolean isMember  = boardMemberRepository.existsByUserIdAndBoardId(requesterId, board.getId());
        if (!isCreator && !isMember) {
            throw new ForbiddenException("Accès interdit au tableau : " + board.getId());
        }
    }

    /**
     * Vérifie qu'un utilisateur est administrateur (rôle {@code ADMIN})
     * ou créateur d'un tableau.
     * Lève une {@link ForbiddenException} dans le cas contraire.
     *
     * @param board       le tableau à contrôler
     * @param requesterId l'identifiant de l'utilisateur à vérifier
     * @throws ForbiddenException si l'utilisateur n'est pas admin du tableau
     */
    private void checkAdminAccess(Board board, Long requesterId) {
        if (board.getCreator().getId().equals(requesterId)) {
            return; // le créateur a tous les droits
        }
        BoardMember.ParticipationId pid =
                new BoardMember.ParticipationId(requesterId, board.getId());
        BoardMember member = boardMemberRepository.findById(pid)
                .orElseThrow(() -> new ForbiddenException(
                        "Accès interdit au tableau : " + board.getId()));
        if (member.getRole() != BoardMember.Role.ADMIN) {
            throw new ForbiddenException("Droits insuffisants sur le tableau : " + board.getId());
        }
    }

    // -------------------------------------------------------------------------
    // Implémentation de BoardService
    // -------------------------------------------------------------------------

    /** {@inheritDoc} */
    @Override
    public List<BoardDTO> getAllTables() {
        return boardRepository.findAll()
                .stream()
                .map(boardMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public BoardDTO getBoardById(Long id, Long requesterId) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + id));
        checkMembership(board, requesterId);
        return boardMapper.toDTO(board);
    }

    /** {@inheritDoc} */
    @Override
    public List<BoardDTO> getBoardsByUser(Long userId) {
        return boardRepository.findAllAccessibleByUser(userId)
                .stream()
                .map(board -> {
                    if (board.getCreator().getId().equals(userId)) {
                        return boardMapper.toDTO(board, BoardMember.Role.ADMIN);
                    }
                    BoardMember.ParticipationId pid =
                            new BoardMember.ParticipationId(userId, board.getId());
                    BoardMember member = boardMemberRepository.findById(pid)
                            .orElseThrow(() -> new RuntimeException("Participation introuvable"));
                    return boardMapper.toDTO(board, member.getRole());
                })
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public BoardDTO createBoard(BoardDTO dto) {
        if (!userRepository.existsById(dto.getCreatorId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getCreatorId());
        }
        Board board = boardMapper.toEntity(dto);
        return boardMapper.toDTO(boardRepository.save(board));
    }

    /** {@inheritDoc} */
    @Override
    public BoardDTO updateTable(Long id, BoardDTO dto, Long requesterId) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + id));
        checkAdminAccess(board, requesterId);
        board.setName(dto.getName());
        return boardMapper.toDTO(boardRepository.save(board));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteTable(Long id, Long requesterId) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + id));
        if (!board.getCreator().getId().equals(requesterId)) {
            throw new ForbiddenException("Seul le créateur peut supprimer le tableau : " + id);
        }
        boardRepository.deleteById(id);
    }

    /** {@inheritDoc} */
    @Override
    public List<BoardMemberDTO> getMembersByBoard(Long boardId, Long requesterId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        checkMembership(board, requesterId);
        return boardMemberRepository.findByBoardId(boardId)
                .stream()
                .map(boardMemberMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public BoardMemberDTO addMember(Long boardId, BoardMemberDTO dto, Long requesterId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        checkAdminAccess(board, requesterId);
        if (!userRepository.existsById(dto.getUserId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getUserId());
        }
        if (boardMemberRepository.existsByUserIdAndBoardId(dto.getUserId(), boardId)) {
            throw new RuntimeException("Participation déjà existante");
        }
        // On force le boardId depuis l'URL (source de vérité)
        dto.setBoardId(boardId);
        return boardMemberMapper.toDTO(
                boardMemberRepository.save(boardMemberMapper.toEntity(dto)));
    }

    /** {@inheritDoc} */
    @Override
    public BoardMemberDTO updateMemberRole(Long boardId, Long userId,
                                           BoardMember.Role role, Long requesterId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        checkAdminAccess(board, requesterId);
        BoardMember.ParticipationId pid = new BoardMember.ParticipationId(userId, boardId);
        BoardMember member = boardMemberRepository.findById(pid)
                .orElseThrow(() -> new RuntimeException("Participation introuvable"));
        member.setRole(role);
        return boardMemberMapper.toDTO(boardMemberRepository.save(member));
    }

    /** {@inheritDoc} */
    @Override
    public void removeMember(Long boardId, Long userId, Long requesterId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        // Autorisé si : admin du tableau, créateur, ou l'utilisateur lui-même
        boolean isSelf = requesterId.equals(userId);
        if (!isSelf) {
            checkAdminAccess(board, requesterId);
        }
        BoardMember.ParticipationId pid = new BoardMember.ParticipationId(userId, boardId);
        if (!boardMemberRepository.existsById(pid)) {
            throw new RuntimeException("Participation introuvable");
        }
        boardMemberRepository.deleteById(pid);
    }
}