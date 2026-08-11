-- Padellist Grundschema

CREATE TABLE players (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#00b940',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE matches (
  id         INTEGER PRIMARY KEY,
  played_on  TEXT NOT NULL,
  t1p1       INTEGER NOT NULL REFERENCES players(id),
  t1p2       INTEGER NOT NULL REFERENCES players(id),
  t2p1       INTEGER NOT NULL REFERENCES players(id),
  t2p2       INTEGER NOT NULL REFERENCES players(id),
  note       TEXT,
  source     TEXT NOT NULL DEFAULT 'app',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Elo laeuft strikt chronologisch; dieser Index bedient die einzige Leseabfrage.
CREATE INDEX idx_matches_order ON matches(played_on, id);

CREATE TABLE sets (
  id       INTEGER PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_no   INTEGER NOT NULL,
  t1_games INTEGER NOT NULL,
  t2_games INTEGER NOT NULL
);

CREATE INDEX idx_sets_match ON sets(match_id);

CREATE TABLE login_attempts (
  ip           TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_login_attempts ON login_attempts(ip, attempted_at);
