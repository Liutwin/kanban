package com.services;

import com.dtos.ParticipationDTO;
import com.entities.Participation;

import java.util.List;

/**
 * Interface du service métier pour la gestion des participations aux tableaux.
 * Définit le contrat des opérations CRUD disponibles sur les participations.
 */
public interface ParticipationService {

    /**
     * Récupère toutes les participations d'un utilisateur.
     *
     * @param userId l'identifiant de l'utilisateur
     * @return liste de {@link ParticipationDTO}
     */
    List<ParticipationDTO> getParticipationsByUser(Long userId);

    /**
     * Récupère tous les membres d'un tableau.
     *
     * @param tableauId l'identifiant du tableau
     * @return liste de {@link ParticipationDTO}
     */
    List<ParticipationDTO> getParticipationsByTableau(Long tableauId);

    /**
     * Ajoute un utilisateur à un tableau avec un rôle donné.
     *
     * @param dto les données de la participation
     * @return le {@link ParticipationDTO} créé
     * @throws RuntimeException si la participation existe déjà
     * @throws RuntimeException si l'utilisateur ou le tableau n'existe pas
     */
    ParticipationDTO addParticipation(ParticipationDTO dto);

    /**
     * Met à jour le rôle d'un participant dans un tableau.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @param role      le nouveau rôle
     * @return le {@link ParticipationDTO} mis à jour
     * @throws RuntimeException si la participation n'existe pas
     */
    ParticipationDTO updateRole(Long userId, Long tableauId, Participation.Role role);

    /**
     * Retire un utilisateur d'un tableau.
     *
     * @param userId    l'identifiant de l'utilisateur
     * @param tableauId l'identifiant du tableau
     * @throws RuntimeException si la participation n'existe pas
     */
    void removeParticipation(Long userId, Long tableauId);
}