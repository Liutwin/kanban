package com.services;

import com.dtos.LogEntryDTO;
import com.entities.LogEntry;
import com.exceptions.ForbiddenException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Interface du service métier pour la consultation du journal d'activité.
 * Définit le contrat des opérations de lecture disponibles sur les entrées
 * de log, stockées dans la table {@code journal_log} en MariaDB.
 *
 * <p>Le journal est en lecture seule : les entrées sont créées automatiquement
 * par les triggers SQL ({@code after_insert_tache}, {@code after_update_tache})
 * et ne doivent jamais être créées, modifiées ni supprimées via l'API.</p>
 *
 * <p>Trois points de lecture sont exposés, correspondant aux trois axes de
 * filtrage naturels de la table :</p>
 * <ul>
 *   <li>par <strong>tableau</strong> — historique complet d'un tableau ;</li>
 *   <li>par <strong>tâche</strong> — cycle de vie d'une tâche précise ;</li>
 *   <li>par <strong>auteur</strong> — activité d'un utilisateur.</li>
 * </ul>
 *
 * <p>Chaque méthode accepte des filtres optionnels sur le type d'action
 * ({@link LogEntry.LogType}) et sur une plage de dates. Un paramètre
 * {@code null} est silencieusement ignoré.</p>
 *
 * <p>Le contrôle d'accès suit la règle : <em>membre du tableau OU
 * administrateur global</em>. Un utilisateur non membre d'un tableau
 * ne peut pas consulter ses logs, sauf s'il possède le flag
 * {@code usr_admin = true}. La consultation des logs d'un utilisateur
 * tiers est réservée aux administrateurs.</p>
 */
public interface LogEntryService {

    /**
     * Récupère les entrées de journal d'un tableau, avec filtres optionnels.
     *
     * <p>Retourne les logs dont la FK {@code tab_id} pointe vers le tableau
     * demandé, triés par date décroissante (entrée la plus récente en premier).
     * Les logs orphelins (FK nulle suite à une suppression) ne sont pas inclus.</p>
     *
     * @param boardId     l'identifiant du tableau
     * @param type        type d'action à filtrer ; {@code null} pour ignorer
     * @param from        borne inférieure de la plage de dates (inclusive) ;
     *                    {@code null} pour ignorer
     * @param to          borne supérieure de la plage de dates (inclusive) ;
     *                    {@code null} pour ignorer
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link LogEntryDTO} triée par date décroissante
     * @throws RuntimeException   si le tableau n'est pas trouvé
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     *                            et n'est pas administrateur global
     */
    List<LogEntryDTO> getLogsByBoard(
            Long boardId,
            LogEntry.LogType type,
            LocalDateTime from,
            LocalDateTime to,
            Long requesterId
    );

    /**
     * Récupère les entrées de journal d'une tâche, avec filtres optionnels.
     *
     * <p>Retourne les logs dont la FK {@code tsk_id} pointe vers la tâche
     * demandée, triés par date décroissante. L'accès est accordé si le
     * requérant est membre du tableau contenant la tâche, ou administrateur
     * global.</p>
     *
     * @param taskId      l'identifiant de la tâche
     * @param type        type d'action à filtrer ; {@code null} pour ignorer
     * @param from        borne inférieure de la plage de dates (inclusive) ;
     *                    {@code null} pour ignorer
     * @param to          borne supérieure de la plage de dates (inclusive) ;
     *                    {@code null} pour ignorer
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link LogEntryDTO} triée par date décroissante
     * @throws RuntimeException   si la tâche n'est pas trouvée
     * @throws ForbiddenException si le requérant n'est pas membre du tableau
     *                            et n'est pas administrateur global
     */
    List<LogEntryDTO> getLogsByTask(
            Long taskId,
            LogEntry.LogType type,
            LocalDateTime from,
            LocalDateTime to,
            Long requesterId
    );

    /**
     * Récupère les entrées de journal dont l'auteur est l'utilisateur
     * cible, avec filtres optionnels.
     *
     * <p>Retourne les logs dont la FK {@code usr_auteur} pointe vers
     * l'utilisateur demandé, triés par date décroissante. Cette route est
     * réservée aux administrateurs globaux ({@code usr_admin = true}) ou
     * à l'utilisateur consultant ses propres logs ({@code requesterId == userId}).
     * </p>
     *
     * @param userId      l'identifiant de l'utilisateur cible
     * @param type        type d'action à filtrer ; {@code null} pour ignorer
     * @param from        borne inférieure de la plage de dates (inclusive) ;
     *                    {@code null} pour ignorer
     * @param to          borne supérieure de la plage de dates (inclusive) ;
     *                    {@code null} pour ignorer
     * @param requesterId l'identifiant de l'utilisateur faisant la demande
     * @return liste de {@link LogEntryDTO} triée par date décroissante
     * @throws RuntimeException   si l'utilisateur cible n'est pas trouvé
     * @throws ForbiddenException si le requérant n'est ni administrateur global
     *                            ni l'utilisateur cible lui-même
     */
    List<LogEntryDTO> getLogsByUser(
            Long userId,
            LogEntry.LogType type,
            LocalDateTime from,
            LocalDateTime to,
            Long requesterId
    );
}
