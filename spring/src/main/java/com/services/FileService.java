package com.services;

import com.dtos.FileDTO;
import java.util.List;

/**
 * Interface du service métier pour la gestion des pièces jointes.
 * Définit le contrat des opérations disponibles sur les fichiers,
 * stockés dans MongoDB (collection {@code document_doc}).
 */
public interface FileService {

    /**
     * Récupère toutes les pièces jointes d'une tâche.
     *
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     * @return liste de {@link FileDTO}
     */
    List<FileDTO> getFilesByTache(Long tskId);

    /**
     * Récupère toutes les pièces jointes liées à un commentaire.
     *
     * @param comId l'identifiant du commentaire (ObjectId en String)
     * @return liste de {@link FileDTO}
     */
    List<FileDTO> getFilesByComment(String comId);

    /**
     * Récupère un fichier par son identifiant MongoDB.
     *
     * @param id l'identifiant du fichier (ObjectId en String)
     * @return le {@link FileDTO} correspondant
     * @throws RuntimeException si le fichier n'est pas trouvé
     */
    FileDTO getFileById(String id);

    /**
     * Enregistre les métadonnées d'un fichier déposé sur une tâche.
     * Les champs {@code tskId} et {@code usrId} sont vérifiés en cohérence
     * avec MariaDB avant l'insertion.
     *
     * @param dto les métadonnées du fichier ({@code tskId} et {@code usrId} obligatoires)
     * @return le {@link FileDTO} créé avec son identifiant généré
     * @throws RuntimeException si la tâche ou l'utilisateur n'existe pas en MariaDB
     */
    FileDTO addFile(FileDTO dto);

    /**
     * Supprime un fichier par son identifiant.
     *
     * @param id l'identifiant du fichier à supprimer
     * @throws RuntimeException si le fichier n'est pas trouvé
     */
    void deleteFile(String id);

    /**
     * Supprime toutes les pièces jointes associées à une tâche.
     * Appelé lors de la suppression d'une tâche côté MariaDB
     * pour maintenir la cohérence inter-bases.
     *
     * @param tskId l'identifiant de la tâche (référence MariaDB)
     */
    void deleteByTache(Long tskId);
}
