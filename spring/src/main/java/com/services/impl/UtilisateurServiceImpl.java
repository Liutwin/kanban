package com.services.impl;

import com.dtos.UtilisateurDTO;
import com.entities.Utilisateur;
import com.mappers.UtilisateurMapper;
import com.repositories.UtilisateurRepository;
import com.services.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link UtilisateurService}.
 * Orchestre les appels au {@link UtilisateurRepository}
 * et les conversions via le {@link UtilisateurMapper}.
 */
@Service
@RequiredArgsConstructor
public class UtilisateurServiceImpl implements UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;
    private final UtilisateurMapper userMapper;

    /**
     * {@inheritDoc}
     */
    @Override
    public List<UtilisateurDTO> getAllUsers() {
        return utilisateurRepository.findAll()
                .stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public UtilisateurDTO getUserById(Long id) {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        return userMapper.toDTO(utilisateur);
    }

    /** {@inheritDoc} */
    @Override
    public UtilisateurDTO createUser(UtilisateurDTO dto) {
        if (utilisateurRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email déjà utilisé : " + dto.getEmail());
        }
        Utilisateur utilisateur = userMapper.toEntity(dto);
        return userMapper.toDTO(utilisateurRepository.save(utilisateur));
    }

    /** {@inheritDoc} */
    @Override
    public UtilisateurDTO updateUser(Long id, UtilisateurDTO dto) {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        utilisateur.setEmail(dto.getEmail());
        utilisateur.setPseudo(dto.getPseudo());
        return userMapper.toDTO(utilisateurRepository.save(utilisateur));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteUser(Long id) {
        if (!utilisateurRepository.existsById(id)) {
            throw new RuntimeException("Utilisateur introuvable : " + id);
        }
        utilisateurRepository.deleteById(id);
    }
}