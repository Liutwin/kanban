package com.repositories;

import com.entities.UserView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository JPA pour la vue {@link UserView}.
 * Fournit les opérations de lecture sur la vue {@code vue_profil_utilisateur}.
 *
 * <p>Seules les opérations de lecture sont pertinentes ici :
 * la vue est en lecture seule côté Hibernate ({@code @Immutable}).</p>
 */
@Repository
public interface UserViewRepository extends JpaRepository<UserView, Long> {

    /**
     * Récupère tous les profils triés par date de dernière activité décroissante.
     *
     * @return la liste de tous les {@link UserView}, les plus actifs en premier
     */
    List<UserView> findAllByOrderByLastActivityDesc();

    /**
     * Recherche des profils dont le nom ou le prénom contient la chaîne fournie,
     * sans distinction de casse.
     *
     * @param lastName  la chaîne à rechercher dans le nom
     * @param firstName la chaîne à rechercher dans le prénom
     * @return la liste des {@link UserView} correspondants
     */
    List<UserView> findByLastNameContainingIgnoreCaseOrFirstNameContainingIgnoreCase(
            String lastName, String firstName);
}
