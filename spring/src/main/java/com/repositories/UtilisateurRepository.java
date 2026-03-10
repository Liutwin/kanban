package com.repositories;
import com.entities.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Repository JPA pour l'entité {@link Utilisateur}.
 * Fournit les opérations CRUD de base via Spring Data,
 * ainsi que des requêtes métier spécifiques aux utilisateurs.
 */
@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    /**
     * Recherche un utilisateur par son adresse email.
     *
     * @param email l'adresse email à rechercher
     * @return un {@link Optional} contenant l'utilisateur si trouvé
     */
    Optional<Utilisateur> findByEmail(String email);

    /**
     * Vérifie si un email est déjà utilisé.
     *
     * @param email l'adresse email à vérifier
     * @return {@code true} si l'email existe déjà en base
     */
    boolean existsByEmail(String email);
}