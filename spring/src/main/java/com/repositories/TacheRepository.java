package com.repositories;

import com.entities.Tache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA pour l'entité {@link Tache}.
 * Fournit les opérations CRUD et des requêtes métier sur les tâches.
 */
@Repository
public interface TacheRepository extends JpaRepository<Tache, Long> {

    /**
     * Récupère toutes les tâches d'une colonne donnée.
     *
     * @param colonneId l'identifiant de la colonne
     * @return liste des tâches correspondantes
     */
    List<Tache> findByColonneId(Long colonneId);

    /**
     * Récupère toutes les tâches assignées à un utilisateur donné.
     *
     * @param assigneeId l'identifiant de l'utilisateur assigné
     * @return liste des tâches correspondantes
     */
    List<Tache> findByAssigneeId(Long assigneeId);

    /**
     * Récupère toutes les tâches d'une priorité donnée dans une colonne.
     *
     * @param colonneId l'identifiant de la colonne
     * @param priorite  le niveau de priorité recherché
     * @return liste des tâches correspondantes
     */
    List<Tache> findByColonneIdAndPriorite(Long colonneId, Tache.Priority priorite);
}