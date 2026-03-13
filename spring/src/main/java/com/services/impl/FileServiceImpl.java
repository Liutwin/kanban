package com.services.impl;

import com.dtos.FileDTO;
import com.entities.File;
import com.mappers.FileMapper;
import com.repositories.FileRepository;
import com.repositories.TaskRepository;
import com.repositories.UserRepository;
import com.services.FileService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link FileService}.
 * Orchestre les appels à {@link FileRepository} et les conversions via {@link FileMapper}.
 * Vérifie la cohérence avec MariaDB avant toute insertion.
 */
@Service
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private final FileRepository fileRepository;
    private final FileMapper fileMapper;
    private final TaskRepository taskRepository;   // vérif cohérence MariaDB
    private final UserRepository userRepository;   // vérif cohérence MariaDB

    /** {@inheritDoc} */
    @Override
    public List<FileDTO> getFilesByTask(Long tskId) {
        return fileRepository.findByTskId(tskId)
                .stream().map(fileMapper::toDTO).collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<FileDTO> getFilesByComment(String comId) {
        return fileRepository.findByComId(new ObjectId(comId))
                .stream().map(fileMapper::toDTO).collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public FileDTO getFileById(String id) {
        File file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fichier introuvable : " + id));
        return fileMapper.toDTO(file);
    }

    /** {@inheritDoc} */
    @Override
    public FileDTO addFile(FileDTO dto) {
        // Vérification de cohérence inter-bases
        if (!taskRepository.existsById(dto.getTskId()))
            throw new RuntimeException("Tâche introuvable : " + dto.getTskId());
        if (!userRepository.existsById(dto.getUsrId()))
            throw new RuntimeException("Utilisateur introuvable : " + dto.getUsrId());

        return fileMapper.toDTO(fileRepository.save(fileMapper.toEntity(dto)));
    }

    /** {@inheritDoc} */
    @Override
    public void deleteFile(String id) {
        if (!fileRepository.existsById(id))
            throw new RuntimeException("Fichier introuvable : " + id);
        fileRepository.deleteById(id);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteByTache(Long tskId) {
        fileRepository.deleteByTskId(tskId);
    }
}
