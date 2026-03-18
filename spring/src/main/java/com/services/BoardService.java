package com.services;

import com.dtos.BoardDTO;
import com.dtos.BoardMemberDTO;
import com.entities.BoardMember;
import com.exceptions.ForbiddenException;

import java.util.List;

/**
 * Interface du service métier pour la gestion des tableaux Kanban.
 * Définit le contrat des opérations CRUD disponibles sur les tableaux.
 *
 * <p>Toutes les opérations portant sur un tableau spécifique acceptent
 * un {@code requesterId} afin de vérifier que l'utilisateur appelant
 * est bien membre (ou créateur) du tableau concerné. Un accès non
 * autorisé lève une {@link ForbiddenException} qui se traduit en HTTP 403.</p>
 */
public interface BoardService {

    /**
     * Récupère tous les tableaux existants.
     *
     * <p><strong>Réservé à l'administration.</strong> Cette méthode ne filtre
     * pas par utilisateur ; l'appelant doit s'assurer que le requérant possède
     * le rôle admin avant d'invoquer cette méthode.</p>
     *
     * @return liste de {@link BoardDTO}
     */
    List<BoardDTO> getAllTables();

    /**
     * Récupère un tableau par son identifiant, après vérification des droits.
     *
     * @param id          l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link BoardDTO} correspondant
     * @throws RuntimeException    si le tableau n'est pas trouvé
     * @throws ForbiddenException  si le requérant n'est ni créateur ni membre actif
     */
    BoardDTO getBoardById(Long id, Long requesterId);

    /**
     * Récupère tous les tableaux auxquels un utilisateur participe
     * (tableaux créés par lui ou dont il est membre).
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste de {@link BoardDTO}
     */
    List<BoardDTO> getBoardsByUser(Long userId);

    /**
     * Crée un nouveau tableau.
     *
     * @param dto les données du nouveau tableau
     * @return le {@link BoardDTO} créé avec son identifiant généré
     * @throws RuntimeException si l'utilisateur créateur n'existe pas
     */
    BoardDTO createBoard(BoardDTO dto);

    /**
     * Met à jour un tableau existant, après vérification des droits.
     *
     * <p>Seul un membre avec le rôle {@code ADMIN} ou le créateur du tableau
     * est autorisé à effectuer cette opération.</p>
     *
     * @param id          l'identifiant du tableau à modifier
     * @param dto         les nouvelles données
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link BoardDTO} mis à jour
     * @throws RuntimeException    si le tableau n'est pas trouvé
     * @throws ForbiddenException  si le requérant n'est pas admin du tableau
     */
    BoardDTO updateTable(Long id, BoardDTO dto, Long requesterId);

    /**
     * Supprime un tableau par son identifiant, après vérification des droits.
     *
     * <p>Seul le créateur du tableau est autorisé à le supprimer.</p>
     *
     * @param id          l'identifiant du tableau à supprimer
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @throws RuntimeException    si le tableau n'est pas trouvé
     * @throws ForbiddenException  si le requérant n'est pas le créateur
     */
    void deleteTable(Long id, Long requesterId);

    /**
     * Récupère tous les membres d'un tableau, après vérification des droits.
     *
     * @param boardId     l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link BoardMemberDTO}
     * @throws RuntimeException    si le tableau n'existe pas
     * @throws ForbiddenException  si le requérant n'est pas membre actif
     */
    List<BoardMemberDTO> getMembersByBoard(Long boardId, Long requesterId);

    /**
     * Crée une invitation en attente pour un utilisateur dans un tableau,
     * après vérification des droits.
     *
     * <p>Seul un membre avec le rôle {@code ADMIN} ou le créateur du tableau
     * est autorisé à inviter d'autres membres.</p>
     *
     * <p>La participation est créée avec {@code notified = false} : l'invité
     * n'a pas encore accès au tableau. Il doit accepter l'invitation via
     * {@link #acceptInvitation} (ou un admin peut valider via
     * {@link #validateInvitation}).</p>
     *
     * <p>Un e-mail de notification est envoyé de façon asynchrone et non
     * bloquante ; son échec éventuel ne fait pas échouer l'opération.</p>
     *
     * @param boardId     l'identifiant du tableau
     * @param dto         les données de la participation (userId + role)
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link BoardMemberDTO} créé, avec {@code notified = false}
     * @throws RuntimeException    si une invitation ou participation existe déjà,
     *                             ou si l'utilisateur/tableau est introuvable
     * @throws ForbiddenException  si le requérant n'est pas admin du tableau
     */
    BoardMemberDTO addMember(Long boardId, BoardMemberDTO dto, Long requesterId);

    /**
     * Met à jour le rôle d'un membre dans un tableau,
     * après vérification des droits.
     *
     * <p>Seul un membre avec le rôle {@code ADMIN} ou le créateur du tableau
     * est autorisé à modifier les rôles.</p>
     *
     * @param boardId     l'identifiant du tableau
     * @param userId      l'identifiant de l'utilisateur dont le rôle est modifié
     * @param role        le nouveau rôle
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link BoardMemberDTO} mis à jour
     * @throws RuntimeException    si la participation n'existe pas
     * @throws ForbiddenException  si le requérant n'est pas admin du tableau
     */
    BoardMemberDTO updateMemberRole(Long boardId, Long userId, BoardMember.Role role, Long requesterId);

    /**
     * Retire un utilisateur d'un tableau, après vérification des droits.
     *
     * <p>Seul un membre avec le rôle {@code ADMIN}, le créateur du tableau,
     * ou l'utilisateur lui-même est autorisé à effectuer cette opération.</p>
     *
     * @param boardId     l'identifiant du tableau
     * @param userId      l'identifiant de l'utilisateur à retirer
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @throws RuntimeException    si la participation n'existe pas
     * @throws ForbiddenException  si le requérant n'est pas autorisé
     */
    void removeMember(Long boardId, Long userId, Long requesterId);

    // ---- Gestion des invitations — côté admin --------------------------------

    /**
     * Récupère les invitations en attente d'un tableau (non encore acceptées
     * par les invités), après vérification des droits.
     *
     * <p>Réservé aux admins du tableau. Destiné à la page d'administration
     * du tableau pour un suivi ou une validation manuelle.</p>
     *
     * @param boardId     l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link BoardMemberDTO} avec {@code notified = false}
     * @throws RuntimeException    si le tableau n'existe pas
     * @throws ForbiddenException  si le requérant n'est pas admin du tableau
     */
    List<BoardMemberDTO> getPendingInvitations(Long boardId, Long requesterId);

    /**
     * Valide manuellement une invitation en attente depuis la page admin,
     * en passant {@code notified} à {@code true} sans attendre l'action
     * de l'invité.
     *
     * @param boardId     l'identifiant du tableau
     * @param userId      l'identifiant de l'utilisateur invité à valider
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return le {@link BoardMemberDTO} mis à jour, avec {@code notified = true}
     * @throws RuntimeException    si l'invitation n'existe pas ou est déjà acceptée
     * @throws ForbiddenException  si le requérant n'est pas admin du tableau
     */
    BoardMemberDTO validateInvitation(Long boardId, Long userId, Long requesterId);

    // ---- Gestion des invitations — côté utilisateur (page Boards) -----------

    /**
     * Retourne toutes les invitations en attente de l'utilisateur connecté,
     * destinées à être affichées sur sa page Boards.
     *
     * <p>Aucune vérification de rôle n'est requise : l'utilisateur consulte
     * uniquement ses propres invitations ({@code userId == requesterId}).</p>
     *
     * @param requesterId l'identifiant de l'utilisateur connecté
     * @return liste de {@link BoardMemberDTO} avec {@code notified = false}
     */
    List<BoardMemberDTO> getMyPendingInvitations(Long requesterId);

    /**
     * L'utilisateur connecté accepte sa propre invitation à un tableau :
     * passe {@code notified} à {@code true} et lui donne ainsi accès au tableau.
     *
     * @param boardId     l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur connecté
     * @return le {@link BoardMemberDTO} mis à jour, avec {@code notified = true}
     * @throws RuntimeException si l'invitation n'existe pas ou est déjà acceptée
     */
    BoardMemberDTO acceptInvitation(Long boardId, Long requesterId);

    /**
     * L'utilisateur connecté refuse sa propre invitation à un tableau :
     * supprime la ligne de participation.
     *
     * @param boardId     l'identifiant du tableau
     * @param requesterId l'identifiant de l'utilisateur connecté
     * @throws RuntimeException si l'invitation n'existe pas
     */
    void declineInvitation(Long boardId, Long requesterId);
}