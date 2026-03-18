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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link FileService}.
 * Orchestre les appels à {@link FileRepository} et les conversions via {@link FileMapper}.
 * Gère à la fois le stockage physique des fichiers sur disque et leurs métadonnées dans MongoDB.
 * Vérifie la cohérence avec MariaDB avant toute insertion.
 */
@Service
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private final FileRepository fileRepository;
    private final FileMapper     fileMapper;
    private final TaskRepository taskRepository;   // vérif cohérence MariaDB
    private final UserRepository userRepository;   // vérif cohérence MariaDB

    @SuppressWarnings("unused")
    @Value("${app.upload.dir}")
    private String uploadDir;

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
    public FileDTO uploadFile(MultipartFile multipartFile, Long tskId, Long usrId, String comId) {
        if (!taskRepository.existsById(tskId))
            throw new RuntimeException("Tâche introuvable : " + tskId);
        if (!userRepository.existsById(usrId))
            throw new RuntimeException("Utilisateur introuvable : " + usrId);

        try {
            // Crée le dossier de destination si nécessaire
            Path dir = Paths.get(uploadDir, "tsk" + tskId);
            Files.createDirectories(dir);

            // Sauvegarde d'abord les métadonnées sans le chemin pour obtenir l'_id MongoDB
            FileDTO dtoWithoutWay = new FileDTO();
            dtoWithoutWay.setName(multipartFile.getOriginalFilename());
            dtoWithoutWay.setType(multipartFile.getContentType());
            dtoWithoutWay.setWay("");
            dtoWithoutWay.setTskId(tskId);
            dtoWithoutWay.setUsrId(usrId);
            dtoWithoutWay.setComId(comId);

            File savedEntity = fileRepository.save(fileMapper.toEntity(dtoWithoutWay));

            // Nom de fichier déterministe : id MongoDB + extension originale
            String original = multipartFile.getOriginalFilename();
            String ext      = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf(".")).toLowerCase()
                    : "";
            String filename    = savedEntity.getId() + ext;
            Path   destination = dir.resolve(filename);
            multipartFile.transferTo(destination);

            // Met à jour le chemin dans MongoDB
            savedEntity.setWay(destination.toString());
            return fileMapper.toDTO(fileRepository.save(savedEntity));

        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de l'enregistrement du fichier", e);
        }
    }

    /** {@inheritDoc} */
    @Override
    public Resource downloadFile(String id) {
        File file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fichier introuvable : " + id));
        try {
            Path     path     = Paths.get(file.getWay());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable())
                throw new RuntimeException("Fichier illisible sur le disque : " + file.getWay());
            return resource;
        } catch (MalformedURLException e) {
            throw new RuntimeException("Chemin de fichier invalide : " + file.getWay(), e);
        }
    }

    /** {@inheritDoc} */
    @Override
    public void deleteFile(String id) {
        File file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fichier introuvable : " + id));

        // Supprime le fichier physique si présent sur le disque
        try {
            Path path = Paths.get(file.getWay());
            Files.deleteIfExists(path);
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la suppression du fichier physique", e);
        }

        fileRepository.deleteById(id);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteByTache(Long tskId) {
        // Supprime les fichiers physiques avant les métadonnées
        fileRepository.findByTskId(tskId).forEach(file -> {
            try {
                Files.deleteIfExists(Paths.get(file.getWay()));
            } catch (IOException e) {
                throw new RuntimeException("Erreur lors de la suppression du fichier physique", e);
            }
        });
        fileRepository.deleteByTskId(tskId);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteByComment(String comId) {
        ObjectId oid = new ObjectId(comId);
        fileRepository.findByComId(oid).forEach(file -> {
            try {
                Files.deleteIfExists(Paths.get(file.getWay()));
            } catch (IOException e) {
                throw new RuntimeException("Erreur lors de la suppression du fichier physique", e);
            }
        });
        fileRepository.deleteByComId(oid);
    }
}