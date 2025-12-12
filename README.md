# SetBet – Gewinnen oder Verklagen

Mobile Hybrid-App für das Erfassen und Verwalten von privaten Wetten und Abmachungen.  
Projektarbeit im Rahmen des ÜK **Modul 335 – Mobile Applikation realisieren**.

## Inhalt

- [Ziel der App](#ziel-der-app)
- [Funktionen](#funktionen)
- [Technologien](#technologien)
- [Architektur & Datenmodell](#architektur--datenmodell)
- [CRUD-Operationen](#crud-operationen)
- [Geräteschnittstellen](#geräteschnittstellen)
- [Projektstruktur](#projektstruktur)
- [Installation & Setup](#installation--setup)
- [Entwicklung & Start](#entwicklung--start)
- [Build & APK-Erstellung](#build--apk-erstellung)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)

---

## Ziel der App

Wenn zwei Personen private Wetten oder Abmachungen eingehen, passiert das oft nur mündlich oder über lose Chat-Nachrichten. Im Streitfall ist unklar:

- was genau vereinbart wurde  
- welcher Einsatz geschuldet ist  
- bis wann der Einsatz fällig wäre

**SetBet** löst dieses Problem, indem Wetten und Abmachungen strukturiert im System erfasst werden.  
Die App dient als neutrale Instanz zwischen den beteiligten Personen:

- Beide Parteien sehen dieselben Bedingungen und den Einsatz.
- Die Zustimmung wird in der App dokumentiert.
- Optionale Foto-Beweise (vor/nach der Wette) und Standortdaten erhöhen die Nachvollziehbarkeit.

---

## Funktionen

### Authentifizierung

- Registrierung mit **E-Mail, Username und Passwort**
- Login mit **E-Mail oder Username** und Passwort
- Profildaten werden in der Tabelle `profiles` gespeichert.
- Nur volljährige Nutzer (vereinfachte Annahme: `is_adult = true`) sollen die App nutzen.

### Wetten (Bets)

- Neue Wette erstellen mit:
  - Titel und Beschreibung
  - Auswahl des Einsatz-Typs:
    - Geldbetrag (`money`): Betrag + Währung
    - Sonstiger Einsatz (`other`): freier Text
  - Einladung eines Mitspielers über `@username`
  - Auswahl eines **Regel-Templates** (Standard, Geldwette, Challenge)
  - Speicherung von Erstellort (Geolocation, falls verfügbar)
- Wetten-Übersicht (Dashboard):
  - Anzeige aller Wetten mit Status (open, accepted, completed, cancelled)
  - Filterung über den Status (visuell durch Badges)
- Detailansicht einer Wette:
  - Alle Bedingungen, Einsatz und Regeln im Überblick
  - Verlauf der Wette (Timeline): erstellt, Fotos, Gewinner-Vorschlag, Bestätigungen, Abbruch-Anfragen

### Einladen, Bestätigen und Abbrechen

- Initiator kann einen Mitspieler per Username einladen.
- Eingeladener Nutzer kann eine Wette **annehmen** oder vorerst offen lassen.
- Gewinner-Flow:
  - Ein Teilnehmer kann sich als Gewinner vorschlagen.
  - Der andere Teilnehmer kann den Gewinner **bestätigen** oder **ablehnen**.
  - Bei Bestätigung wird der Status auf `completed` gesetzt und optional der Abschluss-Standort gespeichert.
- Abbruch-Flow:
  - Ein Teilnehmer kann den **Abbruch der Wette anfragen**.
  - Der andere Teilnehmer kann den Abbruch **bestätigen** oder **ablehnen**.
  - Erst wenn beide zustimmen, wird die Wette als `cancelled` markiert.
  - Der Besitzer kann abgebrochene Wetten endgültig löschen (inkl. Fotos).

### Foto-Beweise

- Teilnehmer können **über die Kamera** Fotos zu einer Wette hinzufügen.
- Fotos werden mit Zeitstempel und optionalen Standortdaten gespeichert.
- Bilder sind in der Detailansicht der Wette sichtbar.

### Dark Mode & Einstellungen

- Manueller Dark Mode über die Einstellungen (Tab „Einstellungen“).
- Der Status wird lokal gespeichert und beim Start wiederhergestellt.
- Anzeige der Profildaten (Username, E-Mail).
- Logout-Funktion.

---

## Technologien

- **Framework:** Ionic Angular (Standalone Components)
- **Native Wrapper:** Capacitor
- **Backend:** Supabase (PostgreSQL + Auth)
- **Programmiersprache:** TypeScript / Angular
- **UI-Komponenten:** Ionic Components (ion-header, ion-content, ion-card, ion-tab-bar, ion-icon, …)
- **Geräteschnittstellen:**
  - Kamera (`@capacitor/camera`)
  - Geolocation (`@capacitor/geolocation`)
  - Lokaler Speicher (`@capacitor/preferences` für Dark Mode)
- **Icons & Splash Screen:**
  - Generiert mit `@capacitor/assets` aus einem eigenen SETBET-Logo

---

## Architektur & Datenmodell

### Tabellen (Supabase)

**profiles**

- `id` (uuid, PK, = auth.uid())
- `username` (text, eindeutig)
- `email` (text)
- `is_adult` (boolean)
- `created_at` (timestamp)

**bets**

- `id` (uuid, PK)
- `owner_id` (uuid, FK -> auth.users)
- `title` (text, nicht null)
- `description` (text, nullable)
- `invited_username` (text, nullable)
- `stake_type` (`money` | `other`)
- `stake_amount` (numeric, nullable)
- `stake_currency` (text, nullable)
- `stake_text` (text, nullable)
- `status` (`open` | `accepted` | `completed` | `cancelled`)
- `rule_template_key` (text)
- `rules_text` (text)
- `winner_id` (uuid, nullable)
- `winner_proposed_by` (uuid, nullable)
- `winner_status` (`none` | `proposed` | `confirmed` | `rejected`)
- `winner_proposed_at`, `winner_confirmed_at` (timestamp, nullable)
- `winner_confirmed_by` (uuid, nullable)
- `created_lat`, `created_lng` (double precision, nullable)
- `completed_lat`, `completed_lng` (double precision, nullable)
- `cancel_status` (`none` | `proposed` | `confirmed` | `rejected`)
- `cancel_requested_by`, `cancel_confirmed_by` (uuid, nullable)
- `cancel_requested_at`, `cancel_confirmed_at` (timestamp, nullable)
- `created_at` (timestamp)

**bet_photos**

- `id` (uuid, PK)
- `bet_id` (uuid, FK -> bets.id)
- `user_id` (uuid, FK -> auth.users)
- `photo_url` (text)
- `created_at` (timestamp)
- `latitude`, `longitude` (double precision, nullable)

---

## CRUD-Operationen

Die App implementiert vollständige CRUD-Operationen gegen Supabase:

- **Create**
  - Wette erstellen (`createBet`)
  - Foto hinzufügen (`addBetPhoto`)
- **Read**
  - Wettenliste (`listBets`)
  - Einzelne Wette (`getBetById`)
  - Fotos pro Wette (`listBetPhotos`)
  - Profil des aktuellen Users (`getProfile`)
- **Update**
  - Wette akzeptieren
  - Gewinner vorschlagen, bestätigen, ablehnen
  - Abbruch anfragen, bestätigen, ablehnen
- **Delete**
  - Abgebrochene Wette endgültig löschen (inkl. `bet_photos`)

---

## Geräteschnittstellen

Mindestens **3** Geräteschnittstellen sind integriert:

1. **Kamera**  
   - Aufnahme von Fotos zu einer Wette mit `@capacitor/camera`
2. **Geolocation**  
   - Speichern des Standorts bei Wetten-Erstellung und -Abschluss mit `@capacitor/geolocation`
3. **Lokale Speicherung / Offline-Speicher**  
   - Dark Mode Einstellung wird mit `@capacitor/preferences` lokal gespeichert

Diese Schnittstellen werden in der App sichtbar genutzt (Foto-Upload, Standort-Texte, Dark-Mode-Toggle).

---

## Projektstruktur

Wichtige Teile der Struktur unter `src/app`:

```text
src/app
 ├─ auth/             # Login / Registrierung
 ├─ tab1/             # Dashboard (Wetten-Übersicht, Aktionen)
 ├─ tab2/             # Neue Wette erstellen
 ├─ tab3/             # Einstellungen & Dark Mode
 ├─ bet-detail/       # Detailansicht einer einzelnen Wette
 ├─ services/
 │   ├─ supabase.service.ts  # Supabase-Client, CRUD & Auth
 │   └─ theme.service.ts     # Dark-Mode-Verwaltung
 ├─ tabs/             # Tab-Navigation
 └─ ...
