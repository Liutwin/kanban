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
        BoardMemberDTO dto = new BoardMemberDTO();
        dto.setUserId(boardMember.getId().getUserId());
        dto.setBoardId(boardMember.getId().getBoardId());
        dto.setRole(boardMember.getRole());
        dto.setNotified(boardMember.isNotified());
        return dto;
    }

    /**
     * Convertit un {@link BoardMemberDTO} en entité {@link BoardMember}.
     * Les entités {@link User} et {@link Board} sont reconstruites
     * avec uniquement leur ID — JPA résoudra les relations en base.
     *
     * <p>Le constructeur {@code @AllArgsConstructor} de Lombok n'est pas utilisé
     * ici afin d'éviter une dépendance à l'ordre des champs, fragile lors
     * d'ajouts futurs.</p>
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

        BoardMember member = new BoardMember();
        member.setId(id);
        member.setUser(user);
        member.setBoard(board);
        member.setRole(dto.getRole() != null ? dto.getRole() : BoardMember.Role.LECTEUR);
        member.setNotified(dto.isNotified());
        return member;
    }
}