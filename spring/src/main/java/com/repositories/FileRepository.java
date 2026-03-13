package com.repositories;

import com.entities.File;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

/**
 * Repository MongoDB pour l'entité {@link File}.
 * Fournit les opérations CRUD de base via Spring Data MongoDB,
 * ainsi que des requêtes métier spécifiques aux pièces jointes.
 */
public interface FileRepository extends MongoRepository<File, String> {

    /**
     * Récupère toutes les pièces jointes d'une tâche.
     *
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     * @return liste des fichiers correspondants
     */
    List<File> findByTskId(Long tskId);

    /**
     * Récupère toutes les pièces jointes liées à un commentaire.
     *
     * @param comId l'identifiant du commentaire (ObjectId MongoDB)
     * @return liste des fichiers correspondants
     */
    List<File> findByComId(ObjectId comId);

    /**
     * Supprime toutes les pièces jointes associées à une tâche.
     * Appelé lors de la suppression d'une tâche côté MariaDB
     * pour maintenir la cohérence inter-bases.
     *
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     */
    void deleteByTskId(Long tskId);
}
