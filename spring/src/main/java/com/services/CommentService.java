package com.services;

import com.dtos.CommentDTO;
import java.util.List;

/**
 * Interface du service métier pour la gestion des commentaires.
 * Définit le contrat des opérations disponibles sur les commentaires,
 * stockés dans MongoDB (collection {@code commentaire_com}).
 */
public interface CommentService {

    /**
     * Récupère tous les commentaires d'une tâche, triés par date croissante.
     *
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     * @return liste de {@link CommentDTO} ordonnée chronologiquement
     */
    List<CommentDTO> getCommentsByTache(Long tskId);

    /**
     * Récupère un commentaire par son identifiant MongoDB.
     *
     * @param id l'identifiant du commentaire (ObjectId en String)
     * @return le {@link CommentDTO} correspondant
     * @throws RuntimeException si le commentaire n'est pas trouvé
     */
    CommentDTO getCommentById(String id);

    /**
     * Ajoute un commentaire à une tâche.
     * La date est définie côté serveur ; {@code tskId} et {@code usrId}
     * sont vérifiés en cohérence avec MariaDB avant l'insertion.
     *
     * @param dto les données du commentaire ({@code tskId} et {@code usrId} obligatoires)
     * @return le {@link CommentDTO} créé avec son identifiant généré
     * @throws RuntimeException si la tâche ou l'utilisateur n'existe pas en MariaDB
     */
    CommentDTO addComment(CommentDTO dto);

    /**
     * Met à jour le contenu d'un commentaire existant.
     * Les champs {@code tskId} et {@code usrId} ne sont pas modifiables après création.
     *
     * @param id  l'identifiant du commentaire à modifier
     * @param dto les nouvelles données (seul {@code content} est pris en compte)
     * @return le {@link CommentDTO} mis à jour
     * @throws RuntimeException si le commentaire n'est pas trouvé
     */
    CommentDTO updateComment(String id, CommentDTO dto);

    /**
     * Supprime un commentaire par son identifiant.
     *
     * @param id l'identifiant du commentaire à supprimer
     * @throws RuntimeException si le commentaire n'est pas trouvé
     */
    void deleteComment(String id);

    /**
     * Supprime tous les commentaires et fichiers associés à une tâche.
     * Appelé lors de la suppression d'une tâche côté MariaDB
     * pour maintenir la cohérence inter-bases.
     *
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     */
    void deleteByTache(Long tskId);
}
