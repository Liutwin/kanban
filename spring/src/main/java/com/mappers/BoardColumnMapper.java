package com.mappers;

import com.dtos.BoardColumnDTO;
import com.entities.BoardColumn;
import com.entities.Board;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link BoardColumn}
 * et son DTO {@link BoardColumnDTO}.
 */
@Component
public class BoardColumnMapper {

    /**
     * Convertit une entité {@link BoardColumn} en {@link BoardColumnDTO}.
     *
     * @param boardColumn l'entité à convertir
     * @return le DTO correspondant
     */
    public BoardColumnDTO toDTO(BoardColumn boardColumn) {
        return new BoardColumnDTO(
                boardColumn.getId(),
                boardColumn.getNumero(),
                boardColumn.getName(),
                boardColumn.getBoard().getId()
        );
    }

    /**
     * Convertit un {@link BoardColumnDTO} en entité {@link BoardColumn}.
     * Le {@code numero} n'est pas transmis — il est géré par le trigger SQL.
     * Le {@link Board} est reconstruit avec uniquement son ID.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public BoardColumn toEntity(BoardColumnDTO dto) {
        BoardColumn boardColumn = new BoardColumn();
        boardColumn.setId(dto.getId());
        boardColumn.setName(dto.getName());
        // numero intentionnellement omis : géré par le trigger before_insert_colonne
        Board board = new Board();
        board.setId(dto.getBoardId());
        boardColumn.setBoard(board);
        return boardColumn;
    }
}