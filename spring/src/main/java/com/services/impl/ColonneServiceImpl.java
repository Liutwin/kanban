package com.services.impl;

import com.dtos.ColonneDTO;
import com.entities.Colonne;
import com.mappers.ColonneMapper;
import com.repositories.ColonneRepository;
import com.repositories.TableauRepository;
import com.services.ColonneService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link ColonneService}.
 * Orchestre les appels au repository et les conversions via le mapper.
 */
@Service
@RequiredArgsConstructor
public class ColonneServiceImpl implements ColonneService {

    private final ColonneRepository colonneRepository;
    private final TableauRepository tableauRepository;
    private final ColonneMapper colonneMapper;

    /** {@inheritDoc} */
    @Override
    public List<ColonneDTO> getColumnsByTableau(Long tableauId) {
        return colonneRepository.findByTableauIdOrderByNumeroAsc(tableauId)
                .stream()
                .map(colonneMapper::toDTO)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public ColonneDTO getColumnById(Long id) {
        Colonne colonne = colonneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        return colonneMapper.toDTO(colonne);
    }

    /** {@inheritDoc} */
    @Override
    public ColonneDTO createColumn(ColonneDTO dto) {
        if (!tableauRepository.existsById(dto.getTableauId())) {
            throw new RuntimeException("Tableau introuvable : " + dto.getTableauId());
        }
        Colonne colonne = colonneMapper.toEntity(dto);
        Colonne saved = colonneRepository.save(colonne);
        // Recharge depuis la BDD pour récupérer le col_numero assigné par le trigger
        return colonneMapper.toDTO(colonneRepository.findById(saved.getId())
                .orElseThrow(() -> new RuntimeException("Erreur lors de la création de la colonne")));
    }

    /** {@inheritDoc} */
    @Override
    public ColonneDTO updateColumn(Long id, ColonneDTO dto) {
        Colonne colonne = colonneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne introuvable : " + id));
        colonne.setNom(dto.getNom());
        return colonneMapper.toDTO(colonneRepository.save(colonne));
    }

    /** {@inheritDoc} */
    @Override
    public void moveColumn(Long id, int newNum) {
        if (!colonneRepository.existsById(id)) {
            throw new RuntimeException("Colonne introuvable : " + id);
        }
        colonneRepository.moveColonne(id, newNum);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteColumn(Long id) {
        if (!colonneRepository.existsById(id)) {
            throw new RuntimeException("Colonne introuvable : " + id);
        }
        colonneRepository.deleteById(id);
    }
}