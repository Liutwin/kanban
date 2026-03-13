package com.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Document MongoDB représentant une pièce jointe associée à une tâche.
 * Stocké dans la collection {@code document_doc} en base MongoDB.
 *
 * <p>Un fichier peut être lié optionnellement à un {@link Comment} via {@code comId}.
 * Les champs {@code tskId} et {@code usrId} sont des références logiques
 * vers les tables {@code tache_tsk} et {@code utilisateur_usr} de MariaDB.
 * Leur cohérence est garantie par la couche service avant toute insertion.</p>
 */
@Document(collection = "document_doc")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class File {

    /**
     * Identifiant unique du document, généré par MongoDB (ObjectId).
     */
    @Id
    private String id;

    /**
     * Nom original du fichier tel que déposé par l'utilisateur.
     */
    @Field("doc_nom")
    private String name;

    /**
     * Type MIME du fichier (ex. {@code application/pdf}, {@code image/png}).
     */
    @Field("doc_type")
    private String type;

    /**
     * Chemin de stockage du fichier sur le serveur.
     */
    @Field("doc_chemin")
    private String way;

    /**
     * Référence optionnelle vers l'identifiant d'un {@link Comment}.
     * Null si la pièce jointe est attachée directement à la tâche
     * sans être liée à un commentaire particulier.
     */
    @Field("com_id")
    private ObjectId comId;

    /**
     * Référence logique vers {@code tache_tsk.tsk_id} dans MariaDB.
     * Identifie la tâche à laquelle appartient ce document.
     */
    @Field("tsk_id")
    private Long tskId;

    /**
     * Référence logique vers {@code utilisateur_usr.usr_id} dans MariaDB.
     * Identifie l'utilisateur ayant déposé ce document.
     */
    @Field("usr_id")
    private Long usrId;
}
