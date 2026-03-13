package com.mappers;

import com.dtos.FileDTO;
import com.entities.File;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link File}
 * et son DTO {@link FileDTO}.
 */
@Component
public class FileMapper {

    /**
     * Convertit une entité {@link File} en {@link FileDTO}.
     * Le champ {@code comId} (ObjectId) est sérialisé en String pour l'API.
     *
     * @param file l'entité à convertir
     * @return le DTO correspondant
     */
    public FileDTO toDTO(File file) {
        FileDTO dto = new FileDTO();
        dto.setId(file.getId());
        dto.setName(file.getName());
        dto.setType(file.getType());
        dto.setWay(file.getWay());
        dto.setComId(file.getComId() != null ? file.getComId().toHexString() : null);
        dto.setTskId(file.getTskId());
        dto.setUsrId(file.getUsrId());
        return dto;
    }

    /**
     * Convertit un {@link FileDTO} en entité {@link File}.
     * Le champ {@code comId} est désérialisé depuis String vers ObjectId.
     *
     * @param dto le DTO à convertir
     * @return l'entité correspondante
     */
    public File toEntity(FileDTO dto) {
        File file = new File();
        file.setName(dto.getName());
        file.setType(dto.getType());
        file.setWay(dto.getWay());
        file.setComId(dto.getComId() != null ? new ObjectId(dto.getComId()) : null);
        file.setTskId(dto.getTskId());
        file.setUsrId(dto.getUsrId());
        return file;
    }
}
