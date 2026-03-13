package com.services.impl;

import com.dtos.BoardDTO;
import com.dtos.BoardMemberDTO;
import com.entities.Board;
import com.entities.BoardMember;
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
 */
@Service
@RequiredArgsConstructor
public class BoardServiceImpl implements BoardService {

    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final BoardMapper boardMapper;
    private final BoardMemberRepository boardMemberRepository;
    private final BoardMemberMapper boardMemberMapper;

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
    public BoardDTO getBoardById(Long id) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + id));
        return boardMapper.toDTO(board);
    }

    /** {@inheritDoc} */
    @Override
    public List<BoardDTO> getBoardsByCreator(Long createurId) {
        return boardRepository.findByCreatorId(createurId)
                .stream()
                .map(boardMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public BoardDTO createTable(BoardDTO dto) {
        if (!userRepository.existsById(dto.getCreatorId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getCreatorId());
        }
        Board board = boardMapper.toEntity(dto);
        return boardMapper.toDTO(boardRepository.save(board));
    }

    /** {@inheritDoc} */
    @Override
    public BoardDTO updateTable(Long id, BoardDTO dto) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + id));
        board.setName(dto.getName());
        return boardMapper.toDTO(boardRepository.save(board));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteTable(Long id) {
        if (!boardRepository.existsById(id)) {
            throw new RuntimeException("Tableau introuvable : " + id);
        }
        boardRepository.deleteById(id);
    }

    /** {@inheritDoc} */
    @Override
    public List<BoardMemberDTO> getMembersByBoard(Long boardId) {
        if (!boardRepository.existsById(boardId)) {
            throw new RuntimeException("Tableau introuvable : " + boardId);
        }
        return boardMemberRepository.findByBoardId(boardId)
                .stream()
                .map(boardMemberMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public BoardMemberDTO addMember(Long boardId, BoardMemberDTO dto) {
        if (!boardRepository.existsById(boardId)) {
            throw new RuntimeException("Tableau introuvable : " + boardId);
        }
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
    public BoardMemberDTO updateMemberRole(Long boardId, Long userId, BoardMember.Role role) {
        BoardMember.ParticipationId pid = new BoardMember.ParticipationId(userId, boardId);
        BoardMember member = boardMemberRepository.findById(pid)
                .orElseThrow(() -> new RuntimeException("Participation introuvable"));
        member.setRole(role);
        return boardMemberMapper.toDTO(boardMemberRepository.save(member));
    }

    /** {@inheritDoc} */
    @Override
    public void removeMember(Long boardId, Long userId) {
        BoardMember.ParticipationId pid = new BoardMember.ParticipationId(userId, boardId);
        if (!boardMemberRepository.existsById(pid)) {
            throw new RuntimeException("Participation introuvable");
        }
        boardMemberRepository.deleteById(pid);
    }
}