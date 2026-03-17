package com.mappers;

import com.dtos.LogEntryDTO;
import com.entities.LogEntry;
import org.springframework.stereotype.Component;

/**
 * Mapper responsable de la conversion entre l'entité {@link LogEntry}
 * et son DTO {@link LogEntryDTO}.
 *
 * <p>Les conversions sont effectuées manuellement (sans MapStruct) afin de
 * contrôler précisément l'extraction des identifiants des relations JPA
 * optionnelles : {@code author}, {@code task} et {@code board} peuvent
 * être {@code null} si les entités référencées ont été supprimées.</p>
 *
 * <p>La méthode {@link #toEntity} n'est pas fournie : le journal est
 * strictement en lecture depuis l'application (les entrées sont créées
 * par les triggers SQL). Elle n'aurait donc aucun usage légitime.</p>
 */
@Component
public class LogEntryMapper {

    /**
     * Convertit une entité {@link LogEntry} en {@link LogEntryDTO}.
     *
     * <p>Les identifiants des relations optionnelles sont extraits avec
     * une vérification de nullité explicite pour {@code author}, {@code task}
     * et {@code board}, dont les clés étrangères sont déclarées
     * {@code ON DELETE SET NULL} en base.</p>
     *
     * @param log l'entité à convertir, ne doit pas être {@code null}
     * @return le DTO correspondant avec tous les champs renseignés
     */
    public LogEntryDTO toDTO(LogEntry log) {
        return new LogEntryDTO(
                log.getId(),
                log.getType(),
                log.getDate(),
                log.getDescription(),
                log.getAuthor() != null ? log.getAuthor().getId()  : null,
                log.getTask()   != null ? log.getTask().getId()    : null,
                log.getBoard()  != null ? log.getBoard().getId()   : null
        );
    }
}
