package com.repositories;

import com.entities.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

/**
 * Repository MongoDB pour l'entité {@link Comment}.
 * Fournit les opérations CRUD de base via Spring Data MongoDB,
 * ainsi que des requêtes métier spécifiques aux commentaires.
 */
public interface CommentRepository extends MongoRepository<Comment, String> {

    /**
     * Récupère tous les commentaires d'une tâche, triés par date croissante.
     *
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     * @return liste des commentaires ordonnés chronologiquement
     */
    List<Comment> findByTskIdOrderByDateAsc(Long tskId);

    /**
     * Récupère tous les commentaires postés par un utilisateur donné.
     *
     * @param usrId l'identifiant de l'utilisateur (référence MariaDB)
     * @return liste des commentaires correspondants
     */
    List<Comment> findByUsrId(Long usrId);

    /**
     * Supprime tous les commentaires associés à une tâche.
     * Appelé lors de la suppression d'une tâche côté MariaDB
     * pour maintenir la cohérence inter-bases.
     *
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     */
    void deleteByTskId(Long tskId);
}
