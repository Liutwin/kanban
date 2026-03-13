package com.mappers;

import com.dtos.BoardMemberDTO;
import com.entities.BoardMember;
import com.entities.Board;
import com.entities.User;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link BoardMember}
 * et son DTO {@link BoardMemberDTO}.
 */
@Component
public class BoardMemberMapper {

    /**
     * Convertit une entité {@link BoardMember} en {@link BoardMemberDTO}.
     *
     * @param boardMember l'entité à convertir
     * @return le DTO correspondant
     */
    public BoardMemberDTO toDTO(BoardMember boardMember) {
        return new BoardMemberDTO(
                boardMember.getId().getUserId(),
                boardMember.getId().getTableauId(),
                boardMember.getRole()
        );
    }

    /**
     * Convertit un {@link BoardMemberDTO} en entité {@link BoardMember}.
     * Les entités {@link User} et {@link Board} sont reconstruites
     * avec uniquement leur ID — JPA résoudra les relations en base.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public BoardMember toEntity(BoardMemberDTO dto) {
        BoardMember.ParticipationId id = new BoardMember.ParticipationId(dto.getUserId(), dto.getBoardId());

        User user = new User();
        user.setId(dto.getUserId());

        Board board = new Board();
        board.setId(dto.getBoardId());

        return new BoardMember(id, user, board,
                dto.getRole() != null ? dto.getRole() : BoardMember.Role.LECTEUR);
    }
}