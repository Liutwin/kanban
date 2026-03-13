package com.services.impl;

import com.dtos.BoardColumnDTO;
import com.entities.BoardColumn;
import com.mappers.BoardColumnMapper;
import com.repositories.BoardColumnRepository;
import com.repositories.BoardRepository;
import com.services.BoardColumnService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link BoardColumnService}.
 * Orchestre les appels au repository et les conversions via le mapper.
 */
@Service
@RequiredArgsConstructor
public class BoardColumnServiceImpl implements BoardColumnService {

    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnMapper boardColumnMapper;

    /** {@inheritDoc} */
    @Override
    public List<BoardColumnDTO> getColumnsByTableau(Long tableauId) {
        return boardColumnRepository.findByBoardIdOrderByNumeroAsc(tableauId)
                .stream()
                .map(boardColumnMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public BoardColumnDTO getColumnById(Long id) {
        BoardColumn boardColumn = boardColumnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        return boardColumnMapper.toDTO(boardColumn);
    }

    /** {@inheritDoc} */
    @Override
    public BoardColumnDTO createColumn(BoardColumnDTO dto) {
        if (!boardRepository.existsById(dto.getTableauId())) {
            throw new RuntimeException("Tableau introuvable : " + dto.getTableauId());
        }
        BoardColumn boardColumn = boardColumnMapper.toEntity(dto);
        BoardColumn saved = boardColumnRepository.save(boardColumn);
        // Recharge depuis la BDD pour récupérer le col_numero assigné par le trigger
        return boardColumnMapper.toDTO(boardColumnRepository.findById(saved.getId())
                .orElseThrow(() -> new RuntimeException("Erreur lors de la création de la colonne")));
    }

    /** {@inheritDoc} */
    @Override
    public BoardColumnDTO updateColumn(Long id, BoardColumnDTO dto) {
        BoardColumn boardColumn = boardColumnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        boardColumn.setName(dto.getNom());
        return boardColumnMapper.toDTO(boardColumnRepository.save(boardColumn));
    }

    /** {@inheritDoc} */
    @Override
    public void moveColumn(Long id, int newNum) {
        if (!boardColumnRepository.existsById(id)) {
            throw new RuntimeException("Colonne introuvable : " + id);
        }
        boardColumnRepository.moveBoardColumn(id, newNum);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteColumn(Long id) {
        if (!boardColumnRepository.existsById(id)) {
            throw new RuntimeException("Colonne introuvable : " + id);
        }
        boardColumnRepository.deleteById(id);
    }
}