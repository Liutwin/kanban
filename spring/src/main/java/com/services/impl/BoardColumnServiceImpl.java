package com.services.impl;

import com.dtos.BoardColumnDTO;
import com.entities.BoardColumn;
import com.exceptions.ForbiddenException;
import com.mappers.BoardColumnMapper;
import com.repositories.BoardColumnRepository;
import com.repositories.BoardMemberRepository;
import com.repositories.BoardRepository;
import com.services.BoardColumnService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link BoardColumnService}.
 * Orchestre les appels au repository et les conversions via le mapper.
 *
 * <p>Toutes les opérations vérifient que le {@code requesterId} est bien
 * membre (ou créateur) du tableau concerné avant d'agir. La vérification
 * repose sur {@link BoardMemberRepository#existsByUserIdAndBoardId} et
 * sur le créateur stocké dans l'entité {@link com.entities.Board}.</p>
 */
@Service
@RequiredArgsConstructor
public class BoardColumnServiceImpl implements BoardColumnService {

    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final BoardColumnMapper boardColumnMapper;

    // -------------------------------------------------------------------------
    // Méthode utilitaire privée
    // -------------------------------------------------------------------------

    /**
     * Vérifie que l'utilisateur est membre ou créateur du tableau donné.
     * Lève une {@link ForbiddenException} dans le cas contraire.
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
    // Implémentation de BoardColumnService
    // -------------------------------------------------------------------------

    /** {@inheritDoc} */
    @Override
    public List<BoardColumnDTO> getColumnsByTableau(Long boardId, Long requesterId) {
        checkBoardMembership(boardId, requesterId);
        return boardColumnRepository.findByBoardIdOrderByNumeroAsc(boardId)
                .stream()
                .map(boardColumnMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public BoardColumnDTO getColumnById(Long id, Long requesterId) {
        BoardColumn boardColumn = boardColumnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        checkBoardMembership(boardColumn.getBoard().getId(), requesterId);
        return boardColumnMapper.toDTO(boardColumn);
    }

    /** {@inheritDoc} */
    @Override
    public BoardColumnDTO createColumn(BoardColumnDTO dto, Long requesterId) {
        checkBoardMembership(dto.getBoardId(), requesterId);
        BoardColumn boardColumn = boardColumnMapper.toEntity(dto);
        BoardColumn saved = boardColumnRepository.save(boardColumn);
        // Recharge depuis la BDD pour récupérer le col_numero assigné par le trigger
        return boardColumnMapper.toDTO(boardColumnRepository.findById(saved.getId())
                .orElseThrow(() -> new RuntimeException("Erreur lors de la création de la colonne")));
    }

    /** {@inheritDoc} */
    @Override
    public BoardColumnDTO updateColumn(Long id, BoardColumnDTO dto, Long requesterId) {
        BoardColumn boardColumn = boardColumnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        checkBoardMembership(boardColumn.getBoard().getId(), requesterId);
        boardColumn.setName(dto.getName());
        return boardColumnMapper.toDTO(boardColumnRepository.save(boardColumn));
    }

    /** {@inheritDoc} */
    @Override
    public void moveColumn(Long id, int newNum, Long requesterId) {
        BoardColumn boardColumn = boardColumnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        checkBoardMembership(boardColumn.getBoard().getId(), requesterId);
        boardColumnRepository.moveBoardColumn(id, newNum);
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void deleteColumn(Long id, Long requesterId) {
        BoardColumn col = boardColumnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        checkBoardMembership(col.getBoard().getId(), requesterId);

        Long tabId      = col.getBoard().getId();
        int  deletedNum = col.getNumero();

        boardColumnRepository.setShiftFlag();
        boardColumnRepository.deleteById(id);
        boardColumnRepository.shiftColumnsAfterDelete(tabId, deletedNum);
        boardColumnRepository.clearShiftFlag();
    }
}