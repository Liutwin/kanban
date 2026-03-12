package com.services.impl;

import com.dtos.BoardMemberDTO;
import com.entities.BoardMember;
import com.mappers.BoardMemberMapper;
import com.repositories.BoardMemberRepository;
import com.repositories.BoardRepository;
import com.repositories.UserRepository;
import com.services.BoardMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link BoardMemberService}.
 * Orchestre les appels aux repositories et les conversions via le mapper.
 */
@Service
@RequiredArgsConstructor
public class BoardMemberServiceImpl implements BoardMemberService {

    private final BoardMemberRepository boardMemberRepository;
    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberMapper boardMemberMapper;

    /** {@inheritDoc} */
    @Override
    public List<BoardMemberDTO> getParticipationsByUser(Long userId) {
        return boardMemberRepository.findByUserId(userId)
                .stream()
                .map(boardMemberMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<BoardMemberDTO> getParticipationsByTableau(Long tableauId) {
        return boardMemberRepository.findByBoardId(tableauId)
                .stream()
                .map(boardMemberMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public BoardMemberDTO addParticipation(BoardMemberDTO dto) {
        if (boardMemberRepository.existsByUserIdAndBoardId(dto.getUserId(), dto.getTableauId())) {
            throw new RuntimeException("Participation déjà existante");
        }
        if (!userRepository.existsById(dto.getUserId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getUserId());
        }
        if (!boardRepository.existsById(dto.getTableauId())) {
            throw new RuntimeException("Tableau introuvable : " + dto.getTableauId());
        }
        return boardMemberMapper.toDTO(boardMemberRepository.save(boardMemberMapper.toEntity(dto)));
    }

    /** {@inheritDoc} */
    @Override
    public BoardMemberDTO updateRole(Long userId, Long tableauId, BoardMember.Role role) {
        BoardMember.ParticipationId pid = new BoardMember.ParticipationId(userId, tableauId);
        BoardMember boardMember = boardMemberRepository.findById(pid)
                .orElseThrow(() -> new RuntimeException("Participation introuvable"));
        boardMember.setRole(role);
        return boardMemberMapper.toDTO(boardMemberRepository.save(boardMember));
    }

    /** {@inheritDoc} */
    @Override
    public void removeParticipation(Long userId, Long tableauId) {
        BoardMember.ParticipationId pid = new BoardMember.ParticipationId(userId, tableauId);
        if (!boardMemberRepository.existsById(pid)) {
            throw new RuntimeException("Participation introuvable");
        }
        boardMemberRepository.deleteById(pid);
    }
}