package com.services.impl;

import com.entities.Board;
import com.entities.BoardColumn;
import com.entities.Task;
import com.entities.User;
import com.exceptions.ForbiddenException;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.repositories.BoardColumnRepository;
import com.repositories.BoardMemberRepository;
import com.repositories.BoardRepository;
import com.repositories.TaskRepository;
import com.services.BoardExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.lowagie.text.pdf.draw.LineSeparator;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Génère un export PDF d'un tableau Kanban via OpenPDF.
 *
 * <p>Structure du document :</p>
 * <ul>
 *   <li>En-tête : nom du tableau, date d'export, statistiques globales</li>
 *   <li>Une section par colonne (dans l'ordre {@code col_numero})</li>
 *   <li>Dans chaque colonne : chaque tâche avec titre, priorité, date limite,
 *       assigné, et statut de validation</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class BoardExportServiceImpl implements BoardExportService {

    // -------------------------------------------------------------------------
    // Dépendances
    // -------------------------------------------------------------------------

    private final BoardRepository        boardRepository;
    private final BoardColumnRepository  boardColumnRepository;
    private final TaskRepository         taskRepository;
    private final BoardMemberRepository  boardMemberRepository;

    // -------------------------------------------------------------------------
    // Constantes visuelles
    // -------------------------------------------------------------------------

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    // Palette de couleurs
    private static final Color COLOR_HEADER_BG   = new Color(0x1E, 0x40, 0x6E); // bleu foncé
    private static final Color COLOR_COL_BG      = new Color(0xF1, 0xF5, 0xF9); // gris clair
    private static final Color COLOR_COL_BORDER  = new Color(0xCB, 0xD5, 0xE1);
    private static final Color COLOR_HAUTE       = new Color(0x99, 0x3C, 0x1D); // rouge brique
    private static final Color COLOR_HAUTE_BG    = new Color(0xFA, 0xEC, 0xE7);
    private static final Color COLOR_MOYENNE     = new Color(0x85, 0x4F, 0x0B); // ambre
    private static final Color COLOR_MOYENNE_BG  = new Color(0xFA, 0xEE, 0xDA);
    private static final Color COLOR_BASSE       = new Color(0x3B, 0x6D, 0x11); // vert
    private static final Color COLOR_BASSE_BG    = new Color(0xEA, 0xF3, 0xDE);
    private static final Color COLOR_VALID_BG    = new Color(0xEA, 0xF3, 0xDE);
    private static final Color COLOR_VALID_TEXT  = new Color(0x3B, 0x6D, 0x11);
    private static final Color COLOR_TEXT_MUTED  = new Color(0x6B, 0x72, 0x80);
    private static final Color COLOR_WHITE       = Color.WHITE;

    // Polices
    private static final Font FONT_TITLE   = new Font(Font.HELVETICA, 20, Font.BOLD,   COLOR_WHITE);
    private static final Font FONT_SUBTITLE= new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(0xBF, 0xDB, 0xF7));
    private static final Font FONT_STATS   = new Font(Font.HELVETICA,  9, Font.NORMAL, COLOR_TEXT_MUTED);
    private static final Font FONT_COL_HDR = new Font(Font.HELVETICA, 11, Font.BOLD,   new Color(0x1E, 0x3A, 0x5F));
    private static final Font FONT_TASK    = new Font(Font.HELVETICA, 10, Font.BOLD,   new Color(0x11, 0x18, 0x27));
    private static final Font FONT_TASK_ST = new Font(Font.HELVETICA, 10, Font.STRIKETHRU, COLOR_TEXT_MUTED);
    private static final Font FONT_META    = new Font(Font.HELVETICA,  8, Font.NORMAL, COLOR_TEXT_MUTED);

    // -------------------------------------------------------------------------
    // Point d'entrée
    // -------------------------------------------------------------------------

    @Override
    public byte[] exportBoardToPdf(Long boardId, Long requesterId) {

        // 1. Charge et vérifie l'accès
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Tableau introuvable : " + boardId));
        checkMembership(board, requesterId);

        // 2. Charge les colonnes et calcule les stats
        List<BoardColumn> columns = boardColumnRepository
                .findByBoardIdOrderByNumeroAsc(boardId);

        long totalTasks     = columns.stream()
                .mapToLong(c -> taskRepository.findByBoardColumnIdOrderByPosition(c.getId()).size())
                .sum();
        long validatedTasks = columns.stream()
                .flatMap(c -> taskRepository.findByBoardColumnIdOrderByPosition(c.getId()).stream())
                .filter(Task::isValidated)
                .count();
        long memberCount = boardMemberRepository.findByBoardId(boardId).size()
                + 1; // +1 pour le créateur

        // 3. Génère le PDF
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Document doc = new Document(PageSize.A4.rotate(), 28, 28, 28, 28);
            PdfWriter.getInstance(doc, out);
            doc.open();

            addHeader(doc, board, columns.size(), totalTasks, validatedTasks, memberCount);
            addColumns(doc, columns);
            addFooter(doc, board);

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du PDF", e);
        }
    }

    // -------------------------------------------------------------------------
    // Sections du document
    // -------------------------------------------------------------------------

    /**
     * En-tête : nom du tableau, date d'export, statistiques en une ligne.
     */
    private void addHeader(Document doc, Board board,
                           int colCount, long taskCount, long validatedCount,
                           long memberCount) throws DocumentException {

        // Bandeau de titre (fond bleu foncé)
        PdfPTable banner = new PdfPTable(1);
        banner.setWidthPercentage(100);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBackgroundColor(COLOR_HEADER_BG);
        titleCell.setPadding(14);
        titleCell.setBorder(Rectangle.NO_BORDER);

        Paragraph titlePara = new Paragraph(board.getName(), FONT_TITLE);
        titlePara.setSpacingAfter(3);
        titleCell.addElement(titlePara);

        String exportDate = LocalDateTime.now().format(DATETIME_FMT);
        String creatorName = board.getCreator().getFirstName() + " " + board.getCreator().getLastName();
        titleCell.addElement(new Paragraph(
                "Export Kanban  •  " + exportDate + "  •  Créé par " + creatorName,
                FONT_SUBTITLE));

        banner.addCell(titleCell);
        doc.add(banner);
        doc.add(Chunk.NEWLINE);

        // Ligne de stats
        PdfPTable stats = new PdfPTable(4);
        stats.setWidthPercentage(100);
        stats.setSpacingAfter(10);

        addStatCell(stats, String.valueOf(colCount),      "colonnes");
        addStatCell(stats, String.valueOf(taskCount),     "tâches");
        addStatCell(stats, String.valueOf(memberCount),   "membres");
        addStatCell(stats, validatedCount + " / " + taskCount, "validées");

        doc.add(stats);
    }

    /**
     * Corps : une section par colonne avec ses tâches.
     */
    private void addColumns(Document doc, List<BoardColumn> columns) throws DocumentException {

        int n = columns.size();
        if (n == 0) return;

        // Grille à N colonnes égales
        PdfPTable grid = new PdfPTable(n);
        grid.setWidthPercentage(100);
        grid.setSpacingAfter(14);

        for (BoardColumn col : columns) {
            List<Task> tasks = taskRepository.findByBoardColumnIdOrderByPosition(col.getId());
            grid.addCell(buildColumnCell(col, tasks));
        }

        doc.add(grid);
    }

    /**
     * Pied de page discret.
     */
    private void addFooter(Document doc, Board board) throws DocumentException {
        Paragraph footer = new Paragraph(
                "Kanban SI-SOR 2026  —  tableau #" + board.getId(),
                new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(0xAA, 0xAA, 0xAA)));
        footer.setAlignment(Element.ALIGN_RIGHT);
        doc.add(footer);
    }

    // -------------------------------------------------------------------------
    // Construction des cellules
    // -------------------------------------------------------------------------

    /**
     * Cellule représentant une colonne Kanban complète.
     */
    private PdfPCell buildColumnCell(BoardColumn col, List<Task> tasks) {

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(COLOR_COL_BG);
        cell.setBorderColor(COLOR_COL_BORDER);
        cell.setBorderWidth(0.5f);
        cell.setPadding(6);

        // En-tête de colonne
        Paragraph header = new Paragraph(
                col.getName() + "  (" + tasks.size() + ")", FONT_COL_HDR);
        header.setSpacingAfter(6);
        cell.addElement(header);

        // Séparateur
        LineSeparator sep = new LineSeparator(0.5f, 100, COLOR_COL_BORDER,
                Element.ALIGN_CENTER, -2);
        cell.addElement(new Chunk(sep));

        // Tâches
        for (Task task : tasks) {
            cell.addElement(buildTaskTable(task));
        }

        return cell;
    }

    /**
     * Mini-tableau représentant une tâche (fond blanc, bord fin).
     */
    private PdfPTable buildTaskTable(Task task) {

        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        t.setSpacingBefore(5);

        PdfPCell c = new PdfPCell();
        c.setBackgroundColor(COLOR_WHITE);
        c.setBorderColor(COLOR_COL_BORDER);
        c.setBorderWidth(0.5f);
        c.setPadding(6);

        // Titre (barré si validée)
        Font titleFont = task.isValidated() ? FONT_TASK_ST : FONT_TASK;
        c.addElement(new Paragraph(task.getTitle(), titleFont));

        // Badges priorité + validée sur une ligne
        PdfPTable badges = new PdfPTable(task.isValidated() ? 2 : 1);
        badges.setWidthPercentage(100);
        badges.setSpacingBefore(3);
        badges.setSpacingAfter(3);

        badges.addCell(buildPriorityBadge(task.getPriority()));
        if (task.isValidated()) {
            badges.addCell(buildValidatedBadge());
        }
        c.addElement(badges);

        // Métadonnées
        if (task.getAssigned() != null) {
            User u = task.getAssigned();
            c.addElement(new Paragraph(
                    "Assigné : " + u.getFirstName() + " " + u.getLastName(), FONT_META));
        }
        if (task.getDueDate() != null) {
            c.addElement(new Paragraph(
                    "Limite : " + task.getDueDate().format(DATE_FMT), FONT_META));
        }

        t.addCell(c);
        return t;
    }

    /**
     * Badge coloré pour le niveau de priorité.
     */
    private PdfPCell buildPriorityBadge(Task.Priority priority) {
        Color bg, fg;
        String label;
        switch (priority) {
            case HIGH   -> { bg = COLOR_HAUTE_BG;   fg = COLOR_HAUTE;   label = "haute";   }
            case LOW    -> { bg = COLOR_BASSE_BG;   fg = COLOR_BASSE;   label = "basse";   }
            default     -> { bg = COLOR_MOYENNE_BG; fg = COLOR_MOYENNE; label = "moyenne"; }
        }
        Font f = new Font(Font.HELVETICA, 8, Font.BOLD, fg);
        PdfPCell cell = new PdfPCell(new Phrase(label, f));
        cell.setBackgroundColor(bg);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPaddingTop(2);
        cell.setPaddingBottom(2);
        cell.setPaddingLeft(4);
        cell.setPaddingRight(4);
        return cell;
    }

    /**
     * Badge vert "✓ validée".
     */
    private PdfPCell buildValidatedBadge() {
        Font f = new Font(Font.HELVETICA, 8, Font.BOLD, COLOR_VALID_TEXT);
        PdfPCell cell = new PdfPCell(new Phrase("✓ validée", f));
        cell.setBackgroundColor(COLOR_VALID_BG);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPaddingTop(2);
        cell.setPaddingBottom(2);
        cell.setPaddingLeft(4);
        cell.setPaddingRight(4);
        return cell;
    }

    /**
     * Cellule de statistique (chiffre + libellé).
     */
    private void addStatCell(PdfPTable table, String value, String label) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(COLOR_COL_BORDER);
        cell.setBorderWidth(0.5f);
        cell.setPadding(8);
        cell.setBackgroundColor(new Color(0xF8, 0xFA, 0xFC));

        Font valFont = new Font(Font.HELVETICA, 16, Font.BOLD, COLOR_HEADER_BG);
        Paragraph p = new Paragraph(value, valFont);
        p.setSpacingAfter(2);
        cell.addElement(p);
        cell.addElement(new Paragraph(label, FONT_STATS));

        table.addCell(cell);
    }

    // -------------------------------------------------------------------------
    // Vérification des droits (identique à BoardServiceImpl)
    // -------------------------------------------------------------------------

    private void checkMembership(Board board, Long requesterId) {
        boolean isCreator = board.getCreator().getId().equals(requesterId);
        boolean isMember  = boardMemberRepository.existsByUserIdAndBoardId(requesterId, board.getId());
        if (!isCreator && !isMember) {
            throw new ForbiddenException("Accès interdit au tableau : " + board.getId());
        }
    }
}