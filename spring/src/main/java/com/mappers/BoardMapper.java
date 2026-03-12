package com.mappers;

import com.dtos.BoardDTO;
import com.entities.Board;
import com.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Board}
 * et son DTO {@link BoardDTO}.
 */
@Component
@RequiredArgsConstructor
public class BoardMapper {

    /**
     * Convertit une entité {@link Board} en {@link BoardDTO}.
     *
     * @param board l'entité à convertir
     * @return le DTO correspondant
     */
    public BoardDTO toDTO(Board board) {
        return new BoardDTO(
                board.getId(),
                board.getName(),
                board.getCreator().getId()
        );
    }

    /**
     * Convertit un {@link BoardDTO} en entité {@link Board}.
     * L'utilisateur créateur est reconstruit avec uniquement son ID —
     * JPA résoudra la relation en base.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public Board toEntity(BoardDTO dto) {
        Board board = new Board();
        board.setId(dto.getId());
        board.setName(dto.getNom());
        User createur = new User();
        createur.setId(dto.getCreateurId());
        board.setCreator(createur);
        return board;
    }
}