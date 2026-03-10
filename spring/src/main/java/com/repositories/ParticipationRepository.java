package com.repositories;

import com.entities.Participation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA pour l'entité {@link Participation}.
 * Fournit les opérations CRUD et des requêtes métier
 * sur les participations aux tableaux.
 */
@Repository
public interface ParticipationRepository extends JpaRepository<Participation, Participation.ParticipationId> {

    /**
     * Récupère toutes les participations d'un utilisateur donné.
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste des participations correspondantes
     */
    List<Participation> findByUtilisateurId(Long userId);

    /**
     * Récupère toutes les participations d'un tableau donné.
     *
     * @param tableauId l'identifiant du tableau
     * @return liste des participations correspondantes
     */
    List<Participation> findByTableauId(Long tableauId);

    /**
     * Vérifie si un utilisateur participe déjà à un tableau donné.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @return {@code true} si la participation existe déjà
     */
    boolean existsByUtilisateurIdAndTableauId(Long userId, Long tableauId);
}