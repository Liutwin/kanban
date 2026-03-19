package com.services;

import com.dtos.UserViewDTO;

import java.util.List;

/**
 * Interface du service métier pour la consultation des profils utilisateurs.
 * Définit le contrat des opérations de lecture disponibles sur la vue
 * {@code vue_profil_utilisateur}.
 *
 * <p>Ces endpoints exposent des statistiques agrégées réservées aux
 * administrateurs. Le rôle du requester est vérifié en base de données.</p>
 */
public interface UserViewService {

    /**
     * Récupère la liste de tous les profils utilisateurs.
     * Réservé aux administrateurs.
     *
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @return liste de {@link UserViewDTO} triée par dernière activité décroissante
     * @throws com.exceptions.ForbiddenException si le requester n'est pas admin
     */
    List<UserViewDTO> getAllProfiles(Long requesterId);

    /**
     * Récupère le profil statistique d'un utilisateur par son identifiant.
     * Accessible par l'utilisateur lui-même ou par un administrateur.
     *
     * @param id          l'identifiant de l'utilisateur cible
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @return le {@link UserViewDTO} correspondant
     * @throws RuntimeException              si l'utilisateur n'est pas trouvé
     * @throws com.exceptions.ForbiddenException si le requester n'est ni la cible ni admin
     */
    UserViewDTO getProfileById(Long id, Long requesterId);

    /**
     * Recherche des profils dont le nom ou le prénom contient la chaîne fournie.
     * Réservé aux administrateurs.
     *
     * @param query       la chaîne à rechercher
     * @param requesterId l'identifiant de l'utilisateur effectuant la requête
     * @return la liste des {@link UserViewDTO} correspondants
     * @throws com.exceptions.ForbiddenException si le requester n'est pas admin
     */
    List<UserViewDTO> searchProfiles(String query, Long requesterId);
}