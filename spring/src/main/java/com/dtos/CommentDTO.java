package com.dtos;

import com.entities.Comment;
import lombok.Data;
import java.time.Instant;

/**
 * Objet de transfert de données pour l'entité {@link Comment}.
 * Expose les informations d'un commentaire sans les annotations MongoDB.
 *
 * <p>Le champ {@code date} n'est pas fourni à la création — il est
 * défini côté serveur dans la couche service.</p>
 */
@Data
public class CommentDTO {

    /**
     * Identifiant unique du commentaire (ObjectId MongoDB sérialisé en String).
     */
    private String id;

    /**
     * Contenu textuel du commentaire.
     */
    private String content;

    /**
     * Date et heure de création du commentaire.
     * Ignorée à la création, retournée en lecture.
     */
    private Instant date;

    /**
     * Identifiant de la tâche concernée (référence MariaDB).
     */
    private Long tskId;

    /**
     * Identifiant de l'auteur du commentaire (référence MariaDB).
     */
    private Long usrId;
}
