package com.services.impl;

import com.dtos.CommentDTO;
import com.entities.Comment;
import com.entities.Task;
import com.mappers.CommentMapper;
import com.repositories.CommentRepository;
import com.repositories.TaskRepository;
import com.repositories.UserRepository;
import com.services.CommentService;
import com.services.FileService;
import com.services.MailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link CommentService}.
 * Orchestre les appels à {@link CommentRepository} et les conversions via {@link CommentMapper}.
 * Vérifie la cohérence avec MariaDB avant toute insertion.
 */
@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final FileService    fileService;
    private final CommentMapper commentMapper;
    private final TaskRepository taskRepository;   // vérif cohérence MariaDB
    private final UserRepository userRepository;   // vérif cohérence MariaDB
    private final MailService    mailService;

    /** {@inheritDoc} */
    @Override
    public List<CommentDTO> getCommentsByTache(Long tskId) {
        return commentRepository.findByTskIdOrderByDateAsc(tskId)
                .stream().map(commentMapper::toDTO).collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public CommentDTO getCommentById(String id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Commentaire introuvable : " + id));
        return commentMapper.toDTO(comment);
    }

    /** {@inheritDoc} */
    @Override
    public CommentDTO addComment(CommentDTO dto) {
        // Vérification de cohérence inter-bases
        Task task = taskRepository.findById(dto.getTskId())
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + dto.getTskId()));
        if (!userRepository.existsById(dto.getUsrId()))
            throw new RuntimeException("Utilisateur introuvable : " + dto.getUsrId());

        Comment comment = commentMapper.toEntity(dto);
        comment.setDate(Instant.now()); // date forcée côté serveur
        CommentDTO saved = commentMapper.toDTO(commentRepository.save(comment));

        // Notifie l'assigné·e si : tâche assignée, l'auteur du commentaire n'est pas l'assigné·e
        if (task.getAssigned() != null && !task.getAssigned().getId().equals(dto.getUsrId())) {
            userRepository.findById(dto.getUsrId()).ifPresent(commenter -> {
                String boardName = task.getBoardColumn().getBoard().getName();
                mailService.sendTaskCommented(
                        task.getAssigned().getEmail(),
                        task.getAssigned().getFirstName(),
                        task.getTitle(),
                        boardName,
                        commenter.getFirstName() + " " + commenter.getLastName(),
                        dto.getContent()
                );
            });
        }

        return saved;
    }

    /** {@inheritDoc} */
    @Override
    public CommentDTO updateComment(String id, CommentDTO dto) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Commentaire introuvable : " + id));
        comment.setContent(dto.getContent());
        // tskId et usrId ne sont pas modifiables après création
        return commentMapper.toDTO(commentRepository.save(comment));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteComment(String id) {
        if (!commentRepository.existsById(id))
            throw new RuntimeException("Commentaire introuvable : " + id);
        fileService.deleteByComment(id);
        commentRepository.deleteById(id);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteByTache(Long tskId) {
        // Supprimer d'abord les fichiers liés, puis les commentaires
        fileService.deleteByTache(tskId);
        commentRepository.deleteByTskId(tskId);
    }
}