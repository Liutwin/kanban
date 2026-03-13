package com.services.impl;

import com.dtos.BoardDTO;
import com.entities.Board;
import com.mappers.BoardMapper;
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
        if (!userRepository.existsById(dto.getCreateurId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getCreateurId());
        }
        Board board = boardMapper.toEntity(dto);
        return boardMapper.toDTO(boardRepository.save(board));
    }

    /** {@inheritDoc} */
    @Override
    public BoardDTO updateTable(Long id, BoardDTO dto) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + id));
        board.setName(dto.getNom());
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
}