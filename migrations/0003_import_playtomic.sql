-- Einmaliger Import der in Playtomic erfassten Spiele (April bis August 2026).
--
-- Spieler-Ids entsprechen 0002_seed_players.sql.
--
-- Nicht uebernommen:
--   18.04.  ohne Ergebnis
--   03.08.  von Playtomic als ungueltig markiert
--   27.07.  Match mit einem Gastspieler ausserhalb der Viererrunde
--
-- Die Saetze werden ueber played_on und source zugeordnet, damit der Import auch
-- dann korrekt laeuft, wenn bereits Matches ueber die App erfasst wurden.
-- Ruecknahme des gesamten Imports: DELETE FROM matches WHERE source = 'playtomic';

INSERT INTO matches (played_on, t1p1, t1p2, t2p1, t2p2, source) VALUES
  ('2026-04-20', 1, 4, 3, 2, 'playtomic'),
  ('2026-05-04', 3, 2, 1, 4, 'playtomic'),
  ('2026-05-11', 3, 2, 4, 1, 'playtomic'),
  ('2026-05-18', 1, 3, 4, 2, 'playtomic'),
  ('2026-06-08', 1, 3, 2, 4, 'playtomic'),
  ('2026-06-21', 3, 4, 2, 1, 'playtomic'),
  ('2026-08-10', 1, 4, 3, 2, 'playtomic');

-- 20.04. 6:7 6:2 4:6
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 1, 6, 7 FROM matches WHERE played_on = '2026-04-20' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 2, 6, 2 FROM matches WHERE played_on = '2026-04-20' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 3, 4, 6 FROM matches WHERE played_on = '2026-04-20' AND source = 'playtomic';

-- 04.05. 6:1 2:6 2:6
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 1, 6, 1 FROM matches WHERE played_on = '2026-05-04' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 2, 2, 6 FROM matches WHERE played_on = '2026-05-04' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 3, 2, 6 FROM matches WHERE played_on = '2026-05-04' AND source = 'playtomic';

-- 11.05. 6:4 7:6
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 1, 6, 4 FROM matches WHERE played_on = '2026-05-11' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 2, 7, 6 FROM matches WHERE played_on = '2026-05-11' AND source = 'playtomic';

-- 18.05. 7:6 6:2
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 1, 7, 6 FROM matches WHERE played_on = '2026-05-18' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 2, 6, 2 FROM matches WHERE played_on = '2026-05-18' AND source = 'playtomic';

-- 08.06. 6:0 6:2
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 1, 6, 0 FROM matches WHERE played_on = '2026-06-08' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 2, 6, 2 FROM matches WHERE played_on = '2026-06-08' AND source = 'playtomic';

-- 21.06. 2:6 4:6
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 1, 2, 6 FROM matches WHERE played_on = '2026-06-21' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 2, 4, 6 FROM matches WHERE played_on = '2026-06-21' AND source = 'playtomic';

-- 10.08. 6:7 4:6
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 1, 6, 7 FROM matches WHERE played_on = '2026-08-10' AND source = 'playtomic';
INSERT INTO sets (match_id, set_no, t1_games, t2_games)
  SELECT id, 2, 4, 6 FROM matches WHERE played_on = '2026-08-10' AND source = 'playtomic';
