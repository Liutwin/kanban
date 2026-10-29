-- ============================================
-- Jeu de données fictif – Kanban DB
-- 5 utilisateurs, 6 tableaux, 60 tâches, 42 logs
-- ============================================

-- ============================================
-- Utilisateurs (mdp = SHA256 de "password")
-- ============================================
INSERT INTO utilisateur_usr (usr_id, usr_mail, usr_mdp, usr_prenom, usr_nom, usr_admin) VALUES
(1, 'alice.martin@mail.com', '1035fbadc9ff56706210022b2b506e05ace4d1f5f675d85fb249942600f0e5ecd153b0d00684cdf734460fa322577520d45b3d7d03cdcf614e5696544b00c2b8.dfacc480b99dce766b4e0608dd3b8fa9', 'Alice', 'Martin', TRUE),
(2, 'bob.dupont@mail.com',   '1035fbadc9ff56706210022b2b506e05ace4d1f5f675d85fb249942600f0e5ecd153b0d00684cdf734460fa322577520d45b3d7d03cdcf614e5696544b00c2b8.dfacc480b99dce766b4e0608dd3b8fa9', 'Bob',   'Dupont', FALSE),
(3, 'claire.leroy@mail.com', '1035fbadc9ff56706210022b2b506e05ace4d1f5f675d85fb249942600f0e5ecd153b0d00684cdf734460fa322577520d45b3d7d03cdcf614e5696544b00c2b8.dfacc480b99dce766b4e0608dd3b8fa9', 'Claire','Leroy',  FALSE),
(4, 'david.morin@mail.com',  '1035fbadc9ff56706210022b2b506e05ace4d1f5f675d85fb249942600f0e5ecd153b0d00684cdf734460fa322577520d45b3d7d03cdcf614e5696544b00c2b8.dfacc480b99dce766b4e0608dd3b8fa9', 'David', 'Morin',  FALSE),
(5, 'emma.petit@mail.com',   '1035fbadc9ff56706210022b2b506e05ace4d1f5f675d85fb249942600f0e5ecd153b0d00684cdf734460fa322577520d45b3d7d03cdcf614e5696544b00c2b8.dfacc480b99dce766b4e0608dd3b8fa9', 'Emma',  'Petit',  FALSE);

-- ============================================
-- Tableaux
-- Alice  : 2 (tab 1, 2)  Bob : 2 (tab 3, 4)
-- Claire : 1 (tab 5)     David : 1 (tab 6)    Emma : 0
-- ============================================
INSERT INTO tableau_tab (tab_id, tab_nom, usr_createur) VALUES
(1, 'Refonte Site Web',       1),
(2, 'Application Mobile',     1),
(3, 'Campagne Marketing Q2',  2),
(4, 'Infrastructure DevOps',  2),
(5, 'Formation Interne',      3),
(6, 'Projet Data Analytics',  4);

-- ============================================
-- Participations (créateur = admin,
-- collaborateurs actifs = éditeur, observateurs = lecteur)
-- ============================================
INSERT INTO participation_ptp (ptp_role, ptp_notifiee, tab_id, usr_participant) VALUES
('editeur', 1, 1, 2), ('editeur', 1, 1, 3), ('lecteur', 1, 1, 5),
('editeur', 1, 2, 4), ('lecteur', 1, 2, 5),
('editeur', 1, 3, 5), ('lecteur', 1, 3, 1),
('editeur', 1, 4, 4), ('editeur', 1, 4, 3),
('editeur', 1, 5, 1), ('editeur', 1, 5, 5), ('lecteur', 1, 5, 2),
('editeur', 1, 6, 2), ('editeur', 1, 6, 5), ('lecteur', 1, 6, 3);

-- ============================================
-- Colonnes
-- col_numero est géré automatiquement par le trigger before_insert_colonne.
-- Les INSERTs sont séparés (un par ligne) pour que chaque exécution du trigger
-- voie les lignes précédentes et calcule le bon MAX(col_numero) + 1.
-- ============================================

-- Tab 1 – Refonte Site Web (4 colonnes)
-- col_numero est géré par le trigger before_insert_colonne — un INSERT par ligne obligatoire
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (1, 'Backlog',1);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (2, 'En cours',1);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (3, 'Révision',1);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (4, 'Terminé',1);

-- Tab 2 – Application Mobile (3 colonnes)
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (5, 'À faire',2);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (6, 'En cours',2);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (7, 'Terminé',2);

-- Tab 3 – Campagne Marketing Q2 (4 colonnes)
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (8,  'Idées',3);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (9,  'Planifié',3);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (10, 'En production',3);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (11, 'Publié',3);

-- Tab 4 – Infrastructure DevOps (5 colonnes)
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (12, 'Backlog',4);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (13, 'Analyse',4);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (14, 'Développement',4);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (15, 'Tests',4);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (16, 'Déployé',4);

-- Tab 5 – Formation Interne (3 colonnes)
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (17, 'À préparer',5);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (18, 'En préparation',5);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (19, 'Réalisé',5);

-- Tab 6 – Projet Data Analytics (4 colonnes)
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (20, 'Backlog',6);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (21, 'Exploration',6);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (22, 'Modélisation',6);
INSERT INTO colonne_col (col_id, col_nom, tab_id) VALUES (23, 'Livré',6);

-- ============================================
-- Tâches – Tableau 1 : Refonte Site Web
-- Les triggers before_insert_tache, after_insert_tache et after_update_tache
-- sont désactivés pour éviter la génération automatique de logs qui
-- entreraient en conflit avec les log_id insérés manuellement ci-dessous,
-- et pour permettre de fournir tsk_position manuellement.
-- tsk_position : index 0-based, séquentiel par col_id
-- col 1 (Backlog)  : tsk 1(0), 2(1), 9(2)
-- col 2 (En cours) : tsk 3(0), 4(1), 5(2)
-- col 3 (Révision) : tsk 6(0), 7(1)
-- col 4 (Terminé)  : tsk 8(0), 10(1)
-- ============================================
SET @_disable_tache_triggers = 1;
INSERT INTO tache_tsk (tsk_id, tsk_titre, tsk_details, tsk_datelimite, tsk_priorite, tsk_position, col_id, usr_createur, usr_assignee) VALUES
(1,  'Audit SEO',                   'Analyser le référencement actuel',           '2026-03-20 12:00:00','haute',   0, 1, 1, 3),
(2,  'Maquettes Figma',             'Wireframes des pages principales',           '2026-03-25 18:00:00','haute',   1, 1, 1, 1),
(3,  'Intégration page accueil',    'HTML/CSS/JS de la homepage',                 '2026-04-01 18:00:00','moyenne', 0, 2, 1, 2),
(4,  'Optimisation images',         'Compresser et convertir en WebP',            '2026-04-05 12:00:00','basse',   1, 2, 1, 3),
(5,  'Mise en place CMS',           'Configurer Strapi',                          '2026-04-10 18:00:00','moyenne', 2, 2, 2, 2),
(6,  'Tests cross-browser',         'Chrome, Firefox, Safari, Edge',              '2026-04-15 12:00:00','haute',   0, 3, 1, 3),
(7,  'Révision accessibilité',      'Vérifier conformité WCAG 2.1 AA',           '2026-04-15 18:00:00','moyenne', 1, 3, 1, 1),
(8,  'Migration DNS',               'Pointer le domaine vers le nouveau serveur', '2026-04-20 08:00:00','haute',   0, 4, 1, 2),
(9,  'Rédaction CGU',               'Mettre à jour les mentions légales',         '2026-03-28 12:00:00','basse',   2, 1, 3, 3),
(10, 'Intégration Google Analytics','GA4 + Tag Manager',                          '2026-04-18 12:00:00','basse',   1, 4, 2, 5);

-- Tableau 2 : Application Mobile
-- col 7 (Terminé)  : tsk 11(0), 12(1), 20(2)
-- col 6 (En cours) : tsk 13(0), 14(1)
-- col 5 (À faire)  : tsk 15(0), 16(1), 17(2), 18(3), 19(4)
INSERT INTO tache_tsk (tsk_id, tsk_titre, tsk_details, tsk_datelimite, tsk_priorite, tsk_position, col_id, usr_createur, usr_assignee) VALUES
(11, 'Setup React Native',         'Initialiser le projet Expo',                 '2026-03-15 18:00:00','haute',   0, 7, 1, 1),
(12, 'Écran de connexion',         'Formulaire login + JWT',                     '2026-03-22 18:00:00','haute',   1, 7, 1, 4),
(13, 'Navigation principale',      'Bottom tab navigator',                       '2026-03-28 18:00:00','moyenne', 0, 6, 1, 4),
(14, 'Écran liste des tâches',     'Afficher les tâches par tableau',            '2026-04-05 18:00:00','moyenne', 1, 6, 1, 4),
(15, 'Push notifications',         'Intégrer Expo Notifications',                '2026-04-15 12:00:00','basse',   0, 5, 1, NULL),
(16, 'Mode hors-ligne',            'Synchronisation avec AsyncStorage',          '2026-04-20 18:00:00','basse',   1, 5, 4, NULL),
(17, 'Tests unitaires',            'Jest + React Testing Library',               '2026-04-25 18:00:00','moyenne', 2, 5, 1, 4),
(18, 'Publication App Store',      'Préparer les assets et soumettre',           '2026-05-01 12:00:00','haute',   3, 5, 1, NULL),
(19, 'Publication Google Play',    'Générer APK signé',                          '2026-05-01 12:00:00','haute',   4, 5, 1, NULL),
(20, 'Design système de couleurs', 'Définir palette et thème global',            '2026-03-18 18:00:00','moyenne', 2, 7, 1, 4);

-- Tableau 3 : Campagne Marketing Q2
-- col 11 (Publié)        : tsk 21(0), 27(1), 30(2)
-- col 10 (En production) : tsk 22(0), 24(1), 26(2)
-- col  9 (Planifié)      : tsk 23(0), 25(1), 28(2)
-- col  8 (Idées)         : tsk 29(0)
INSERT INTO tache_tsk (tsk_id, tsk_titre, tsk_details, tsk_datelimite, tsk_priorite, tsk_position, col_id, usr_createur, usr_assignee) VALUES
(21, 'Brief créatif',              'Définir le message et les cibles',           '2026-03-18 12:00:00','haute',   0, 11, 2, 2),
(22, 'Shooting photo produits',    'Organiser la séance studio',                 '2026-03-25 09:00:00','moyenne', 0, 10, 2, 5),
(23, 'Rédaction articles blog',    '3 articles SEO sur les nouvelles features',  '2026-04-01 18:00:00','moyenne', 0,  9, 5, 5),
(24, 'Campagne e-mail #1',         'Newsletter avril',                           '2026-04-05 08:00:00','haute',   1, 10, 2, 2),
(25, 'Posts réseaux sociaux',      'Calendrier éditorial avril-mai',             '2026-04-01 12:00:00','moyenne', 1,  9, 5, 5),
(26, 'Vidéo teaser 30s',           'Script + tournage + montage',                '2026-04-10 18:00:00','haute',   2, 10, 2, NULL),
(27, 'Rapport performance Q1',     'Analyser KPIs et rédiger le bilan',          '2026-03-20 18:00:00','haute',   1, 11, 2, 2),
(28, 'Landing page promotion',     'Page dédiée à la campagne',                  '2026-04-08 18:00:00','moyenne', 2,  9, 2, 5),
(29, 'Partenariat influenceur',    'Contacter et briefer les partenaires',       '2026-04-15 12:00:00','basse',   0,  8, 2, NULL),
(30, 'Analyse concurrentielle',    'Benchmarker 5 concurrents',                  '2026-03-22 18:00:00','moyenne', 2, 11, 5, 5);

-- Tableau 4 : Infrastructure DevOps
-- col 12 (Backlog)       : tsk 31(0), 38(1), 40(2)
-- col 14 (Développement) : tsk 32(0), 39(1)
-- col 13 (Analyse)       : tsk 33(0), 34(1), 36(2)
-- col 15 (Tests)         : tsk 35(0)
-- col 16 (Déployé)       : tsk 37(0)
INSERT INTO tache_tsk (tsk_id, tsk_titre, tsk_details, tsk_datelimite, tsk_priorite, tsk_position, col_id, usr_createur, usr_assignee) VALUES
(31, 'Mise en place Kubernetes',     'Cluster K8s sur AWS EKS',                  '2026-04-01 18:00:00','haute',   0, 12, 2, 4),
(32, 'Pipeline CI/CD GitHub Actions','Build, test, deploy automatisés',          '2026-03-28 18:00:00','haute',   0, 14, 2, 3),
(33, 'Monitoring Grafana',           'Dashboard CPU, RAM, latences',             '2026-04-10 18:00:00','moyenne', 0, 13, 4, 4),
(34, 'Backup automatique BDD',       'Script cron + stockage S3',                '2026-04-05 12:00:00','haute',   1, 13, 2, 4),
(35, 'Certificats TLS auto-renew',   'Let''s Encrypt + certbot',                 '2026-03-30 12:00:00','moyenne', 0, 15, 2, 3),
(36, 'Audit sécurité',               'Scan OWASP ZAP + rapport',                 '2026-04-15 18:00:00','haute',   2, 13, 3, 3),
(37, 'Mise à jour dépendances',      'npm audit + Maven updates',                '2026-03-25 18:00:00','basse',   0, 16, 4, 4),
(38, 'Documentation infra',          'Schémas réseau et runbooks',               '2026-04-20 18:00:00','basse',   1, 12, 2, NULL),
(39, 'Load testing',                 'Tests de charge avec k6',                  '2026-04-12 12:00:00','moyenne', 1, 14, 3, 3),
(40, 'Politique de rollback',        'Procédure de retour arrière documentée',   '2026-04-18 18:00:00','haute',   2, 12, 2, 4);

-- Tableau 5 : Formation Interne
-- col 19 (Réalisé)       : tsk 41(0), 42(1), 49(2)
-- col 18 (En préparation): tsk 43(0), 44(1)
-- col 17 (À préparer)    : tsk 45(0), 46(1), 47(2), 48(3), 50(4)
INSERT INTO tache_tsk (tsk_id, tsk_titre, tsk_details, tsk_datelimite, tsk_priorite, tsk_position, col_id, usr_createur, usr_assignee) VALUES
(41, 'Module Git avancé',            'Rebase, cherry-pick, stash',               '2026-03-22 18:00:00','moyenne', 0, 19, 3, 3),
(42, 'Atelier Docker',               'Images, volumes, réseaux',                 '2026-03-28 18:00:00','haute',   1, 19, 3, 1),
(43, 'Présentation DDD',             'Domain Driven Design en pratique',         '2026-04-04 18:00:00','moyenne', 0, 18, 3, 3),
(44, 'TP Spring Boot',               'CRUD API REST avec JPA',                   '2026-04-11 18:00:00','haute',   1, 18, 1, 1),
(45, 'Cours SQL avancé',             'Fenêtres, CTE, index',                     '2026-04-18 18:00:00','moyenne', 0, 17, 3, 5),
(46, 'Introduction Deno',            'Runtime TS, Oak framework',                '2026-04-25 18:00:00','basse',   1, 17, 3, 5),
(47, 'Workshop sécurité web',        'OWASP Top 10 hands-on',                    '2026-05-02 18:00:00','haute',   2, 17, 3, 1),
(48, 'Retour d''expérience DevOps',  'Partage de pratiques terrain',             '2026-05-09 18:00:00','basse',   3, 17, 3, NULL),
(49, 'Support de cours React',       'Hooks, context, routing',                  '2026-03-20 18:00:00','haute',   2, 19, 1, 1),
(50, 'Évaluation formative',         'QCM en ligne sur Moodle',                  '2026-05-15 12:00:00','basse',   4, 17, 3, NULL);

-- Tableau 6 : Projet Data Analytics
-- col 23 (Livré)        : tsk 51(0), 58(1)
-- col 22 (Modélisation) : tsk 52(0), 53(1)
-- col 21 (Exploration)  : tsk 54(0), 55(1)
-- col 20 (Backlog)      : tsk 56(0), 57(1), 59(2), 60(3)
INSERT INTO tache_tsk (tsk_id, tsk_titre, tsk_details, tsk_datelimite, tsk_priorite, tsk_position, col_id, usr_createur, usr_assignee) VALUES
(51, 'Collecte des données brutes',  'Extraction depuis les APIs partenaires',   '2026-03-18 12:00:00','haute',   0, 23, 4, 4),
(52, 'Nettoyage dataset clients',    'Dédoublonnage, valeurs manquantes',        '2026-03-25 18:00:00','haute',   0, 22, 4, 5),
(53, 'Analyse exploratoire',         'EDA avec Pandas + visualisations Seaborn', '2026-04-01 18:00:00','moyenne', 1, 22, 5, 5),
(54, 'Modèle prédictif churn',       'Random Forest + validation croisée',       '2026-04-10 18:00:00','haute',   0, 21, 4, 4),
(55, 'Dashboard Power BI',           'KPIs ventes et rétention clients',         '2026-04-15 18:00:00','moyenne', 1, 21, 4, 2),
(56, 'Pipeline ETL automatisé',      'Apache Airflow DAG quotidien',             '2026-04-20 18:00:00','haute',   0, 20, 4, 4),
(57, 'Rapport mensuel automatique',  'PDF généré chaque 1er du mois',            '2026-04-25 18:00:00','moyenne', 1, 20, 5, 5),
(58, 'Revue qualité données',        'Score de complétude et cohérence',         '2026-03-28 18:00:00','basse',   1, 23, 4, 2),
(59, 'API résultats ML',             'Endpoint REST Flask pour le modèle',       '2026-05-01 18:00:00','haute',   2, 20, 4, NULL),
(60, 'Documentation méthodologie',   'Rapport technique des choix algorithmiques','2026-05-10 18:00:00','basse',   3, 20, 4, 3);

-- ============================================
-- Journal de logs (cohérents avec l'état final)
-- En production les triggers génèrent ces entrées ;
-- ici on les insère manuellement pour le jeu initial.
-- ============================================
SET @_disable_tache_triggers = NULL;
INSERT INTO journal_log (log_id, log_type, log_date, log_description, usr_auteur, tsk_id, tab_id) VALUES
-- Tab 1 – créations
(1,  'creation',    '2026-03-01 09:05:00','Tâche créée : Audit SEO',                         1,  1,  1),
(2,  'creation',    '2026-03-01 09:10:00','Tâche créée : Maquettes Figma',                   1,  2,  1),
(3,  'creation',    '2026-03-01 09:15:00','Tâche créée : Intégration page accueil',          1,  3,  1),
(4,  'creation',    '2026-03-01 09:20:00','Tâche créée : Tests cross-browser',               1,  6,  1),
-- Tab 1 – déplacements (Backlog → En cours / Révision)
(5,  'deplacement', '2026-03-05 14:00:00','Tâche déplacée : Audit SEO',                      1,  1,  1),
(6,  'deplacement', '2026-03-08 10:30:00','Tâche déplacée : Maquettes Figma',                1,  2,  1),
(7,  'deplacement', '2026-03-10 11:00:00','Tâche déplacée : Intégration page accueil',       2,  3,  1),
-- Tab 1 – modifications
(8,  'modification','2026-03-06 16:00:00','Tâche modifiée : Audit SEO',                      1,  1,  1),
(9,  'modification','2026-03-09 09:45:00','Tâche modifiée : Maquettes Figma',                3,  2,  1),
-- Tab 2 – créations
(10, 'creation',    '2026-03-02 10:00:00','Tâche créée : Setup React Native',                1,  11, 2),
(11, 'creation',    '2026-03-02 10:05:00','Tâche créée : Écran de connexion',                1,  12, 2),
(12, 'creation',    '2026-03-02 10:10:00','Tâche créée : Navigation principale',             1,  13, 2),
-- Tab 2 – déplacements (À faire → Terminé)
(13, 'deplacement', '2026-03-07 15:00:00','Tâche déplacée : Setup React Native',             1,  11, 2),
(14, 'deplacement', '2026-03-09 11:00:00','Tâche déplacée : Écran de connexion',             4,  12, 2),
(15, 'modification','2026-03-10 09:00:00','Tâche modifiée : Écran liste des tâches',         4,  14, 2),
-- Tab 3 – créations
(16, 'creation',    '2026-03-03 08:30:00','Tâche créée : Brief créatif',                    2,  21, 3),
(17, 'creation',    '2026-03-03 08:35:00','Tâche créée : Rapport performance Q1',           2,  27, 3),
(18, 'creation',    '2026-03-03 08:40:00','Tâche créée : Analyse concurrentielle',          5,  30, 3),
-- Tab 3 – déplacements (→ Publié)
(19, 'deplacement', '2026-03-06 10:00:00','Tâche déplacée : Brief créatif',                 2,  21, 3),
(20, 'deplacement', '2026-03-08 14:00:00','Tâche déplacée : Rapport performance Q1',        2,  27, 3),
(21, 'deplacement', '2026-03-09 09:00:00','Tâche déplacée : Analyse concurrentielle',       5,  30, 3),
-- Tab 4 – créations
(22, 'creation',    '2026-03-02 11:00:00','Tâche créée : Pipeline CI/CD GitHub Actions',    2,  32, 4),
(23, 'creation',    '2026-03-02 11:05:00','Tâche créée : Certificats TLS auto-renew',       2,  35, 4),
(24, 'creation',    '2026-03-02 11:10:00','Tâche créée : Mise à jour dépendances',          4,  37, 4),
-- Tab 4 – déplacements
(25, 'deplacement', '2026-03-06 16:30:00','Tâche déplacée : Certificats TLS auto-renew',    3,  35, 4),
(26, 'deplacement', '2026-03-08 10:00:00','Tâche déplacée : Mise à jour dépendances',       4,  37, 4),
(27, 'modification','2026-03-07 14:00:00','Tâche modifiée : Pipeline CI/CD GitHub Actions', 3,  32, 4),
(28, 'modification','2026-03-10 10:15:00','Tâche modifiée : Load testing',                  3,  39, 4),
-- Tab 5 – créations
(29, 'creation',    '2026-03-04 09:00:00','Tâche créée : Module Git avancé',                3,  41, 5),
(30, 'creation',    '2026-03-04 09:05:00','Tâche créée : Atelier Docker',                   3,  42, 5),
(31, 'creation',    '2026-03-04 09:10:00','Tâche créée : Support de cours React',           1,  49, 5),
-- Tab 5 – déplacements (→ Réalisé)
(32, 'deplacement', '2026-03-07 17:00:00','Tâche déplacée : Module Git avancé',             3,  41, 5),
(33, 'deplacement', '2026-03-09 10:00:00','Tâche déplacée : Atelier Docker',                3,  42, 5),
(34, 'deplacement', '2026-03-10 08:30:00','Tâche déplacée : Support de cours React',        1,  49, 5),
(35, 'modification','2026-03-08 15:00:00','Tâche modifiée : TP Spring Boot',                1,  44, 5),
-- Tab 6 – créations
(36, 'creation',    '2026-03-03 13:00:00','Tâche créée : Collecte des données brutes',      4,  51, 6),
(37, 'creation',    '2026-03-03 13:05:00','Tâche créée : Nettoyage dataset clients',        4,  52, 6),
(38, 'creation',    '2026-03-03 13:10:00','Tâche créée : Analyse exploratoire',             5,  53, 6),
-- Tab 6 – déplacements
(39, 'deplacement', '2026-03-06 15:00:00','Tâche déplacée : Collecte des données brutes',   4,  51, 6),
(40, 'deplacement', '2026-03-08 16:00:00','Tâche déplacée : Nettoyage dataset clients',     5,  52, 6),
(41, 'modification','2026-03-09 11:30:00','Tâche modifiée : Analyse exploratoire',          5,  53, 6),
(42, 'modification','2026-03-10 14:00:00','Tâche modifiée : Dashboard Power BI',            4,  55, 6);
