-- ============================================
-- Suppression des triggers
-- ============================================

DROP TRIGGER IF EXISTS after_insert_tableau;
DROP TRIGGER IF EXISTS after_insert_tache;
DROP TRIGGER IF EXISTS after_update_tache;
DROP TRIGGER IF EXISTS before_insert_colonne;
DROP TRIGGER IF EXISTS after_delete_colonne;
DROP TRIGGER IF EXISTS before_delete_colonne;
DROP TRIGGER IF EXISTS before_update_colonne;

-- ============================================
-- Suppression des procédures
-- ============================================

DROP PROCEDURE IF EXISTS deplacer_tache;
DROP PROCEDURE IF EXISTS deplacer_colonne;

-- ============================================
-- Suppression des tables (ordre inverse des FK)
-- ============================================

DROP TABLE IF EXISTS reset_token_rtk;
DROP TABLE IF EXISTS journal_log;
DROP TABLE IF EXISTS tache_tsk;
DROP TABLE IF EXISTS colonne_col;
DROP TABLE IF EXISTS participation_ptp;
DROP TABLE IF EXISTS tableau_tab;
DROP TABLE IF EXISTS utilisateur_usr;

-- ============================================
-- Table : utilisateur_usr
-- ============================================
CREATE TABLE utilisateur_usr (
    usr_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
    usr_mail   VARCHAR(50) NOT NULL UNIQUE,
    usr_mdp    VARCHAR(255) NOT NULL,  -- SHA256 = 64 caractères hex -- SHA256 + sel < 255 caractères hex
    usr_nom    VARCHAR(50) NOT NULL,
    usr_prenom VARCHAR(50) NOT NULL,
    usr_avatar VARCHAR(255) DEFAULT NULL,
    usr_admin  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- Table : tableau_tab
-- ============================================
CREATE TABLE tableau_tab (
    tab_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
    tab_nom      VARCHAR(50) NOT NULL,
    usr_createur BIGINT NOT NULL,
    CONSTRAINT fk_tab_createur FOREIGN KEY (usr_createur)
        REFERENCES utilisateur_usr(usr_id)
        ON DELETE CASCADE
);

-- ============================================
-- Table : participation_ptp
-- ============================================
CREATE TABLE participation_ptp (
    ptp_role        ENUM('admin', 'editeur', 'lecteur') NOT NULL DEFAULT 'lecteur',
    ptp_notifiee    BOOLEAN NOT NULL DEFAULT FALSE,
    tab_id          BIGINT NOT NULL,
    usr_participant BIGINT NOT NULL,
    PRIMARY KEY (tab_id, usr_participant),
    CONSTRAINT fk_ptp_tableau FOREIGN KEY (tab_id)
        REFERENCES tableau_tab(tab_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ptp_utilisateur FOREIGN KEY (usr_participant)
        REFERENCES utilisateur_usr(usr_id)
        ON DELETE CASCADE
);

-- ============================================
-- Table : colonne_col
-- ============================================
CREATE TABLE colonne_col (
    col_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
    col_numero INT NOT NULL,
    col_nom    VARCHAR(50) NOT NULL,
    tab_id     BIGINT NOT NULL,
    CONSTRAINT fk_col_tableau FOREIGN KEY (tab_id)
        REFERENCES tableau_tab(tab_id)
        ON DELETE CASCADE
    -- Pas de contrainte UNIQUE sur (tab_id, col_numero) : MariaDB évalue
    -- la contrainte ligne par ligne lors des UPDATE en masse, ce qui viole
    -- l'unicité pendant les décalages de deplacer_colonne, même avec des
    -- valeurs temporaires négatives. L'unicité est garantie par la logique
    -- applicative de la procédure.
);

-- Index ordinaire pour les performances des requêtes ORDER BY col_numero
CREATE INDEX idx_col_numero_tab ON colonne_col (tab_id, col_numero);

-- ============================================
-- Table : tache_tsk
-- ============================================
CREATE TABLE tache_tsk (
    tsk_id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    tsk_titre      VARCHAR(50) NOT NULL,
    tsk_details    VARCHAR(256),
    tsk_datelimite DATETIME,
    tsk_priorite   ENUM('basse', 'moyenne', 'haute') NOT NULL DEFAULT 'moyenne',
    tsk_position   INT NOT NULL DEFAULT 0,
    tsk_validee    BOOLEAN NOT NULL DEFAULT FALSE,
    col_id         BIGINT NOT NULL,
    usr_createur   BIGINT NOT NULL,
    usr_assignee   BIGINT,
    CONSTRAINT fk_tsk_colonne FOREIGN KEY (col_id)
        REFERENCES colonne_col(col_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tsk_createur FOREIGN KEY (usr_createur)
        REFERENCES utilisateur_usr(usr_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tsk_assignee FOREIGN KEY (usr_assignee)
        REFERENCES utilisateur_usr(usr_id)
        ON DELETE SET NULL,
    CONSTRAINT uq_tsk_position_col UNIQUE (col_id, tsk_position)
);

-- ============================================
-- Table : journal_log
-- ============================================
CREATE TABLE journal_log (
    log_id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    log_type        ENUM('creation', 'deplacement', 'modification') NOT NULL,
    log_date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    log_description VARCHAR(256),
    usr_auteur      BIGINT,
    tsk_id          BIGINT,
    tab_id          BIGINT,
    CONSTRAINT fk_log_utilisateur FOREIGN KEY (usr_auteur)
        REFERENCES utilisateur_usr(usr_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_log_tache FOREIGN KEY (tsk_id)
        REFERENCES tache_tsk(tsk_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_log_tableau FOREIGN KEY (tab_id)
        REFERENCES tableau_tab(tab_id)
        ON DELETE SET NULL
);

-- ============================================
-- Table : reset_token_rtk
-- ============================================
CREATE TABLE reset_token_rtk (
    rtk_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    rtk_token   VARCHAR(64) NOT NULL UNIQUE,
    rtk_expiry  DATETIME NOT NULL,
    usr_id      BIGINT NOT NULL,
    CONSTRAINT fk_rtk_usr FOREIGN KEY (usr_id)
        REFERENCES utilisateur_usr(usr_id)
        ON DELETE CASCADE
);

-- ============================================
-- Trigger : participation automatique du créateur
--           en tant qu'admin à la création d'un tableau
-- ============================================

DELIMITER $$

CREATE TRIGGER after_insert_tableau
AFTER INSERT ON tableau_tab
FOR EACH ROW
BEGIN
    INSERT INTO participation_ptp (ptp_role, ptp_notifiee, tab_id, usr_participant)
    VALUES ('admin', '1', NEW.tab_id, NEW.usr_createur);
END$$

DELIMITER ;

-- ============================================================
-- Procédure : deplacer_tache
-- Déplace une tâche vers une nouvelle position, dans la même
-- colonne ou dans une colonne différente.
--
-- Deux cas distincts :
--   • Intra-colonne  (p_col_id_cible = col actuelle) :
--       réordonnancement, même logique que deplacer_colonne.
--   • Inter-colonnes (p_col_id_cible ≠ col actuelle) :
--       1. Referme le trou dans la colonne source (décale vers le bas)
--       2. Ouvre une place dans la colonne cible   (décale vers le haut)
--       3. Insère la tâche à sa nouvelle position
--
-- Le flag @_in_deplacer_tache neutralise after_update_tache
-- pendant les UPDATE de décalage en masse, pour éviter de
-- générer des logs parasites sur les tâches voisines.
-- Le trigger after_update_tache détecte lui-même le déplacement
-- sur la tâche principale et génère le bon log.
-- ============================================================

DELIMITER $$

CREATE PROCEDURE deplacer_tache(
    IN p_tsk_id      BIGINT,  -- tâche à déplacer
    IN p_col_id_cible BIGINT, -- colonne cible (peut être la même)
    IN p_new_pos     INT,     -- position cible (0-based)
    IN p_usr_auteur  BIGINT   -- utilisateur déclenchant l'action (pour le log)
)
proc_label:BEGIN
    DECLARE v_old_pos    INT;
    DECLARE v_old_col_id BIGINT;
    DECLARE v_max_pos    INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET @_in_deplacer_tache = NULL;
        RESIGNAL;
    END;

    -- --------------------------------------------------------
    -- 1. Récupère l'état actuel de la tâche
    -- --------------------------------------------------------
    SELECT tsk_position, col_id
    INTO   v_old_pos, v_old_col_id
    FROM   tache_tsk
    WHERE  tsk_id = p_tsk_id;

    IF v_old_pos IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Tâche introuvable.';
    END IF;

    -- Vérifie que la colonne cible existe
    IF NOT EXISTS (SELECT 1 FROM colonne_col WHERE col_id = p_col_id_cible) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Colonne cible introuvable.';
    END IF;

    IF p_new_pos < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'tsk_position doit être >= 0.';
    END IF;

    -- Borne la position cible au maximum autorisé dans la colonne cible
    IF p_col_id_cible = v_old_col_id THEN
        -- Intra-colonne : le max reste COUNT - 1 (la tâche est déjà comptée)
        SELECT MAX(tsk_position)
        INTO   v_max_pos
        FROM   tache_tsk
        WHERE  col_id = p_col_id_cible;
    ELSE
        -- Inter-colonnes : la colonne cible accueille une tâche de plus
        SELECT COALESCE(MAX(tsk_position) + 1, 0)
        INTO   v_max_pos
        FROM   tache_tsk
        WHERE  col_id = p_col_id_cible;
    END IF;

    IF p_new_pos > v_max_pos THEN
        SET p_new_pos = v_max_pos;
    END IF;

    -- Rien à faire si même colonne et même position
    IF v_old_col_id = p_col_id_cible AND v_old_pos = p_new_pos THEN
        LEAVE proc_label;
    END IF;

    -- Active le flag : supprime les logs parasites sur les tâches voisines
    SET @_in_deplacer_tache = 1;

    -- --------------------------------------------------------
    -- 2a. Déplacement INTRA-colonne
    --     Même technique deux-passes que deplacer_colonne
    --     pour contourner la contrainte UNIQUE (col_id, tsk_position)
    -- --------------------------------------------------------
    IF v_old_col_id = p_col_id_cible THEN

        IF p_new_pos < v_old_pos THEN
            -- Décale vers le bas les tâches entre [p_new_pos, v_old_pos[
            UPDATE tache_tsk
            SET    tsk_position = -(tsk_position + 1)
            WHERE  col_id       = p_col_id_cible
              AND  tsk_position >= p_new_pos
              AND  tsk_position <  v_old_pos
              AND  tsk_id      <> p_tsk_id;
        ELSE
            -- Décale vers le haut les tâches entre ]v_old_pos, p_new_pos]
            UPDATE tache_tsk
            SET    tsk_position = -(tsk_position - 1)
            WHERE  col_id       = p_col_id_cible
              AND  tsk_position >  v_old_pos
              AND  tsk_position <= p_new_pos
              AND  tsk_id      <> p_tsk_id;
        END IF;

        -- Passe 2 : repasse en positif
        UPDATE tache_tsk
        SET    tsk_position = -tsk_position
        WHERE  col_id       = p_col_id_cible
          AND  tsk_position < 0;

        SET @_in_deplacer_tache = NULL;
        -- Place la tâche à sa nouvelleSET @_in_deplacer_tache = NULL position
        -- (déclenche after_update_tache → log 'deplacement')
        UPDATE tache_tsk
        SET    tsk_position  = p_new_pos,
               usr_createur  = p_usr_auteur
        WHERE  tsk_id = p_tsk_id;

    -- --------------------------------------------------------
    -- 2b. Déplacement INTER-colonnes
    -- --------------------------------------------------------
    ELSE

        -- Referme le trou dans la colonne source :
        -- toutes les tâches après v_old_pos reculent d'un cran
        UPDATE tache_tsk
        SET    tsk_position = -(tsk_position - 1)
        WHERE  col_id       = v_old_col_id
          AND  tsk_position >  v_old_pos
          AND  tsk_id      <> p_tsk_id;

        UPDATE tache_tsk
        SET    tsk_position = -tsk_position
        WHERE  col_id       = v_old_col_id
          AND  tsk_position < 0;

        -- Ouvre une place dans la colonne cible :
        -- toutes les tâches à partir de p_new_pos avancent d'un cran
        UPDATE tache_tsk
        SET    tsk_position = -(tsk_position + 1)
        WHERE  col_id       = p_col_id_cible
          AND  tsk_position >= p_new_pos
          AND  tsk_id      <> p_tsk_id;

        UPDATE tache_tsk
        SET    tsk_position = -tsk_position
        WHERE  col_id       = p_col_id_cible
          AND  tsk_position < 0;

        SET @_in_deplacer_tache = NULL;
        -- Déplace la tâche vers sa nouvelle colonne/position
        -- (déclenche after_update_tache → log 'deplacement')
        UPDATE tache_tsk
        SET    col_id        = p_col_id_cible,
               tsk_position  = p_new_pos,
               usr_createur  = p_usr_auteur
        WHERE  tsk_id = p_tsk_id;

    END IF;

    SET @_in_deplacer_tache = NULL;

END$$

DELIMITER ;

-- ============================================
-- Triggers : création et modification de tâche
-- ============================================

DELIMITER $$

-- Auto-incrémentation de tsk_position à l'insertion.
-- Même principe que before_insert_colonne pour col_numero :
-- calcule MAX(tsk_position) + 1 dans la colonne cible,
-- sauf si tsk_position a déjà été fourni manuellement
-- (cas du jeu de données initial avec @_disable_tache_triggers).
CREATE TRIGGER before_insert_tache
BEFORE INSERT ON tache_tsk
FOR EACH ROW
BEGIN
    DECLARE v_max INT;

    IF @_disable_tache_triggers IS NULL THEN
        SELECT COALESCE(MAX(tsk_position), -1) + 1
        INTO v_max
        FROM tache_tsk
        WHERE col_id = NEW.col_id;

        SET NEW.tsk_position = v_max;
    END IF;
END$$

-- Log automatique à la création d'une tâche
CREATE TRIGGER after_insert_tache
AFTER INSERT ON tache_tsk
FOR EACH ROW
BEGIN
    IF @_disable_tache_triggers IS NULL THEN
        INSERT INTO journal_log (log_type, log_date, log_description, usr_auteur, tsk_id, tab_id)
        SELECT
            'creation',
            NOW(),
            CONCAT('Tâche créée : ', NEW.tsk_titre),
            NEW.usr_createur,
            NEW.tsk_id,
            c.tab_id
        FROM colonne_col c
        WHERE c.col_id = NEW.col_id;
    END IF;
END$$

-- Log automatique au changement d'une tâche.
-- Trois cas mutuellement exclusifs (IF / ELSEIF / ELSEIF) pour éviter
-- qu'un déplacement inter-colonnes génère aussi un log de modification :
--   1. col_id change                          → deplacement inter-colonnes
--   2. col_id inchangé, tsk_position change   → réordonnancement intra-colonne
--   3. col_id et tsk_position inchangés,
--      mais d'autres champs changent          → modification
CREATE TRIGGER after_update_tache
AFTER UPDATE ON tache_tsk
FOR EACH ROW
BEGIN
    DECLARE v_tab_id BIGINT;
    -- Bloque entièrement le trigger pendant le jeu de données initial
    -- ET pendant les décalages en masse des tâches voisines dans deplacer_tache.
    -- Le flag est levé juste avant le UPDATE final sur la tâche principale,
    -- ce qui permet au trigger de générer uniquement ce log-là.
    IF @_disable_tache_triggers IS NULL AND @_in_deplacer_tache IS NULL THEN
        SELECT tab_id INTO v_tab_id
        FROM colonne_col
        WHERE col_id = NEW.col_id;
        IF OLD.col_id <> NEW.col_id THEN
            -- Déplacement vers une autre colonne
            INSERT INTO journal_log (log_type, log_date, log_description, usr_auteur, tsk_id, tab_id)
            VALUES (
                'deplacement',
                NOW(),
                CONCAT('Tâche déplacée : ', NEW.tsk_titre),
                NEW.usr_createur,
                NEW.tsk_id,
                v_tab_id
            );
        ELSEIF OLD.tsk_position <> NEW.tsk_position THEN
            -- Réordonnancement dans la même colonne
            INSERT INTO journal_log (log_type, log_date, log_description, usr_auteur, tsk_id, tab_id)
            VALUES (
                'deplacement',
                NOW(),
                CONCAT('Tâche réordonnée : ', NEW.tsk_titre),
                NEW.usr_createur,
                NEW.tsk_id,
                v_tab_id
            );
        ELSEIF OLD.col_id = NEW.col_id
           AND OLD.tsk_position = NEW.tsk_position
           AND (
               OLD.tsk_titre      <> NEW.tsk_titre                OR
               NOT (OLD.tsk_details    <=> NEW.tsk_details)        OR
               NOT (OLD.tsk_datelimite <=> NEW.tsk_datelimite)     OR
               OLD.tsk_priorite   <> NEW.tsk_priorite              OR
               NOT (OLD.usr_assignee   <=> NEW.usr_assignee)
           )
        THEN
            -- Modification sans déplacement
            INSERT INTO journal_log (log_type, log_date, log_description, usr_auteur, tsk_id, tab_id)
            VALUES (
                'modification',
                NOW(),
                CONCAT('Tâche modifiée : ', NEW.tsk_titre),
                NEW.usr_createur,
                NEW.tsk_id,
                v_tab_id
            );
        END IF;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- Trigger : auto-incrémentation de col_numero à l'insertion
-- ============================================

DELIMITER $$

CREATE TRIGGER before_insert_colonne
BEFORE INSERT ON colonne_col
FOR EACH ROW
BEGIN
    DECLARE v_max INT;

    SELECT COALESCE(MAX(col_numero), 0) + 1
    INTO v_max
    FROM colonne_col
    WHERE tab_id = NEW.tab_id;

    SET NEW.col_numero = v_max;
END$$

DELIMITER ;

-- ============================================
-- Renumérotage après suppression d'une colonne
-- Géré côté Spring dans BoardColumnServiceImpl.deleteColumn()
-- via BoardColumnRepository.shiftColumnsAfterDelete()
-- car MariaDB interdit à tout trigger sur colonne_col
-- (BEFORE ou AFTER DELETE) de faire un UPDATE sur colonne_col.
-- ============================================

-- ============================================
-- Procédure : déplacer une colonne vers un nouveau numéro
-- Correction 1 : label explicite pour LEAVE
-- Correction 2 : flag booléen @_in_deplacer_colonne
--                au lieu de @_moving_col (qui ne protégeait
--                pas les UPDATE de décalage en masse)
-- ============================================

DELIMITER $$

CREATE PROCEDURE deplacer_colonne(
    IN p_col_id  BIGINT,
    IN p_new_num INT
)
proc_label:BEGIN
    DECLARE v_old_num INT;
    DECLARE v_tab_id  BIGINT;
    DECLARE v_max_num INT;

    -- Réinitialise le flag et propage l'erreur en cas d'exception
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET @_in_deplacer_colonne = NULL;
        RESIGNAL;
    END;

    -- Récupère la position actuelle et le tableau de la colonne
    SELECT col_numero, tab_id
    INTO v_old_num, v_tab_id
    FROM colonne_col
    WHERE col_id = p_col_id;

    -- Vérifie que la colonne existe
    IF v_old_num IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Colonne introuvable.';
    END IF;

    -- Vérifie que le numéro cible est >= 1
    IF p_new_num < 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'col_numero doit être >= 1.';
    END IF;

    -- Récupère le numéro maximum dans ce tableau
    SELECT MAX(col_numero)
    INTO v_max_num
    FROM colonne_col
    WHERE tab_id = v_tab_id;

    -- Borne le numéro cible au maximum existant
    IF p_new_num > v_max_num THEN
        SET p_new_num = v_max_num;
    END IF;

    -- Rien à faire si même position (LEAVE avec label explicite)
    IF v_old_num = p_new_num THEN
        LEAVE proc_label;
    END IF;

    -- Active le flag : autorise les UPDATE de col_numero dans le trigger
    SET @_in_deplacer_colonne = 1;

    -- MariaDB évalue la contrainte uq_col_numero_tab ligne par ligne lors d'un UPDATE,
    -- même sur un statement multi-lignes. Un décalage direct (+1 ou -1) crée donc des
    -- doublons transitoires qui violent la contrainte avant que toutes les lignes soient
    -- mises à jour.
    -- Solution : passer par des valeurs temporaires négatives (impossibles en production
    -- car col_numero >= 1), puis repasser aux valeurs définitives en deux passes.
    -- Passe 1 : valeurs temporaires négatives pour neutraliser la contrainte
    IF p_new_num < v_old_num THEN
        UPDATE colonne_col
        SET col_numero = -(col_numero + 1)
        WHERE tab_id    = v_tab_id
          AND col_numero >= p_new_num
          AND col_numero <  v_old_num
          AND col_id    <> p_col_id;
    ELSE
        UPDATE colonne_col
        SET col_numero = -(col_numero - 1)
        WHERE tab_id    = v_tab_id
          AND col_numero >  v_old_num
          AND col_numero <= p_new_num
          AND col_id    <> p_col_id;
    END IF;

    -- Passe 2 : repasse les valeurs négatives en positives
    UPDATE colonne_col
    SET col_numero = -col_numero
    WHERE tab_id   = v_tab_id
      AND col_numero < 0;

    -- Place la colonne à sa nouvelle position
    UPDATE colonne_col
    SET col_numero = p_new_num
    WHERE col_id = p_col_id;

    -- Désactive le flag
    SET @_in_deplacer_colonne = NULL;

END$$

DELIMITER ;

-- ============================================
-- Trigger : bloque toute modification directe
--           de col_numero (hors procédure)
-- Correction : utilise @_in_deplacer_colonne (flag booléen)
--              au lieu de @_moving_col (ancien ID unique)
-- ============================================

DELIMITER $$

CREATE TRIGGER before_update_colonne
BEFORE UPDATE ON colonne_col
FOR EACH ROW
BEGIN
    IF @_in_deplacer_colonne IS NULL THEN
        IF NEW.col_numero <> OLD.col_numero THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Utilisez deplacer_colonne(idColonne, numArrivee) pour modifier col_numero.';
        END IF;
    END IF;
END$$

DELIMITER ;
