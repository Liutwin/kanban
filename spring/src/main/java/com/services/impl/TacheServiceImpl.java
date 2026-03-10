package com.services.impl;

import com.dtos.TacheDTO;
import com.entities.Colonne;
import com.entities.Tache;
import com.entities.Utilisateur;
import com.mappers.TacheMapper;
import com.repositories.ColonneRepository;
import com.repositories.TacheRepository;
import com.repositories.UtilisateurRepository;
import com.services.TacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link TacheService}.
 * Orchestre les appels aux repositories et les conversions via le mapper.
 */
@Service
@RequiredArgsConstructor
public class TacheServiceImpl implements TacheService {

    private final TacheRepository tacheRepository;
    private final ColonneRepository colonneRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final TacheMapper tacheMapper;

    /** {@inheritDoc} */
    @Override
    public List<TacheDTO> getTasksByColonne(Long columnId) {
        return tacheRepository.findByColonneId(columnId)
                .stream()
                .map(tacheMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<TacheDTO> getTasksByAssignee(Long assigneeId) {
        return tacheRepository.findByAssigneeId(assigneeId)
                .stream()
                .map(tacheMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<TacheDTO> getTasksByColonneAndPriorite(Long columnId, Tache.Priority priority) {
        return tacheRepository.findByColonneIdAndPriorite(columnId, priority)
                .stream()
                .map(tacheMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public TacheDTO getTaskById(Long id) {
        Tache tache = tacheRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        return tacheMapper.toDTO(tache);
    }

    /** {@inheritDoc} */
    @Override
    public TacheDTO createTask(TacheDTO dto) {
        if (!colonneRepository.existsById(dto.getColonneId())) {
            throw new RuntimeException("Colonne introuvable : " + dto.getColonneId());
        }
        if (!utilisateurRepository.existsById(dto.getCreateurId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getCreateurId());
        }
        return tacheMapper.toDTO(tacheRepository.save(tacheMapper.toEntity(dto)));
    }

    /** {@inheritDoc} */
    @Override
    public TacheDTO updateTask(Long id, TacheDTO dto) {
        Tache tache = tacheRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        tache.setTitre(dto.getTitre());
        tache.setDetails(dto.getDetails());
        tache.setDateLimite(dto.getDateLimite());
        tache.setPriorite(dto.getPriority() != null ? dto.getPriority() : tache.getPriorite());
        return tacheMapper.toDTO(tacheRepository.save(tache));
    }

    /** {@inheritDoc} */
    @Override
    public TacheDTO assignTask(Long id, Long assigneeId) {
        Tache tache = tacheRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        if (assigneeId == null) {
            tache.setAssignee(null);
        } else {
            Utilisateur assignee = utilisateurRepository.findById(assigneeId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + assigneeId));
            tache.setAssignee(assignee);
        }
        return tacheMapper.toDTO(tacheRepository.save(tache));
    }

    /** {@inheritDoc} */
    @Override
    public TacheDTO moveTask(Long id, Long colonneId) {
        Tache tache = tacheRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable : " + id));
        Colonne colonne = colonneRepository.findById(colonneId)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + colonneId));
        tache.setColonne(colonne);
        return tacheMapper.toDTO(tacheRepository.save(tache));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteTask(Long id) {
        if (!tacheRepository.existsById(id)) {
            throw new RuntimeException("Tâche introuvable : " + id);
        }
        tacheRepository.deleteById(id);
    }
}