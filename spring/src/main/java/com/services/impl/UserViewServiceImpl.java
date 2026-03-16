package com.services.impl;

import com.dtos.UserViewDTO;
import com.mappers.UserViewMapper;
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
 */
@Service
@RequiredArgsConstructor
public class UserViewServiceImpl implements UserViewService {

    private final UserViewRepository userViewRepository;
    private final UserViewMapper userViewMapper;

    /** {@inheritDoc} */
    @Override
    public List<UserViewDTO> getAllProfiles() {
        return userViewRepository.findAllByOrderByLastActivityDesc()
                .stream()
                .map(userViewMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public UserViewDTO getProfileById(Long id) {
        return userViewRepository.findById(id)
                .map(userViewMapper::toDTO)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
    }

    /** {@inheritDoc} */
    @Override
    public List<UserViewDTO> searchProfiles(String query) {
        return userViewRepository
                .findByLastNameContainingIgnoreCaseOrFirstNameContainingIgnoreCase(query, query)
                .stream()
                .map(userViewMapper::toDTO)
                .collect(Collectors.toList());
    }
}
