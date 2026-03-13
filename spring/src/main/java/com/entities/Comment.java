package com.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

/**
 * Document MongoDB représentant un commentaire posté sur une tâche.
 * Stocké dans la collection {@code commentaire_com} en base MongoDB.
 *
 * <p>Les champs {@code tskId} et {@code usrId} sont des références logiques
 * vers les tables {@code tache_tsk} et {@code utilisateur_usr} de MariaDB.
 * Leur cohérence est garantie par la couche service avant toute insertion.</p>
 */
@Document(collection = "commentaire_com")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Comment {

    /**
     * Identifiant unique du commentaire, généré par MongoDB (ObjectId).
     */
    @Id
    private String id;

    /**
     * Contenu textuel du commentaire.
     */
    @Field("com_contenu")
    private String content;

    /**
     * Date et heure de création du commentaire.
     * Définie côté serveur lors de l'insertion, jamais fournie par le client.
     */
    @Field("com_date")
    private Instant date;

    /**
     * Référence logique vers {@code tache_tsk.tsk_id} dans MariaDB.
     * Identifie la tâche à laquelle appartient ce commentaire.
     */
    @Field("tsk_id")
    private Long tskId;

    /**
     * Référence logique vers {@code utilisateur_usr.usr_id} dans MariaDB.
     * Identifie l'auteur du commentaire.
     */
    @Field("usr_id")
    private Long usrId;
}
