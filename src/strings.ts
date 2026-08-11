export const t = {
  appName: 'Padellist',

  tabs: {
    home: 'Heute',
    ranking: 'Rangliste',
    matches: 'Spiele',
    log: 'Log',
  },

  login: {
    title: 'Padellist',
    subtitle: 'Passwort eingeben',
    placeholder: 'Passwort',
    submit: 'Anmelden',
    pending: 'Einen Moment',
    wrong: 'Falsches Passwort.',
    throttled: 'Zu viele Versuche. Bitte 15 Minuten warten.',
    failed: 'Anmeldung fehlgeschlagen.',
  },

  home: {
    nextTitle: 'Als Nächstes',
    versus: 'gegen',
    neverPlayed: 'So noch nie gespielt',
    lastPlayed: (date: string) => `Zuletzt am ${date}`,
    addMatch: 'Match erfassen',
    alternatives: 'Andere Aufteilungen',
    playedCount: (n: number) => (n === 1 ? '1 Spiel' : `${n} Spiele`),
    recent: 'Letzte Spiele',
    empty: 'Noch keine Spiele erfasst.',
    emptyHint: 'Erfasse das erste Match, dann füllt sich die Rangliste.',
    all: 'Alle Spiele',
  },

  ranking: {
    title: 'Rangliste',
    empty: 'Noch keine Wertung.',
    players: 'Spieler',
    duos: 'Duos',
    duosHint: 'Siegquote als Paar',
    matchups: 'Direkte Duelle',
    matchupsHint: 'Bilanz je Aufteilung',
    record: (wins: number, losses: number, draws: number) => {
      const parts = [wins === 1 ? '1 Sieg' : `${wins} Siege`, losses === 1 ? '1 Niederlage' : `${losses} Niederlagen`]
      if (draws > 0) parts.push(`${draws} unentschieden`)
      return parts.join(', ')
    },
    detail: (sets: string, diff: string) => `${sets} Sätze · ${diff} Spiele`,
    outOf: (wins: number, matches: number) => `${wins} von ${matches}`,
    notPlayed: 'noch nicht gespielt',
  },

  matches: {
    title: 'Spiele',
    empty: 'Noch keine Spiele erfasst.',
    draw: 'Unentschieden',
    tapToEdit: 'Zum Bearbeiten antippen',
  },

  history: {
    title: 'Log',
    empty: 'Noch nichts geändert.',
    hint: 'Alle vier können erfassen und korrigieren. Hier steht, was wann passiert ist.',
    create: 'erfasst',
    update: 'geändert',
    delete: 'gelöscht',
    matchOn: (date: string) => `Spiel vom ${date}`,
    before: 'Vorher',
    after: 'Jetzt',
    removed: 'Gelöscht',
    versus: 'gegen',
  },

  form: {
    newTitle: 'Match erfassen',
    editTitle: 'Match bearbeiten',
    date: 'Datum',
    pairing: 'Wer spielt',
    swap: 'Seiten tauschen',
    sets: 'Resultat',
    addSet: 'Weiterer Satz',
    removeSet: 'Entfernen',
    note: 'Notiz',
    notePlaceholder: 'optional',
    save: 'Speichern',
    saving: 'Speichert',
    delete: 'Match löschen',
    deleteConfirm: 'Dieses Match wirklich löschen?',
    setLabel: (n: number) => `${n}. Satz`,
  },

  install: {
    title: 'Padellist aufs Handy',
    iosHint: 'Im Teilen-Menü «Zum Home-Bildschirm» wählen, dann öffnet sich Padellist wie eine App.',
    action: 'Installieren',
    dismiss: 'Ausblenden',
  },

  settings: {
    title: 'Einstellungen',
    players: 'Namen',
    save: 'Speichern',
    saved: 'Gespeichert.',
    logout: 'Abmelden',
  },

  errors: {
    tied_set: 'Ein Satz kann nicht unentschieden enden.',
    invalid_set_count: 'Mindestens ein Satz, höchstens drei.',
    duplicate_players: 'Jeder Spieler darf nur einmal vorkommen.',
    unknown_player: 'Unbekannter Spieler.',
    invalid_date: 'Ungültiges Datum.',
    games_out_of_range: 'Spielstand muss zwischen 0 und 9 liegen.',
    invalid_name: 'Name darf nicht leer sein.',
    offline: 'Keine Verbindung. Angezeigt wird der letzte bekannte Stand.',
    generic: 'Etwas ist schiefgelaufen.',
    retry: 'Nochmal versuchen',
  },
} as const

export function translateError(code: string): string {
  return (t.errors as Record<string, string>)[code] ?? t.errors.generic
}
