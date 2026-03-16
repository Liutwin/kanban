package com.services;

import com.dtos.FileDTO;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

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
    List<FileDTO> getFilesByTask(Long tskId);

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
     * Sauvegarde le fichier physique sur le disque et enregistre ses métadonnées dans MongoDB.
     * Les champs {@code tskId} et {@code usrId} sont vérifiés en cohérence avec MariaDB.
     *
     * @param multipartFile le fichier uploadé
     * @param tskId         l'identifiant de la tâche (référence MariaDB)
     * @param usrId         l'identifiant de l'utilisateur (référence MariaDB)
     * @param comId         l'identifiant du commentaire associé (optionnel, ObjectId en String)
     * @return le {@link FileDTO} créé avec son identifiant généré
     * @throws RuntimeException si la tâche ou l'utilisateur n'existe pas en MariaDB
     */
    FileDTO uploadFile(MultipartFile multipartFile, Long tskId, Long usrId, String comId);

    /**
     * Retourne le fichier physique sous forme de {@link Resource} pour le téléchargement.
     *
     * @param id l'identifiant du fichier (ObjectId en String)
     * @return la ressource lisible
     * @throws RuntimeException si le fichier est introuvable ou illisible sur le disque
     */
    Resource downloadFile(String id);

    /**
     * Supprime un fichier par son identifiant (métadonnées MongoDB + fichier physique).
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