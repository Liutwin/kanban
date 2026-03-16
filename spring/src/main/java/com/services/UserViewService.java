package com.services;

import com.dtos.UserViewDTO;

import java.util.List;

/**
 * Interface du service métier pour la consultation des profils utilisateurs.
 * Définit le contrat des opérations de lecture disponibles sur la vue
 * {@code vue_profil_utilisateur}.
 */
public interface UserViewService {

    /**
     * Récupère la liste de tous les profils utilisateurs,
     * triés par date de dernière activité décroissante.
     *
     * @return liste de {@link UserViewDTO}
     */
    List<UserViewDTO> getAllProfiles();

    /**
     * Récupère le profil statistique d'un utilisateur par son identifiant.
     *
     * @param id l'identifiant de l'utilisateur
     * @return le {@link UserViewDTO} correspondant
     * @throws RuntimeException si l'utilisateur n'est pas trouvé
     */
    UserViewDTO getProfileById(Long id);

    /**
     * Recherche des profils dont le nom ou le prénom contient la chaîne fournie,
     * sans distinction de casse.
     *
     * @param query la chaîne à rechercher
     * @return la liste des {@link UserViewDTO} correspondants
     */
    List<UserViewDTO> searchProfiles(String query);
}
