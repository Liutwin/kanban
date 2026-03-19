package com.services.impl;

import com.dtos.UserViewDTO;
import com.entities.User;
import com.exceptions.ForbiddenException;
import com.mappers.UserViewMapper;
import com.repositories.UserRepository;
import com.repositories.UserViewRepository;
import com.services.UserViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link UserViewService}.
 * Orchestre les appels au {@link UserViewRepository}
 * et les conversions via le {@link UserViewMapper}.
 *
 * <p>Le rôle du requester est relu en base de données sur chaque opération,
 * garantissant qu'une révocation admin est effective sans attendre l'expiration du JWT.</p>
 */
@Service
@RequiredArgsConstructor
public class UserViewServiceImpl implements UserViewService {

    private final UserViewRepository userViewRepository;
    private final UserViewMapper     userViewMapper;
    private final UserRepository     userRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers d'autorisation
    // ─────────────────────────────────────────────────────────────────────────

    private User requireAdmin(Long requesterId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Requester introuvable : " + requesterId));
        if (!requester.isAdmin()) {
            throw new ForbiddenException("Action réservée aux administrateurs.");
        }
        return requester;
    }

    private void requireSelfOrAdmin(Long targetId, Long requesterId) {
        if (requesterId.equals(targetId)) return;
        requireAdmin(requesterId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Opérations
    // ─────────────────────────────────────────────────────────────────────────

    /** {@inheritDoc} */
    @Override
    public List<UserViewDTO> getAllProfiles(Long requesterId) {
        requireAdmin(requesterId);
        return userViewRepository.findAllByOrderByLastActivityDesc()
                .stream()
                .map(userViewMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public UserViewDTO getProfileById(Long id, Long requesterId) {
        requireSelfOrAdmin(id, requesterId);
        return userViewRepository.findById(id)
                .map(userViewMapper::toDTO)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
    }

    /** {@inheritDoc} */
    @Override
    public List<UserViewDTO> searchProfiles(String query, Long requesterId) {
        requireAdmin(requesterId);
        return userViewRepository
                .findByLastNameContainingIgnoreCaseOrFirstNameContainingIgnoreCase(query, query)
                .stream()
                .map(userViewMapper::toDTO)
                .collect(Collectors.toList());
    }
}