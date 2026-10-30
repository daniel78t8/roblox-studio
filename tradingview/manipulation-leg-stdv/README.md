# Manipulation Leg – Liquidity Sweep & STDV (Pine Script v6)

Dateien:

| Datei | Inhalt |
|---|---|
| `manipulation_leg_stdv.pine` | vollständiger Indikator, in den Pine Editor kopieren |
| `tests/reference_model.py` | Python-Nachbildung der Zustandsmaschine (Funktion für Funktion wie im Pine-Code) |
| `tests/test_scenarios.py` | Szenariotests: `cd tests && python3 -m unittest -v test_scenarios` |

> **Stand der Prüfung:** Der Pine-Code wurde **nicht** in TradingView kompiliert und **nicht** im Bar Replay getestet.
> Das war aus dieser Umgebung nicht möglich. Geprüft wurde: (a) die Logik über das Python-Referenzmodell (41 Tests inkl.
> Zufallspfaden, alle bestanden), (b) Syntax und API-Verwendung statisch gegen eine Kopie der Pine-v6-Dokumentation. Der direkte
> Zugriff auf tradingview.com war gesperrt. Details stehen im Abschnitt „Prüfprotokoll“.

---

## 1. Logik in Kürze – und was gegenüber dem Video ergänzt ist

### Was aus dem Video stammt

* Ein Manipulation Leg ist eine **Fehlbewegung, die Liquidität abholt und danach entgegengesetzt dreht** (im Chart: Preis fällt,
  nimmt Liquidität unter einem vorherigen Tief, dreht deutlich nach oben; danach schematisch beide Richtungen).
* Die STDV-Messung wird auf **5m oder 15m** angelegt.
* **Level 0 = Start** der Manipulationsbewegung (A), **Level 1 = Ende** der Bewegung (B). Die **negativen Level** liegen auf der
  anderen Seite von 0, also **entgegen der Manipulationsrichtung**.
* Sichtbare Level: 1, 0.5, 0, −1, −1.5, −2, −2.25, −2.5, −3.5, −4, −4.25, −4.5.

### Was der Clip NICHT festlegt – technische Festlegungen dieses Skripts

| Festlegung | Standard | Warum nötig |
|---|---|---|
| Swing-Pivots mit `leftBars`/`rightBars` | 3 / 3 (Beispielwerte, nicht optimiert, nicht aus dem Video) | „vorheriges Tief/Hoch“ und „Start der Bewegung“ müssen maschinell definiert werden |
| Pivot erst nach `rightBars` **abgeschlossenen** Quellkerzen verwendbar | – | kein Zukunftswissen |
| Gleichstandsregel Pivots: links strikt (`>`/`<`), rechts nicht strikt (`>=`/`<=`) | – | bei gleich hohen Kerzen im linken Fenster zählt nur die **erste**, damit ein Plateau genau einen Pivot ergibt |
| Mindest-Sweep `epsilon = minSweepTicks × syminfo.mintick` | `minSweepTicks = 1` (min. 1) | eine bloße Berührung ist kein Sweep |
| A = jüngstes passendes Gegen-Swing nach L, vor dem Sweep bekannt, zwischen A und Sweep-Kerze **nicht überschritten** | – | sonst wäre A nicht der Start der Bewegung |
| Bestätigung: **spätere** abgeschlossene Quellkerze schließt jenseits von A | – | bewusst **streng und verzögert** – der Sprecher fordert den vollständigen Rücklauf über den Ursprung im Clip **nicht** ausdrücklich |
| Frist `maxBarsToConfirm` | 20 Quellkerzen | ein Sweep ohne Umkehr soll nicht ewig „Kandidat“ bleiben |
| Ungültigkeit nach Bestätigung: B um ≥ 1 Tick gebrochen | – | Struktur ist dann gescheitert; Anker werden **nicht** verschoben |
| Treffer-Unterscheidung berührt / überschritten / Kurslücke | – | Gaps sollen nicht als „gehandelt“ erscheinen |
| kein ATR-, Displacement-, OTE-, FVG-, SMT-, RSI- oder Session-Filter | – | im Clip keine Erkennungskriterien; bewusst **nicht** eingebaut |

### Begriffe

* **L** – bereits vorhandenes Liquiditätsniveau (bestätigtes Swing-Tief im Long-, Swing-Hoch im Short-Szenario)
* **A** – Startpunkt des Manipulation Legs (Level 0)
* **B** – Extrempunkt der Manipulation (Level 1)
* **tSweep** – Sweep-Kerze: erste Quellkerze, die L um mindestens epsilon über- bzw. unterschreitet
* **tConfirm** – Schlusszeit der Quellkerze, deren Close jenseits von A liegt (= ab hier ist die Bestätigung verfügbar)

**Messstrecke ist A–B**, also die Bewegung **zum** Sweep. Die anschließende Gegenbewegung bestätigt nur und bestimmt die
Projektionsrichtung. Sie wird nie selbst als Leg gemessen. Gemessen wird mit High/Low **inklusive Dochten**.

### Richtungen – damit „Long“ nicht verwechselt wird

| | Manipulation (A → B) | Sweep | Bestätigung | Projektion (negative Level) |
|---|---|---|---|---|
| **Long-Szenario** | **abwärts** (Hoch A → Tief B) | `low <= L − epsilon` unter ein Swing-Tief | späterer `close > A` | **oberhalb** von A |
| **Short-Szenario** | **aufwärts** (Tief A → Hoch B) | `high >= L + epsilon` über ein Swing-Hoch | späterer `close < A` | **unterhalb** von A |

Auf dem Chart steht die Richtung deshalb ausdrücklich: Die Bestätigungsmarke lautet
„✓ Long-Szenario bestätigt · Manip. ↓ · Proj. ↑ · Close > A“, das B-Label eines Kandidaten „Kandidat Long (Manip. ↓) – vorläufig“.
Der volle Text „Long-Szenario (Manipulation ↓ · Projektion ↑)“ steht in den Tooltips, in der Statustabelle und in den
`alert()`-Meldungen.

### Ablauf je abgeschlossener Quellkerze n

1. **Bestätigte Legs prüfen** – Projektionstreffer (nur Kerzen nach der Bestätigungskerze), danach Ungültigkeit.
2. **Laufende Kandidaten fortschreiben** – neues tieferes Tief (Long) bzw. höheres Hoch (Short) verschiebt B; dann
   `close` jenseits von A → **bestätigt** (A und B eingefroren), sonst nach `maxBarsToConfirm` Kerzen → **abgelaufen**.
3. **Neue Sweeps suchen** (Long und Short) – alle aktiven, vor n bestätigten Niveaus, die um ≥ epsilon gebrochen wurden. Dazu
   das **jüngste passende A** und davor das **jüngste noch aktive gesweepte L**. Ein Sweep erzeugt nur einen **Kandidaten**.
4. **Gesweepte Niveaus verbrauchen** – erst nachdem beide Richtungen geprüft sind. Ein Tief, das auf dieser Kerze als
   Long-Liquidität fällt, kann auf derselben Kerze noch A eines Short-Szenarios sein. Das Ergebnis hängt so nicht davon ab,
   welche Richtung zuerst rechnet.
5. **Neue Pivots registrieren** – Pivot an Kerze n − rightBars, ab Kerze n + 1 verwendbar.

Zustände: **Suche** (kein laufender Kandidat in dieser Richtung) → **Kandidat** → **bestätigt** → ggf. **ungültig**, oder
Kandidat → **abgelaufen**.

Weitere Regeln:

* **Pro Richtung höchstens ein laufender Kandidat** (strenger als „pro Richtung und Niveau“). Ein weiterer Sweep derselben
  Richtung mit **demselben oder älterem A** erzeugt kein neues Ereignis; die zusätzlich gebrochenen Niveaus werden nur
  verbraucht (Anzeige „L … (+n)“, Zähler „zusammengeführt“). Ein Sweep mit **jüngerem A** ersetzt den laufenden Kandidaten.
  Der alte Kandidat wird dann „abgelaufen (ersetzt durch jüngere Struktur)“. Dasselbe Zusammenführen gilt, wenn die
  **Bestätigungskerze** selbst noch ein tieferes Niveau mit **demselben** A bricht. Sonst entstünde dasselbe Leg (gleiches A,
  gleiches B) ein zweites Mal. Ein älteres A ist dagegen eine andere Struktur und wird als neuer Kandidat angelegt – auf der
  Bestätigungskerze genauso wie eine Kerze später.
* Nach dem **Ablauf** eines Kandidaten (auch auf derselben Kerze) startet ein neuer Sweep eines tieferen Niveaus einen neuen
  Kandidaten mit eigener Frist, auch wenn er dasselbe A verwendet.
* **Gesweepte Niveaus sind verbraucht**, auch wenn kein gültiges A existiert (Zähler „Sweeps ohne gültiges A“). Dadurch
  entsteht für dasselbe Niveau nie ein zweites identisches Ereignis. Gleich tiefe/hohe Pivots, die dieselbe Kerze bricht,
  ergeben **ein** Ereignis (das jüngste L vor A wird angezeigt, die übrigen als „+n“).
* **Sweep und Rücklauf jenseits von A in derselben Kerze** → Kandidat, aber keine Bestätigung. Die Sweep-Kerze darf dafür
  über A reichen. Bestätigen kann erst eine spätere Kerze. Eine Intrabar-Reihenfolge wird nicht angenommen.
* **B** = tiefstes Low (Long) bzw. höchstes High (Short) zwischen A (exklusiv) und aktueller Kandidatenkerze; bei Gleichstand
  bleibt das frühere. Das Low/High der Bestätigungskerze zählt noch mit, danach ist B eingefroren.
* **Prüfungen gegen Fehlstrukturen** erzeugen kein Muster:
  * Zu wenig Historie → keine Pivots, Hinweis „Historie unzureichend“ in der Tabelle.
  * Pivots, die aus dem Rückblick-Puffer fallen, werden ohne Zählung verworfen.
  * Sweeps ohne gültiges A werden gezählt („Sweeps ohne gültiges A“).
  * A = B bzw. A nicht jenseits von B sowie eine falsche zeitliche Ankerreihenfolge (`L < A < B ≤ Sweep`, A vor dem Sweep
    bekannt) werden vor dem Anlegen eines Kandidaten geprüft (Zähler „Strukturfehler“). Bei der gewählten A/L-Auswahl kann
    das nicht eintreten; der Zähler muss 0 bleiben, sonst liegt ein Fehler vor.
  * Eine Lücke in der Folge der Quellkerzen wird über `bar_index[1]` der Quelle erkannt und als Warnung in der Statustabelle
    angezeigt („Quellkerze(n) übersprungen“). Bei zulässigen Zeitrahmen darf das nicht vorkommen.

### Exakte STDV-Berechnung

```
Preis(q) = A + q × (B − A)        → Preis(0) = A, Preis(1) = B, Preis(0.5) = Mitte des Legs
```

Es wird **keine statistische Standardabweichung** einer Kursreihe berechnet. Die negativen Level werden **von A aus**
abgetragen. −1 liegt also eine volle Leglänge jenseits von A und **nicht** auf A.

| q | Long A=100, B=90 | Short A=100, B=110 |
|---|---|---|
| 1 | 90 | 110 |
| 0.5 | 95 | 105 |
| 0 | 100 | 100 |
| −1 | 110 | 90 |
| −1.5 | 115 | 85 |
| −2 | 120 | 80 |
| −2.25 | 122.5 | 77.5 |
| −2.5 | 125 | 75 |
| −3.5 | 135 | 65 |
| −4 | 140 | 60 |
| −4.25 | 142.5 | 57.5 |
| −4.5 | 145 | 55 |

Der Indikator rechnet beide Beispiele bei aktivem „Formel-Selbsttest“ selbst nach und zeigt „OK“ oder „FEHLER“ in der
Tabelle. Angezeigte Preise werden mit `format.mintick` auf die Tick-Genauigkeit des Symbols formatiert. Gerechnet wird
ungerundet.

Die Projektionen sind **Beobachtungsmarken**. Der Clip definiert keine garantierte Reaktion und keine verbindliche
Take-Profit-Regel für einzelne Level.

---

## 2. Code

Der vollständige, zusammenhängende Code steht in [`manipulation_leg_stdv.pine`](manipulation_leg_stdv.pine).

Aufbau: Konstanten → Eingaben → Typen (`Pivot`, `Leg`, `Events`) → globale Puffer → Hilfsfunktionen → Zeichenfunktionen →
Zustandsübergänge (`f_expire`, `f_confirm`, `f_invalidate`, `f_updateConfirmed`, `f_updateCandidate`, `f_detectSweep`,
`f_detectPivots`) → Quelldaten (`request.security`) → Verarbeitung → manueller Modus → Tabelle → Datenfenster → Alarme.

Long und Short laufen durch **dieselbe** Engine. Für das Short-Szenario werden die Preise intern gespiegelt
(`lowD = −high`, `highD = −low`, Anker × −1). Dadurch gelten exakt dieselben Ungleichungen für beide Seiten, und keine Seite
kann versehentlich anders behandelt werden. Gespeichert und gezeichnet werden immer echte Preise.

---

## 3. Einstellungen und Bestätigungsverzögerung

### Gruppe 1 · Quelle
* **Analyse-Zeitrahmen** `5` (Standard) oder `15`: Alle Pivots, Sweeps, Anker und Bestätigungen stammen ausschließlich aus
  abgeschlossenen Kerzen dieses Zeitrahmens. Auf einem kleineren Chart entstehen dadurch **keine** zusätzlichen Muster.
* **Zulässige Charts:** zeitbasierte Kerzen-/Balkencharts (auch Heikin Ashi, siehe Grenzen), deren Zeitrahmen gleich dem
  Analyse-Zeitrahmen ist oder ihn **ohne Rest teilt**: bei 5m → 5m, 1m oder 1S/5S/10S/15S/30S (45S nicht, 300 s ÷ 45 s geht
  nicht auf); bei 15m → 15m, 5m, 3m, 1m oder ein Sekunden-Zeitrahmen, der 900 s teilt (inkl. 45S). Nur dann beginnt jede Quellkerze mit einer Chartkerze, und eine neue Quellkerze erscheint historisch wie in Echtzeit
  auf derselben Chartkerze. Bei größerem oder nicht teilendem Zeitrahmen (z. B. 3m bei 5m-Quelle) sowie auf Renko-, Range-,
  Kagi-, P&F-, Line-Break- und Tick-Charts rechnet das Skript **nicht** und zeigt eine Meldung in der Tabelle.

### Gruppe 2 · Erkennung (technische Ergänzung)
| Einstellung | Standard | Wirkung |
|---|---|---|
| Pivot leftBars / rightBars | 3 / 3 | Fenstergröße der Swing-Erkennung. Größere Werte → weniger, größere Swings und mehr Verzögerung bis zur Verwendbarkeit (= rightBars Quellkerzen) |
| minSweepTicks | 1 | Mindestüberschreitung von L in Ticks |
| maxBarsToConfirm | 20 | Frist (in Quellkerzen nach der Sweep-Kerze) bis zum Ablauf |
| Rückblick-Puffer | 1000 | gespeicherte Quellkerzen (intern mindestens leftBars + rightBars + 2). Ältere Pivots werden verworfen und sind dann weder L noch A |
| Max. Pivots je Seite | 100 | Speichergrenze, älteste fallen heraus |

### Gruppe 3 · Darstellung
Kandidaten gestrichelt (abschaltbar), bestätigte Legs durchgezogen; abgelaufene Kandidaten optional grau stehen lassen;
Historie der letzten **10** bestätigten Legs (max. 20, damit das Limit von 500 Labels bei keiner Einstellung erreicht wird);
STDV-Projektionen für die jüngsten **3** Legs (Linien mit Level und Preis am rechten Ende); optionale Rauten an den
Erkennungszeitpunkten von A und L; Statustabelle; Farben für Long, Short, ungültig/abgelaufen und manuell; Label-Größe.

Die Historie ist **nur Darstellung**. Projektionstreffer und Ungültigkeit werden für bis zu 200 noch gültige bestätigte Legs
weiter überwacht und gemeldet, auch wenn ein Leg nicht mehr gezeichnet ist oder seine Projektionslinien ausgeblendet sind
(„STDV-Projektionen“ aus oder älter als die jüngsten n Legs). Die Tabelle zeigt die Zahl „überwacht“.

### Gruppe 4 · STDV-Level
Jedes der zwölf Level einzeln abschaltbar. Abgeschaltete Level werden weder gezeichnet noch für Trefferalarme geprüft.
Trefferalarme gibt es nur für die negativen Level (die Projektionen). 1, 0.5 und 0 liegen innerhalb des Legs.

### Gruppe 5 · Manueller Kontrollmodus
A (Zeit + Preis) und B (Zeit + Preis) stehen jeweils auf einer gemeinsamen Zeile (`inline = "mA"` / `"mB"`).
Projektionsformel identisch. Beschriftung „manuell“, eigene Farbe, keine Bestätigungsmarke, keine Alarme. Ein manuelles Leg
gilt **nicht** als algorithmisch bestätigt. Richtung: B < A → Long-Szenario, B > A → Short-Szenario. Ein Preis 0 (nicht
gesetzt), A = B (Preis) oder A nicht zeitlich vor B → Hinweis in der Tabelle statt Zeichnung.
Interaktive Punktwahl per Klick: im Code `MANUAL_PICK_ON_CHART = true` setzen. Dann fragt TradingView beim Hinzufügen
des Indikators nach den Punkten A und B (`confirm = true`; Zeit und Preis werden über dieselbe `inline`-Kennung zu einem
Klick verbunden), und „Manuellen Modus aktivieren“ ist dann standardmäßig eingeschaltet. Standardmäßig ist die Punktwahl aus,
damit beim normalen Hinzufügen keine Klicks erzwungen werden. Werte lassen sich jederzeit in den Einstellungen eintragen.

### Gruppe 6 · Meldungen über alert()
Vier Schalter für die fünf Ereignisarten (Long- und Short-Bestätigung teilen sich einen) + optional „abgelaufen“. Sie wirken
nur auf die `alert()`-Meldungen. Daneben gibt es fünf feste `alertcondition()`-Einträge:

| Alarm | Bedingung |
|---|---|
| 1 · Sweep-Kandidat (VORLÄUFIG) | neuer Kandidat, ausdrücklich noch nicht bestätigt |
| 2 · Long-Szenario bestätigt | späterer Close über A |
| 3 · Short-Szenario bestätigt | späterer Close unter A |
| 4 · Projektionslevel nach Bestätigung erreicht | erstes Erreichen eines negativen Levels nach der Bestätigungskerze |
| 5 · Bestätigtes Leg ungültig | B um ≥ 1 Tick gebrochen |

Empfehlung: Alarm mit **„Any alert() function call“** anlegen (detaillierte Meldung mit Ankern, Zeiten und Leveln) oder
einen der `alertcondition()`-Einträge mit Häufigkeit **„Einmal pro Balken“**.

### Bestätigungsverzögerung – wann ist was verfügbar?

| Ereignis | Zeitpunkt im Chart (5m-Quelle) |
|---|---|
| Pivot (A oder L) **liegt** an | seiner Pivot-Kerze (Label sitzt dort) |
| Pivot ist **erkennbar** | Schluss der Kerze `Pivot + rightBars` (Standard: 15 min nach Schluss bzw. (rightBars + 1) × 5 min = 20 min nach Öffnung der Pivot-Kerze) |
| Sweep | passiert innerhalb der Sweep-Kerze, ausgewertet bei deren **Schluss** |
| Bestätigung | Schluss einer **späteren** Kerze mit Close jenseits von A, frühestens 1 Quellkerze nach dem Sweep |

Technisch liest das Skript per
`request.security(syminfo.tickerid, srcTF, [open[1], high[1], low[1], close[1], time[1], time_close[1], bar_index[1]], lookahead = barmerge.lookahead_on)`
(`bar_index[1]` dient nur der Lückenprüfung)
auf jeder Chartkerze die **zuletzt vollständig geschlossene** Quellkerze. Mit `[1]` und `lookahead_on` ist das historisch und
in Echtzeit gleich und enthält keine Zukunftsdaten, sofern der Chart-Zeitrahmen den Analyse-Zeitrahmen teilt (andere werden
abgelehnt, siehe Gruppe 1). Jede neue Quellkerze wird anhand ihrer Öffnungszeit genau **einmal** übernommen. Deshalb erscheint
ein Ereignis auf der **ersten Chartkerze nach Schluss** der auslösenden Quellkerze:

* Chart = Quelle (5m auf 5m): auf der folgenden Kerze, also zum Zeitpunkt `time_close` der auslösenden Kerze.
* Chart kleiner (1m bei 5m-Quelle): auf der ersten 1m-Kerze der nächsten 5m-Periode.

Die grüne/rote Marke „✓ Long-/Short-Szenario bestätigt“ sitzt genau dort. A, B, L und die Sweep-Marke (×) sitzen dagegen an ihren
tatsächlichen Quellkerzen (nachträglich markiert). Ein Bestätigungsalarm kann deshalb nie rückwirkend auf der Sweep-Kerze
erscheinen. `barstate.isconfirmed` wird dafür nicht benutzt.

In Echtzeit läuft das Skript auf jeder Preisänderung erneut. Durch den Pine-Rollback wiederholt sich die Verarbeitung der
neuen Quellkerze auf jedem Tick derselben Chartkerze identisch, und `alert.freq_once_per_bar` meldet sie nur einmal.

---

## 4. A, B und L am Chart überprüfen

Alle Zeiten in Tooltips und Alarmen stehen in der **Börsenzeitzone** des Symbols (`syminfo.timezone`) und tragen den
UTC-Offset (z. B. `2024-01-02 09:35 -0500`). Pine kann die eingestellte Chart-Zeitzone nicht auslesen. Weicht sie ab, die
Uhrzeiten auf der Achse entsprechend umrechnen.

1. Chart auf den Analyse-Zeitrahmen stellen (z. B. 5m), damit jede Quellkerze eine Chartkerze ist.
2. **L**: Label „L · Liquidität“ am Swing-Tief (Long) bzw. Swing-Hoch (Short). Prüfen: Die `leftBars` Kerzen links haben
   ein höheres Low (Long), die `rightBars` Kerzen rechts kein tieferes. Der Tooltip nennt Pivot-Kerze und „erkennbar ab“.
3. **A**: Label „A · Start / 0“. Es liegt **zeitlich nach L** und **über L** (Long). Zwischen A und der Sweep-Kerze
   (exklusiv) hat kein High A überschritten. Die Sweep-Kerze selbst darf über A reichen. A war spätestens zu Beginn der
   Sweep-Kerze erkennbar: Tooltip „erkennbar ab“ ≤ Öffnungszeit der Sweep-Kerze. Gleichheit bedeutet, dass A mit dem Schluss
   der unmittelbar vorhergehenden Kerze bestätigt wurde. Mit „Erkennungszeitpunkte markieren“ ist das als Raute sichtbar.
   Dasselbe gilt für L.
4. **Sweep (×)**: auf der L-Linie an der ersten Kerze, deren Low mindestens `minSweepTicks` Ticks unter L liegt. Eine Kerze,
   die L nur berührt, darf kein × haben.
5. **B**: Label „B · Sweep-Extrem / 1“ am tiefsten Low zwischen A und der Bestätigung. Im Fadenkreuz/Datenfenster das Low
   dieser Kerze ablesen. Es muss mit dem Labelpreis übereinstimmen.
6. **Bestätigung**: Die Marke „✓ … bestätigt“ sitzt auf der Kerze nach der ersten Kerze **nach der Sweep-Kerze**, deren
   Close über A (Long) bzw. unter A (Short) liegt. Die Kerze davor ist die Bestätigungskerze; ihr Close muss jenseits von A
   liegen. Schließt schon die Sweep-Kerze jenseits von A, bestätigt sie trotzdem nicht.
7. **Projektionen**: −1 muss bei `A + (A − B)` liegen (Long), −2 bei `A + 2 × (A − B)` usw. Ein Treffer zeigt „berührt ✓“,
   „überschritten ✓“ oder „per Kurslücke übersprungen ✓“. „vor Bestätigung erreicht“ bedeutet: kein Alarm.
8. **Datenfenster** (Strg+D / Datenfenster-Panel): Zeilen „Letztes Leg: L / A / B / Zustand“, „Long-/Short-Zustand“ und
   „Ereignis: …“ zeigen pro Kerze die Werte, die das Skript wirklich verwendet. „Neue Quellkerze verarbeitet = 1“ markiert
   jede Chartkerze, auf der eine Quellkerze übernommen wurde. Auf einem 1m-Chart darf das höchstens einmal je 5 Minuten
   passieren.
9. **Gegenprobe manuell**: Manuellen Modus aktivieren, A und B per Zeit/Preis auf dieselben Kerzen legen. Die orangen
   Projektionen müssen exakt auf den automatischen liegen.
10. **Bar Replay**: Replay vor einem Muster starten und Kerze für Kerze vorgehen. Der Kandidat erscheint erst nach Schluss der
    Sweep-Kerze. B darf bis zur Bestätigung wandern, danach nicht mehr. Bestätigte Legs dürfen sich beim weiteren Abspielen
    nicht verschieben, nur „ungültig“ werden.

---

## 5. Grenzen der automatischen Interpretation

* Der Clip definiert keine Pivot-Länge, keine Sweep-Mindestgröße, kein numerisches Displacement und keine
  Kerzenschluss-Bestätigung. Alle diese Regeln sind **Programmierannahmen**. Ein diskretionärer Trader kann dasselbe Bild
  anders lesen.
* „Liquidität“ wird nur als **bestätigtes Swing-Hoch/-Tief** modelliert. Session-Hochs/-Tiefs, Equal Highs über mehrere
  Fenster, runde Zahlen oder Orderbuch-Liquidität werden nicht erkannt.
* Die Bestätigung per Close über/unter A ist **streng und spät**. Viele Bewegungen, die ein Trader schon früher als Umkehr
  erkennt, werden erst spät oder gar nicht bestätigt. Gleichzeitig ist ein Close jenseits von A **kein** Beleg für eine
  Fortsetzung.
* Innerhalb einer OHLC-Kerze ist die Reihenfolge von High und Low unbekannt. Deshalb bestätigt die Sweep-Kerze nie selbst.
  Bei einer Kerze, die sowohl ein Projektionslevel erreicht als auch B bricht, werden beide Ereignisse gemeldet, ohne
  Reihenfolge.
* Die Marken für A, B und L sitzen auf einem kleineren Chart an der **Öffnungszeit** der Quellkerze, nicht an der genauen
  Unterkerze, in der das Extrem entstand.
* Ein kleinerer Chart lädt bei gleicher Kerzenzahl weniger Quellkerzen (z. B. 5000 1m-Kerzen ≈ 1000 5m-Kerzen). Muster,
  deren L oder A vor der ersten geladenen Quellkerze liegen, fehlen dort; zusätzliche Muster entstehen nicht. Vergleichbar
  sind nur Bereiche, vor denen beide Charts genug Quellkerzen geladen haben (bis zur Größe des Rückblick-Puffers). Die Tabelle
  zeigt „Puffer ab …“. Dasselbe gilt, wenn beim Zurückscrollen mehr Historie nachgeladen wird.
* Nur Chart-Zeitrahmen, die den Analyse-Zeitrahmen ohne Rest teilen, sowie zeitbasierte Charttypen werden unterstützt.
  Sonst rechnet das Skript nicht (Meldung in der Tabelle).
* Zeiten werden in der Börsenzeitzone mit UTC-Offset ausgegeben, nicht in der Chart-Zeitzone.
* Am rechten Rand gilt: Die letzte geschlossene Quellkerze wird erst ausgewertet, wenn die nächste Kerze beginnt. Bei
  geschlossenem Markt (Wochenende, nach Handelsschluss) erscheint ein Ereignis der letzten Kerze daher erst zur nächsten
  Sitzung.
* Pivots älter als der Rückblick-Puffer werden verworfen. Sehr alte Niveaus werden daher nicht mehr als L erkannt.
* Bei Symbolen mit Kursen außerhalb des Tick-Rasters (z. B. dividendenbereinigte Daten) gelten die Tick-Schwellen nur
  näherungsweise.
* Auf einem Heikin-Ashi-Chart liefert `syminfo.tickerid` Heikin-Ashi-Werte; das Skript rechnet dann mit diesen synthetischen
  Kursen und weist in der Tabelle darauf hin. Für echte OHLC einen Standard-Kerzenchart verwenden. Renko, Range, Kagi, P&F,
  Line Break und Tick-Charts werden abgelehnt.
* Projektionen sind Beobachtungsmarken, keine Handelsregeln. Kein ATR-/Displacement-Filter. Ein solcher Filter wäre eine
  eigene Erweiterung und ist hier bewusst nicht eingebaut.

---

## Prüfprotokoll

**Tatsächlich durchgeführt**

* Python-Referenzmodell (`tests/reference_model.py`) der Pine-Logik inklusive Simulation von
  `request.security(…[1], lookahead_on)` für 5m-auf-5m, 5m-auf-1m und 15m-auf-5m. 41 Tests, alle bestanden:
  * beide Rechenbeispiele (Long A=100/B=90, Short A=100/B=110), −1 ≠ A
  * Long- und Short-Basisszenario: Kandidat auf der Sweep-Kerze, Docht über A ohne Bestätigung, Bestätigung erst bei
    späterem Close, Treffer „berührt“ (−1), „überschritten“ (−1.5), „Kurslücke“ (−2), Rücklauf genau auf B ohne
    Ungültigkeit, Ungültigkeit bei 1 Tick jenseits von B mit unveränderten Ankern; Long/Short exakt spiegelbildlich
  * Berührung ohne Sweep, `minSweepTicks` = 1 und 2
  * Sweep ohne Umkehr → abgelaufen nach genau `maxBarsToConfirm` Kerzen
  * neues Extrem vor der Bestätigung verschiebt B, nach der Bestätigung nicht
  * Sweep und Rücklauf in derselben Kerze → Bestätigung erst auf der Folgekerze
  * vor der Bestätigung erreichtes Level → nie ein Trefferalarm
  * gleich tiefe Pivots → ein Ereignis; jüngere Struktur ersetzt laufenden Kandidaten
  * fehlende Historie
  * 1m-Chart: identische Ereignisse wie auf 5m, jedes genau einmal, jeweils auf der ersten Chartkerze nach Schluss der
    Quellkerze; 15m-Quelle auf 5m-Chart identisch zu 15m-Chart
  * Replay-Stabilität: Für jeden früheren Datenstand sind die Ereignisse identisch zur vollen Historie bis dahin
  * Regressionen: Bestätigungskerze, die zusätzlich ein tieferes Niveau bricht → genau eine Bestätigung; Außenkerze, die
    Short-L sweept und Short-A unterschreitet → Ergebnis unabhängig von der Rechenreihenfolge; Bestätigungskerze, die ein
    Niveau vor einem älteren A bricht → neue Struktur wird angelegt; Pivot-Fenster größer als der eingestellte Puffer
  * Eigenschaften auf 40 Zufallspfaden (1200 Kerzen, Tick 0.25, zufällige Pivot-Längen, Kurslücken): exakte
    Long/Short-Spiegelsymmetrie; 1m-Chart identisch zum 5m-Chart; jede Ungültigkeit genau auf der ersten Kerze, die B um
    ≥ 1 Tick bricht; jeder Projektionstreffer auf der ersten Kerze nach der Bestätigung, die das Level erreicht; bis
    einschließlich der Bestätigungskerze erreichte Level nie gemeldet;
    kein Ereignis doppelt; keine zwei Legs mit identischen Ankern
* Statischer Abgleich von Syntax und API mit der Pine-v6-Referenz (gespiegelte Kopie, siehe oben), zusätzlich eine
  unabhängige Gegenprüfung in vier Bereichen (Syntax/API, MTF/Echtzeit/Alarme, Vollständigkeit gegenüber der Vorgabe,
  Logik-Parität/Laufzeitfehler) mit adversarialer Verifikation jedes Befunds. Bestätigte Befunde wurden behoben: doppelte
  Bestätigung durch eine Außenkerze, Long/Short-Reihenfolgeabhängigkeit, nicht teilende Chart-Zeitrahmen und Renko/Range-
  Charts nicht abgelehnt, Überwachung an die Anzeige-Historie gekoppelt, mögliches Überschreiten des Label-Limits,
  „+n“-Anzeige nicht aktualisiert, Pivot-Fenster größer als Puffer, manueller Tooltip „Status: bestätigt“, Richtungstexte
  auf den Labels, mehrere README-Ungenauigkeiten. Eine zweite Gegenprüfung nur des Korrektur-Diffs fand noch, dass das
  Zusammenführen auf der Bestätigungskerze auch ein älteres A erfasste (jetzt nur noch dasselbe A), sowie veraltete Texte;
  beides ist behoben.

**Nicht durchgeführt**

* Kompilierung im TradingView Pine Editor, Bar Replay, Echtzeit-Alarme. Bitte nach dem Einfügen „Zum Chart hinzufügen“ und
  die Punkte aus Abschnitt 4 einmal im Replay durchgehen.
