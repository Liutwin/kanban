package com.services.impl;

import com.dtos.BoardColumnDTO;
import com.entities.Board;
import com.entities.BoardColumn;
import com.entities.BoardMember;
import com.exceptions.ForbiddenException;
import com.mappers.BoardColumnMapper;
import com.repositories.BoardColumnRepository;
import com.repositories.BoardMemberRepository;
import com.repositories.BoardRepository;
import com.services.BoardColumnService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link BoardColumnService}.
 * Orchestre les appels au repository et les conversions via le mapper.
 *
 * <p>Deux niveaux de contrôle d'accès sont appliqués :</p>
 * <ul>
 *   <li><b>Lecture</b> ({@code checkReadAccess}) : tout membre du tableau,
 *       quel que soit son rôle, peut lire les colonnes.</li>
 *   <li><b>Écriture</b> ({@code checkWriteAccess}) : seuls les membres avec
 *       le rôle {@code EDITEUR} ou {@code ADMIN}, ainsi que le créateur du
 *       tableau, peuvent créer, renommer, déplacer ou supprimer une colonne.
 *       Un {@code LECTEUR} se verra refuser ces opérations (HTTP 403).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class BoardColumnServiceImpl implements BoardColumnService {

    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final BoardColumnMapper boardColumnMapper;

    @PersistenceContext
    private EntityManager entityManager;

    // -------------------------------------------------------------------------
    // Méthodes utilitaires privées
    // -------------------------------------------------------------------------

    /**
     * Vérifie que l'utilisateur est membre ou créateur du tableau (accès en lecture).
     * Lève une {@link ForbiddenException} si l'utilisateur n'a aucun accès.
     *
     * @param boardId     l'identifiant du tableau à contrôler
     * @param requesterId l'identifiant de l'utilisateur à vérifier
     * @throws RuntimeException   si le tableau n'est pas trouvé
     * @throws ForbiddenException si l'utilisateur n'est ni créateur ni membre
     */
    private void checkReadAccess(Long boardId, Long requesterId) {
        var board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        boolean isCreator = board.getCreator().getId().equals(requesterId);
        boolean isMember  = boardMemberRepository.existsByUserIdAndBoardId(requesterId, boardId);
        if (!isCreator && !isMember) {
            throw new ForbiddenException("Accès interdit au tableau : " + boardId);
        }
    }

    /**
     * Vérifie que l'utilisateur peut modifier le tableau (accès en écriture).
     * Sont autorisés : le créateur du tableau et les membres avec le rôle
     * {@code EDITEUR} ou {@code ADMIN}. Un membre {@code LECTEUR} sera refusé.
     *
     * @param boardId     l'identifiant du tableau à contrôler
     * @param requesterId l'identifiant de l'utilisateur à vérifier
     * @throws RuntimeException   si le tableau n'est pas trouvé
     * @throws ForbiddenException si l'utilisateur est lecteur ou n'est pas membre
     */
    private void checkWriteAccess(Long boardId, Long requesterId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        if (board.getCreator().getId().equals(requesterId)) {
            return; // le créateur a tous les droits
        }
        BoardMember.ParticipationId pid = new BoardMember.ParticipationId(requesterId, boardId);
        BoardMember member = boardMemberRepository.findById(pid)
                .orElseThrow(() -> new ForbiddenException("Accès interdit au tableau : " + boardId));
        if (member.getRole() == BoardMember.Role.LECTEUR) {
            throw new ForbiddenException("Les lecteurs ne peuvent pas modifier ce tableau.");
        }
    }

    // -------------------------------------------------------------------------
    // Implémentation de BoardColumnService
    // -------------------------------------------------------------------------

    /** {@inheritDoc} */
    @Override
    public List<BoardColumnDTO> getColumnsByTableau(Long boardId, Long requesterId) {
        checkReadAccess(boardId, requesterId);
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
        checkReadAccess(boardColumn.getBoard().getId(), requesterId);
        return boardColumnMapper.toDTO(boardColumn);
    }

    /** {@inheritDoc} */
    @Override
    public BoardColumnDTO createColumn(BoardColumnDTO dto, Long requesterId) {
        checkWriteAccess(dto.getBoardId(), requesterId);
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
        checkWriteAccess(boardColumn.getBoard().getId(), requesterId);
        boardColumn.setName(dto.getName());
        return boardColumnMapper.toDTO(boardColumnRepository.save(boardColumn));
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void moveColumn(Long id, int newNum, Long requesterId) {
        BoardColumn boardColumn = boardColumnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        checkWriteAccess(boardColumn.getBoard().getId(), requesterId);

        // On détache l'entité du contexte de persistance avant d'appeler la procédure.
        // Sans cela, le flush JPA déclenché par @Modifying enverrait un UPDATE sur
        // colonne_col AVANT que deplacer_colonne s'exécute, violant uq_col_numero_tab.
        // En passant par EntityManager.createNativeQuery(), on bypasse entièrement
        // le cycle flush/track de JPA et on exécute la procédure directement.
        entityManager.detach(boardColumn);
        entityManager.createNativeQuery("CALL deplacer_colonne(:colId, :newNum)")
                .setParameter("colId", id)
                .setParameter("newNum", newNum)
                .executeUpdate();
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void deleteColumn(Long id, Long requesterId) {
        BoardColumn col = boardColumnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        checkWriteAccess(col.getBoard().getId(), requesterId);

        Long tabId      = col.getBoard().getId();
        int  deletedNum = col.getNumero();

        boardColumnRepository.setShiftFlag();
        boardColumnRepository.deleteById(id);
        boardColumnRepository.shiftColumnsAfterDelete(tabId, deletedNum);
        boardColumnRepository.clearShiftFlag();
    }
}