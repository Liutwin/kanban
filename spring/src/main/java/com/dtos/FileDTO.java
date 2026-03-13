package com.dtos;

import com.entities.File;
import lombok.Data;

/**
 * Objet de transfert de données pour l'entité {@link File}.
 * Expose les métadonnées d'une pièce jointe sans les annotations MongoDB.
 *
 * <p>Le champ {@code comId} est sérialisé en {@link String} pour l'API REST
 * afin d'éviter d'exposer le type {@code ObjectId} de MongoDB au client.</p>
 */
@Data
public class FileDTO {

    /**
     * Identifiant unique du document (ObjectId MongoDB sérialisé en String).
     */
    private String id;

    /**
     * Nom original du fichier.
     */
    private String name;

    /**
     * Type MIME du fichier (ex. {@code application/pdf}, {@code image/png}).
     */
    private String type;

    /**
     * Chemin de stockage du fichier sur le serveur.
     */
    private String way;

    /**
     * Identifiant du commentaire associé, sérialisé en String depuis ObjectId.
     * Null si la pièce jointe est attachée directement à la tâche.
     */
    private String comId;

    /**
     * Identifiant de la tâche concernée (référence MariaDB).
     */
    private Long tskId;

    /**
     * Identifiant de l'utilisateur ayant déposé le fichier (référence MariaDB).
     */
    private Long usrId;
}
