-- ============================================
-- Jeu de données de démonstration – Kanban
-- 2 utilisateurs, 1 tableau, 2 colonnes, 14 tâches
--
-- Compte administrateur : liutwin@wanadoo.fr / Password123
-- Compte visiteur       : visiteur@liutwin.com / kanban-demo
-- ============================================

-- ============================================
-- Utilisateurs
-- Mots de passe hachés avec scrypt, au format hash.sel
-- (même format que hashPassword() dans deno/lib/jwt.ts)
-- ============================================
INSERT INTO utilisateur_usr (usr_id, usr_mail, usr_mdp, usr_prenom, usr_nom, usr_admin) VALUES
(1, 'liutwin@wanadoo.fr',   'c7451f7ec6d694dfe455038cc2fa40950a53ea127ce41cb8817cb1374f629e6ea2c73cdd1adac9c0822f8b2f95deb4772d96921b426591855961e9b270a4d873.f1e0720952f20b7a06d394df1e23c7cb', 'Liutwin',  'Piernet', TRUE),
(2, 'visiteur@liutwin.com', '567123d06c2db0fad3da3e8239246d1110f65215e593ca95f31fb9ffc7a9abdae4464e742054369323933c9387d1e6445d3c17102910127c72494ed0426bcdab.1089834e7ef4652758a5d8a85071660f', 'Visiteur', 'Démo',    FALSE);

-- ============================================
-- Tableau
-- Le trigger after_insert_tableau ajoute automatiquement
-- le créateur comme participant avec le rôle admin.
-- ============================================
INSERT INTO tableau_tab (tab_id, tab_nom, usr_createur) VALUES
(1, 'Portfolio', 1);

-- ============================================
-- Participation du compte visiteur
-- Éditeur : peut déplacer, créer et modifier des tâches
-- pour tester l'application.
-- ============================================
INSERT INTO participation_ptp (ptp_role, ptp_notifiee, tab_id, usr_participant) VALUES
('editeur', 1, 1, 2);

-- ============================================
-- Colonnes
-- col_numero est géré par le trigger before_insert_colonne — un INSERT par ligne obligatoire
-- ============================================
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (1, 'À faire', 1);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (2, 'Fait',    1);

-- ============================================
-- Tâches
-- Les triggers de tâche sont désactivés pour fournir tsk_position
-- manuellement et insérer un journal cohérent avec les dates.
-- tsk_position : index 0-based, séquentiel par col_id
-- col 1 (À faire) : tsk 10(0), 11(1), 12(2), 13(3), 14(4)
-- col 2 (Fait)    : tsk 1(0) … 9(8)
-- ============================================
SET @_disable_tache_triggers = 1;
INSERT INTO tache_tsk (tsk_id, tsk_titre, tsk_details, tsk_datelimite, tsk_priorite, tsk_position, tsk_validee, col_id, usr_createur, usr_assignee) VALUES
-- Fait
(1,  'Maquettes du site',            'Deux maquettes générées avec Gemini, servant de base au design du portfolio',                    '2026-10-12 18:00:00', 'haute',   0, TRUE,  2, 1, 1),
(2,  'Intégration HTML/CSS',         'Mise en page responsive à partir des maquettes : présentation, parcours, projets, contact',      '2026-10-18 18:00:00', 'haute',   1, TRUE,  2, 1, 1),
(3,  'Vignettes des projets',        'Recadrage et retouche des images des cartes de projets',                                        '2026-10-19 18:00:00', 'basse',   2, TRUE,  2, 1, 1),
(4,  'Remise en état du VPS',        'Mises à jour système, pare-feu iptables, accès SSH par clé uniquement',                         '2026-10-21 18:00:00', 'haute',   3, TRUE,  2, 1, 1),
(5,  'Domaine et DNS',               'Enregistrements A chez OVH pour liutwin.com et ses sous-domaines',                              '2026-10-22 12:00:00', 'moyenne', 4, TRUE,  2, 1, 1),
(6,  'Nginx et HTTPS',               'Reverse proxy Nginx sur l''hôte et certificats Let''s Encrypt renouvelés par Certbot',            '2026-10-23 18:00:00', 'haute',   5, TRUE,  2, 1, 1),
(7,  'Formulaire de contact',        'Backend Deno auto-hébergé, envoi SMTP vers contact@liutwin.com, protection anti-spam',          '2026-10-27 18:00:00', 'moyenne', 6, TRUE,  2, 1, 1),
(8,  'Chaîne CI/CD GitHub Actions',  'Tests, build de l''image sur ghcr.io et déploiement automatique sur le VPS par SSH',              '2026-10-30 18:00:00', 'haute',   7, TRUE,  2, 1, 1),
(9,  'Déploiement du kanban',        'kanban.liutwin.com : Spring Boot, Deno, React, MariaDB et MongoDB sous Docker Compose, CI/CD',   '2026-11-08 18:00:00', 'haute',   8, TRUE,  2, 1, 1),
-- À faire
(10, 'Capture du kanban',            'Vignette de la carte projet à partir d''une capture de l''application en ligne',                 '2026-11-15 18:00:00', 'haute',   0, FALSE, 1, 1, 1),
(11, 'Carte projet kanban',          'Ajouter le projet au portfolio avec les liens vers la démo et le dépôt GitHub',                  '2026-11-15 18:00:00', 'haute',   1, FALSE, 1, 1, 1),
(12, 'Sauvegardes des bases',        'Tâche cron quotidienne : mariadb-dump et mongodump vers /srv/backups',                          '2026-11-22 18:00:00', 'moyenne', 2, FALSE, 1, 1, 1),
(13, 'README du kanban',             'Mettre à jour la section Docker : bases internes, HTTPS géré par le Nginx de l''hôte',           '2026-11-22 18:00:00', 'basse',   3, FALSE, 1, 1, 1),
(14, 'Refactoriser le Dashboard',    'Redécouper Dashboard.tsx en composants : colonne, modales, glisser-déposer',                     '2026-12-15 18:00:00', 'basse',   4, FALSE, 1, 1, 1);

-- ============================================
-- Journal de logs (cohérent avec l'état final)
-- En production les triggers génèrent ces entrées ;
-- ici on les insère manuellement pour le jeu initial.
-- ============================================
SET @_disable_tache_triggers = NULL;
INSERT INTO journal_log (log_id, log_type, log_date, log_description, usr_auteur, tsk_id, tab_id) VALUES
-- Créations
(1,  'creation',    '2026-10-10 09:00:00', 'Tâche créée : Maquettes du site',           1, 1,  1),
(2,  'creation',    '2026-10-10 09:05:00', 'Tâche créée : Intégration HTML/CSS',        1, 2,  1),
(3,  'creation',    '2026-10-10 09:10:00', 'Tâche créée : Vignettes des projets',       1, 3,  1),
(4,  'creation',    '2026-10-10 09:15:00', 'Tâche créée : Remise en état du VPS',       1, 4,  1),
(5,  'creation',    '2026-10-10 09:20:00', 'Tâche créée : Domaine et DNS',              1, 5,  1),
(6,  'creation',    '2026-10-10 09:25:00', 'Tâche créée : Nginx et HTTPS',              1, 6,  1),
(7,  'creation',    '2026-10-10 09:30:00', 'Tâche créée : Formulaire de contact',       1, 7,  1),
(8,  'creation',    '2026-10-24 10:00:00', 'Tâche créée : Chaîne CI/CD GitHub Actions', 1, 8,  1),
(9,  'creation',    '2026-11-01 10:00:00', 'Tâche créée : Déploiement du kanban',       1, 9,  1),
(10, 'creation',    '2026-11-08 20:00:00', 'Tâche créée : Capture du kanban',           1, 10, 1),
(11, 'creation',    '2026-11-08 20:05:00', 'Tâche créée : Carte projet kanban',         1, 11, 1),
(12, 'creation',    '2026-11-08 20:10:00', 'Tâche créée : Sauvegardes des bases',       1, 12, 1),
(13, 'creation',    '2026-11-08 20:15:00', 'Tâche créée : README du kanban',            1, 13, 1),
(14, 'creation',    '2026-11-08 20:20:00', 'Tâche créée : Refactoriser le Dashboard',   1, 14, 1),
-- Déplacements (À faire → Fait)
(15, 'deplacement', '2026-10-12 17:30:00', 'Tâche déplacée : Maquettes du site',           1, 1, 1),
(16, 'deplacement', '2026-10-18 16:00:00', 'Tâche déplacée : Intégration HTML/CSS',        1, 2, 1),
(17, 'deplacement', '2026-10-19 11:00:00', 'Tâche déplacée : Vignettes des projets',       1, 3, 1),
(18, 'deplacement', '2026-10-21 18:00:00', 'Tâche déplacée : Remise en état du VPS',       1, 4, 1),
(19, 'deplacement', '2026-10-22 10:30:00', 'Tâche déplacée : Domaine et DNS',              1, 5, 1),
(20, 'deplacement', '2026-10-23 15:00:00', 'Tâche déplacée : Nginx et HTTPS',              1, 6, 1),
(21, 'deplacement', '2026-10-27 14:00:00', 'Tâche déplacée : Formulaire de contact',       1, 7, 1),
(22, 'deplacement', '2026-10-30 17:00:00', 'Tâche déplacée : Chaîne CI/CD GitHub Actions', 1, 8, 1),
(23, 'deplacement', '2026-11-08 18:00:00', 'Tâche déplacée : Déploiement du kanban',       1, 9, 1),
-- Modifications
(24, 'modification','2026-10-15 09:00:00', 'Tâche modifiée : Intégration HTML/CSS',        1, 2, 1),
(25, 'modification','2026-11-05 21:00:00', 'Tâche modifiée : Déploiement du kanban',       1, 9, 1);
