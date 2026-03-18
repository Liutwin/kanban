package com.services;

/**
 * Service d'export d'un tableau Kanban au format PDF.
 */
public interface BoardExportService {

    /**
     * Génère un PDF représentant l'état courant d'un tableau Kanban.
     *
     * @param boardId     identifiant du tableau à exporter
     * @param requesterId identifiant de l'utilisateur qui demande l'export
     *                    (doit être membre du tableau)
     * @return les octets du PDF généré
     */
    byte[] exportBoardToPdf(Long boardId, Long requesterId);
}
