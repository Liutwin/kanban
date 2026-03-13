package com.mappers;

import com.dtos.CommentDTO;
import com.entities.Comment;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link Comment}
 * et son DTO {@link CommentDTO}.
 */
@Component
public class CommentMapper {

    /**
     * Convertit une entité {@link Comment} en {@link CommentDTO}.
     *
     * @param comment l'entité à convertir
     * @return le DTO correspondant
     */
    public CommentDTO toDTO(Comment comment) {
        CommentDTO dto = new CommentDTO();
        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setDate(comment.getDate());
        dto.setTskId(comment.getTskId());
        dto.setUsrId(comment.getUsrId());
        return dto;
    }

    /**
     * Convertit un {@link CommentDTO} en entité {@link Comment}.
     * La date est ignorée à la création — elle est définie dans le service.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public Comment toEntity(CommentDTO dto) {
        Comment comment = new Comment();
        comment.setContent(dto.getContent());
        comment.setDate(dto.getDate());
        comment.setTskId(dto.getTskId());
        comment.setUsrId(dto.getUsrId());
        return comment;
    }
}
