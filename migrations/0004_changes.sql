-- Oeffentlicher Verlauf: wer was aendert, sehen alle vier.
--
-- before_json/after_json halten den kompletten Stand eines Matches (Datum, beide
-- Teams, alle Saetze). Dadurch laesst sich ein versehentlich geloeschtes Match aus
-- dem Log exakt wiederherstellen - ein separater Papierkorb eruebrigt sich.
--
-- "before" und "after" waeren als Spaltennamen zu nah an SQLite-Schluesselwoertern.

CREATE TABLE changes (
  id          INTEGER PRIMARY KEY,
  at          TEXT NOT NULL,
  action      TEXT NOT NULL,
  match_id    INTEGER NOT NULL,
  before_json TEXT,
  after_json  TEXT
);

CREATE INDEX idx_changes_at ON changes(at DESC, id DESC);
