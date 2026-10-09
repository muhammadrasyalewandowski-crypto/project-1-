-- =====================================================================
-- Skuad Stats — skema database (MySQL 8 / MariaDB 10.5+)
-- Padanan dari data localStorage: ss_players, ss_matches, ss_groups,
-- ss_chats, ss_invites, ss_pending, ss_missions.
-- Jalankan:  mysql -u root -p < skuad_stats.sql
-- =====================================================================

DROP DATABASE IF EXISTS skuad_stats;
CREATE DATABASE skuad_stats CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skuad_stats;

-- ------------------------------- PEMAIN -------------------------------
CREATE TABLE players (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(40)  NOT NULL,
  password_hash CHAR(64)     NOT NULL,            -- SHA-256 hex (demo). Di backend sungguhan pakai bcrypt/argon2.
  name          VARCHAR(80)  NOT NULL,
  is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
  age           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  position      ENUM('Kiper','Bek','Gelandang','Penyerang') NOT NULL DEFAULT 'Gelandang',
  photo         MEDIUMTEXT   NULL,                -- data URL JPEG 256x256 (sama seperti di localStorage)
  -- atribut radar (0-100)
  attr_speed     TINYINT UNSIGNED NOT NULL DEFAULT 50,
  attr_shooting  TINYINT UNSIGNED NOT NULL DEFAULT 50,
  attr_passing   TINYINT UNSIGNED NOT NULL DEFAULT 50,
  attr_dribbling TINYINT UNSIGNED NOT NULL DEFAULT 50,
  attr_defending TINYINT UNSIGNED NOT NULL DEFAULT 50,
  -- statistik
  goals        INT UNSIGNED NOT NULL DEFAULT 0,
  assists      INT UNSIGNED NOT NULL DEFAULT 0,
  matches      INT UNSIGNED NOT NULL DEFAULT 0,
  saves        INT UNSIGNED NOT NULL DEFAULT 0,
  yellow       INT UNSIGNED NOT NULL DEFAULT 0,
  red          INT UNSIGNED NOT NULL DEFAULT 0,
  pass_success TINYINT UNSIGNED NOT NULL DEFAULT 0,
  xp           INT UNSIGNED NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_players_username (username),
  CONSTRAINT ck_attr_speed     CHECK (attr_speed     BETWEEN 0 AND 100),
  CONSTRAINT ck_attr_shooting  CHECK (attr_shooting  BETWEEN 0 AND 100),
  CONSTRAINT ck_attr_passing   CHECK (attr_passing   BETWEEN 0 AND 100),
  CONSTRAINT ck_attr_dribbling CHECK (attr_dribbling BETWEEN 0 AND 100),
  CONSTRAINT ck_attr_defending CHECK (attr_defending BETWEEN 0 AND 100),
  CONSTRAINT ck_pass_success   CHECK (pass_success   BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE player_secondary_positions (
  player_id INT UNSIGNED NOT NULL,
  position  ENUM('Kiper','Bek','Gelandang','Penyerang') NOT NULL,
  PRIMARY KEY (player_id, position),
  CONSTRAINT fk_secpos_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------- PERTANDINGAN ----------------------------
CREATE TABLE matches_history (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  match_date    DATE         NOT NULL,
  opponent      VARCHAR(80)  NOT NULL,
  goals_for     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  goals_against TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_matches_date (match_date)
) ENGINE=InnoDB;

CREATE TABLE match_scorers (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  match_id  INT UNSIGNED NOT NULL,
  player_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_scorers_match (match_id),
  CONSTRAINT fk_scorers_match  FOREIGN KEY (match_id)  REFERENCES matches_history(id) ON DELETE CASCADE,
  CONSTRAINT fk_scorers_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------- GRUP --------------------------------
-- Catatan: "groups" kata cadangan di MySQL 8, jadi dinamai player_groups.
CREATE TABLE player_groups (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(80) NOT NULL,
  is_open       TINYINT(1)  NOT NULL DEFAULT 1,
  password_hash CHAR(64)    NULL,                  -- wajib terisi jika is_open = 0
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_groups_creator FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT ck_group_private_pw CHECK (is_open = 1 OR password_hash IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE group_members (
  group_id  INT UNSIGNED NOT NULL,
  player_id INT UNSIGNED NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, player_id),
  CONSTRAINT fk_gm_group  FOREIGN KEY (group_id)  REFERENCES player_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_gm_player FOREIGN KEY (player_id) REFERENCES players(id)       ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE group_messages (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id  INT UNSIGNED NOT NULL,
  player_id INT UNSIGNED NOT NULL,
  text      TEXT NOT NULL,
  sent_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_msg_group_time (group_id, sent_at),
  CONSTRAINT fk_msg_group  FOREIGN KEY (group_id)  REFERENCES player_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_player FOREIGN KEY (player_id) REFERENCES players(id)       ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------ AJAKAN MAIN -----------------------------
CREATE TABLE invites (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  creator_id INT UNSIGNED NOT NULL,
  play_date  DATE        NOT NULL,
  play_time  TIME        NOT NULL,
  place      VARCHAR(120) NOT NULL,
  region     VARCHAR(80)  NOT NULL DEFAULT '',
  note       VARCHAR(255) NOT NULL DEFAULT '',
  group_id   INT UNSIGNED NULL,                    -- NULL = terbuka untuk semua
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_invites_date (play_date, play_time),
  CONSTRAINT fk_inv_creator FOREIGN KEY (creator_id) REFERENCES players(id)       ON DELETE CASCADE,
  CONSTRAINT fk_inv_group   FOREIGN KEY (group_id)   REFERENCES player_groups(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE invite_participants (
  invite_id INT UNSIGNED NOT NULL,
  player_id INT UNSIGNED NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (invite_id, player_id),
  CONSTRAINT fk_ip_invite FOREIGN KEY (invite_id) REFERENCES invites(id) ON DELETE CASCADE,
  CONSTRAINT fk_ip_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------- MISI ---------------------------------
CREATE TABLE missions (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(200) NOT NULL,
  difficulty ENUM('mudah','sedang','sulit')        NOT NULL,   -- XP: 30 / 60 / 120
  period     ENUM('harian','mingguan','bulanan')   NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE player_missions (
  player_id    INT UNSIGNED NOT NULL,
  mission_id   INT UNSIGNED NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, mission_id),               -- satu misi hanya sekali per pemain (sama seperti app)
  CONSTRAINT fk_pm_player  FOREIGN KEY (player_id)  REFERENCES players(id)  ON DELETE CASCADE,
  CONSTRAINT fk_pm_mission FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------- PENGAJUAN STATISTIK (pending) -------------------
CREATE TABLE stat_claims (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id  INT UNSIGNED NOT NULL,
  type       ENUM('goals','assists','saves') NOT NULL,
  value      INT UNSIGNED NOT NULL DEFAULT 1,
  note       VARCHAR(255) NOT NULL DEFAULT '',
  status     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by INT UNSIGNED NULL,
  decided_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY ix_claims_status (status, created_at),
  CONSTRAINT fk_claim_player  FOREIGN KEY (player_id)  REFERENCES players(id) ON DELETE CASCADE,
  CONSTRAINT fk_claim_admin   FOREIGN KEY (decided_by) REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT ck_claim_value   CHECK (value > 0)
) ENGINE=InnoDB;

-- ================================ VIEW ==================================
-- Papan peringkat: overall, rasio, total XP (matches*15 + xp), dan nama rank.
CREATE VIEW v_leaderboard AS
SELECT
  p.id, p.username, p.name, p.position, p.age,
  ROUND((p.attr_speed + p.attr_shooting + p.attr_passing + p.attr_dribbling + p.attr_defending) / 5) AS overall,
  p.goals, p.assists, p.matches, p.saves, p.yellow, p.red, p.pass_success,
  CASE WHEN p.matches > 0 THEN ROUND(p.goals   / p.matches, 2) ELSE 0.00 END AS goal_ratio,
  CASE WHEN p.matches > 0 THEN ROUND(p.assists / p.matches, 2) ELSE 0.00 END AS assist_ratio,
  (p.matches * 15 + p.xp) AS total_xp,
  CASE
    WHEN (p.matches * 15 + p.xp) >= 2200 THEN 'Legenda'
    WHEN (p.matches * 15 + p.xp) >= 1400 THEN 'Elite'
    WHEN (p.matches * 15 + p.xp) >=  800 THEN 'Profesional'
    WHEN (p.matches * 15 + p.xp) >=  400 THEN 'Semi-Pro'
    WHEN (p.matches * 15 + p.xp) >=  150 THEN 'Amatir'
    ELSE 'Pemula'
  END AS rank_name
FROM players p
WHERE p.is_admin = 0;

-- Riwayat pertandingan lengkap dengan skor dan daftar pencetak gol.
CREATE VIEW v_match_history AS
SELECT
  m.id, m.match_date, m.opponent,
  CONCAT(m.goals_for, ' - ', m.goals_against) AS score,
  COALESCE(GROUP_CONCAT(pl.name ORDER BY s.id SEPARATOR ', '), '-') AS scorers
FROM matches_history m
LEFT JOIN match_scorers s ON s.match_id = m.id
LEFT JOIN players pl      ON pl.id = s.player_id
GROUP BY m.id, m.match_date, m.opponent, m.goals_for, m.goals_against;

-- ========================= STORED PROCEDURE =============================
DELIMITER $$

-- Pemain menyelesaikan misi: catat + tambah XP (hanya sekali per misi).
CREATE PROCEDURE complete_mission(IN p_player_id INT UNSIGNED, IN p_mission_id INT UNSIGNED)
BEGIN
  DECLARE v_xp INT DEFAULT NULL;
  DECLARE v_gain INT DEFAULT 0;

  SELECT CASE difficulty WHEN 'mudah' THEN 30 WHEN 'sedang' THEN 60 WHEN 'sulit' THEN 120 END
    INTO v_xp FROM missions WHERE id = p_mission_id;

  IF v_xp IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Misi tidak ditemukan';
  END IF;

  START TRANSACTION;
  INSERT IGNORE INTO player_missions (player_id, mission_id) VALUES (p_player_id, p_mission_id);
  IF ROW_COUNT() = 1 THEN
    SET v_gain = v_xp;
    UPDATE players SET xp = xp + v_xp WHERE id = p_player_id;
  END IF;
  COMMIT;

  SELECT v_gain AS xp_gained;  -- 0 jika misi sudah pernah diselesaikan
END$$

-- Admin menyetujui/menolak pengajuan statistik.
CREATE PROCEDURE decide_claim(IN p_claim_id INT UNSIGNED, IN p_admin_id INT UNSIGNED, IN p_approve TINYINT)
BEGIN
  DECLARE v_player INT UNSIGNED;
  DECLARE v_type   VARCHAR(10);
  DECLARE v_value  INT UNSIGNED;
  DECLARE v_status VARCHAR(10);

  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_admin_id AND is_admin = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hanya admin yang boleh memutuskan pengajuan';
  END IF;

  START TRANSACTION;
  SELECT player_id, type, value, status INTO v_player, v_type, v_value, v_status
    FROM stat_claims WHERE id = p_claim_id FOR UPDATE;

  IF v_status IS NULL OR v_status <> 'pending' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pengajuan tidak ada atau sudah diputuskan';
  END IF;

  IF p_approve = 1 THEN
    UPDATE players SET
      goals   = goals   + IF(v_type = 'goals',   v_value, 0),
      assists = assists + IF(v_type = 'assists', v_value, 0),
      saves   = saves   + IF(v_type = 'saves',   v_value, 0)
    WHERE id = v_player;
  END IF;

  UPDATE stat_claims
     SET status = IF(p_approve = 1, 'approved', 'rejected'),
         decided_by = p_admin_id, decided_at = NOW()
   WHERE id = p_claim_id;
  COMMIT;
END$$

DELIMITER ;

-- ============================== DATA AWAL ================================
-- Sandi demo = username + '123' (mis. fadil123), disimpan sebagai SHA-256.
INSERT INTO players (username, password_hash, name, is_admin)
SELECT LOWER(n), SHA2(CONCAT(LOWER(n), '123'), 256), n, a FROM (
  SELECT 'Fadil' AS n, 1 AS a
  UNION ALL SELECT 'Ama', 0 UNION ALL SELECT 'Juna', 0 UNION ALL SELECT 'Adam', 0
  UNION ALL SELECT 'Nugroho', 0 UNION ALL SELECT 'Raka', 0 UNION ALL SELECT 'Raki', 0
  UNION ALL SELECT 'Rasya', 0 UNION ALL SELECT 'Rengga', 0 UNION ALL SELECT 'Aan', 0
  UNION ALL SELECT 'Jaki', 0 UNION ALL SELECT 'Fiki', 0 UNION ALL SELECT 'Exel', 0
  UNION ALL SELECT 'Erik', 0 UNION ALL SELECT 'Tio', 0 UNION ALL SELECT 'Riqul', 0
  UNION ALL SELECT 'Ardan', 0 UNION ALL SELECT 'Faiq', 0 UNION ALL SELECT 'Ghatan', 0
) seed;

INSERT INTO player_groups (name, is_open, password_hash, created_by)
VALUES ('Skuad Inti', 1, NULL, (SELECT id FROM players WHERE username = 'fadil')),
       ('Latihan Malam (Privat)', 0, SHA2('1234', 256), (SELECT id FROM players WHERE username = 'fadil'));

INSERT INTO group_members (group_id, player_id)
SELECT (SELECT id FROM player_groups WHERE name = 'Skuad Inti'), id FROM players;
INSERT INTO group_members (group_id, player_id)
SELECT (SELECT id FROM player_groups WHERE name = 'Latihan Malam (Privat)'), id FROM players WHERE username = 'fadil';

INSERT INTO invites (creator_id, play_date, play_time, place, region, note, group_id)
VALUES ((SELECT id FROM players WHERE username = 'fadil'), '2026-09-20', '16:00:00',
        'Lapangan Kridosono', 'Yogyakarta', 'Butuh 6 pemain lawan', NULL);
INSERT INTO invite_participants (invite_id, player_id)
VALUES (LAST_INSERT_ID(), (SELECT id FROM players WHERE username = 'fadil'));

INSERT INTO missions (title, difficulty, period) VALUES
  ('Cetak 2 gol dalam satu pertandingan', 'sedang', 'mingguan'),
  ('Hadir latihan tepat waktu',           'mudah',  'harian'),
  ('Menang 3 pertandingan beruntun',      'sulit',  'bulanan');

-- ============================ CONTOH PEMAKAIAN ===========================
-- Login (cocokkan hash sandi):
--   SELECT id, name, is_admin FROM players
--   WHERE username = 'fadil' AND password_hash = SHA2('fadil123', 256);
-- Papan peringkat berdasar gol:
--   SELECT * FROM v_leaderboard ORDER BY goals DESC, assists DESC LIMIT 10;
-- Selesaikan misi / putuskan pengajuan:
--   CALL complete_mission(2, 1);
--   CALL decide_claim(1, 1, 1);   -- (id_pengajuan, id_admin, 1=setuju 0=tolak)