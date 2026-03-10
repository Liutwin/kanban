package com.services.impl;

import com.dtos.ParticipationDTO;
import com.entities.Participation;
import com.mappers.ParticipationMapper;
import com.repositories.ParticipationRepository;
import com.repositories.TableauRepository;
import com.repositories.UserRepository;
import com.services.ParticipationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link ParticipationService}.
 * Orchestre les appels aux repositories et les conversions via le mapper.
 */
@Service
@RequiredArgsConstructor
public class ParticipationServiceImpl implements ParticipationService {

    private final ParticipationRepository participationRepository;
    private final UserRepository userRepository;
    private final TableauRepository tableauRepository;
    private final ParticipationMapper participationMapper;

    /** {@inheritDoc} */
    @Override
    public List<ParticipationDTO> getParticipationsByUser(Long userId) {
        return participationRepository.findByIdUserId(userId)
                .stream()
                .map(participationMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<ParticipationDTO> getParticipationsByTableau(Long tableauId) {
        return participationRepository.findByIdTableauId(tableauId)
                .stream()
                .map(participationMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public ParticipationDTO addParticipation(ParticipationDTO dto) {
        if (participationRepository.existsByIdUserIdAndIdTableauId(dto.getUserId(), dto.getTableauId())) {
            throw new RuntimeException("Participation déjà existante");
        }
        if (!userRepository.existsById(dto.getUserId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getUserId());
        }
        if (!tableauRepository.existsById(dto.getTableauId())) {
            throw new RuntimeException("Tableau introuvable : " + dto.getTableauId());
        }
        return participationMapper.toDTO(participationRepository.save(participationMapper.toEntity(dto)));
    }

    /** {@inheritDoc} */
    @Override
    public ParticipationDTO updateRole(Long userId, Long tableauId, Participation.Role role) {
        Participation.ParticipationId pid = new Participation.ParticipationId(userId, tableauId);
        Participation participation = participationRepository.findById(pid)
                .orElseThrow(() -> new RuntimeException("Participation introuvable"));
        participation.setRole(role);
        return participationMapper.toDTO(participationRepository.save(participation));
    }

    /** {@inheritDoc} */
    @Override
    public void removeParticipation(Long userId, Long tableauId) {
        Participation.ParticipationId pid = new Participation.ParticipationId(userId, tableauId);
        if (!participationRepository.existsById(pid)) {
            throw new RuntimeException("Participation introuvable");
        }
        participationRepository.deleteById(pid);
    }
}