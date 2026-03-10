package com.repositories;

import com.entities.Tableau;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA pour l'entité {@link Tableau}.
 * Fournit les opérations CRUD de base et des requêtes métier
 * spécifiques aux tableaux.
 */
@Repository
public interface TableauRepository extends JpaRepository<Tableau, Long> {

    /**
     * Récupère tous les tableaux créés par un utilisateur donné.
     *
     * @param createurId l'identifiant de l'utilisateur créateur
     * @return liste des tableaux correspondants
     */
    List<Tableau> findByCreateurId(Long createurId);
}