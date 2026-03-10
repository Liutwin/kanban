package com.services.impl;

import com.dtos.TableauDTO;
import com.entities.Tableau;
import com.mappers.TableauMapper;
import com.repositories.TableauRepository;
import com.repositories.UtilisateurRepository;
import com.services.TableauService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link TableauService}.
 * Orchestre les appels aux repositories et les conversions via le mapper.
 */
@Service
@RequiredArgsConstructor
public class TableauServiceImpl implements TableauService {

    private final TableauRepository tableauRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final TableauMapper tableauMapper;

    /** {@inheritDoc} */
    @Override
    public List<TableauDTO> getAllTableaux() {
        return tableauRepository.findAll()
                .stream()
                .map(tableauMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public TableauDTO getTableauById(Long id) {
        Tableau tableau = tableauRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + id));
        return tableauMapper.toDTO(tableau);
    }

    /** {@inheritDoc} */
    @Override
    public List<TableauDTO> getTableauxByCreateur(Long createurId) {
        return tableauRepository.findByCreateurId(createurId)
                .stream()
                .map(tableauMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public TableauDTO createTableau(TableauDTO dto) {
        if (!utilisateurRepository.existsById(dto.getCreateurId())) {
            throw new RuntimeException("Utilisateur introuvable : " + dto.getCreateurId());
        }
        Tableau tableau = tableauMapper.toEntity(dto);
        return tableauMapper.toDTO(tableauRepository.save(tableau));
    }

    /** {@inheritDoc} */
    @Override
    public TableauDTO updateTableau(Long id, TableauDTO dto) {
        Tableau tableau = tableauRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + id));
        tableau.setNom(dto.getNom());
        return tableauMapper.toDTO(tableauRepository.save(tableau));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteTableau(Long id) {
        if (!tableauRepository.existsById(id)) {
            throw new RuntimeException("Tableau introuvable : " + id);
        }
        tableauRepository.deleteById(id);
    }
}