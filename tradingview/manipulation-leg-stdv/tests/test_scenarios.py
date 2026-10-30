"""Szenariotests für das Referenzmodell (python3 -m unittest discover -s tests -v).

Die Tests prüfen die Regeln aus der Aufgabenstellung am Python-Modell der Pine-Logik.
Sie ersetzen weder die Kompilierung in TradingView noch einen Bar-Replay-Test.
"""

import unittest

from reference_model import (DIR_LONG, DIR_SHORT, HIT_EXCEED, HIT_GAP, HIT_PRE, HIT_TOUCH, LEVELS,
                             f_level, make_src_bars, run_on_chart, split_to_lower)

# Basisszenario Long (Quellzeitrahmen 5m, mintick 0.01): L = 91.00 (#5), A = 100.00 (#10),
# Sweep #16 (Low 90.00), Docht über A ohne Close darüber (#19), Bestätigung #20,
# danach Berührung von −1, Überschreitung von −1.5, Kurslücke über −2, Rücklauf genau auf B (#30),
# Bruch von B um einen Tick (#31).
BASE_LONG = [
    (97.0, 97.5, 96.5, 97.0),      # 0
    (97.0, 97.2, 96.0, 96.2),      # 1
    (96.2, 96.4, 94.5, 94.8),      # 2
    (94.8, 95.0, 93.0, 93.2),      # 3
    (93.2, 93.5, 92.0, 92.2),      # 4
    (92.2, 92.5, 91.0, 92.0),      # 5  L-Swing-Tief 91.00
    (92.0, 94.0, 91.5, 93.8),      # 6
    (93.8, 96.0, 93.5, 95.8),      # 7
    (95.8, 98.0, 95.5, 97.8),      # 8  L erkennbar
    (97.8, 99.0, 97.5, 98.8),      # 9
    (98.8, 100.0, 98.5, 99.0),     # 10 A-Swing-Hoch 100.00
    (99.0, 99.5, 97.0, 97.5),      # 11
    (97.5, 98.0, 95.0, 95.5),      # 12
    (95.5, 96.0, 93.0, 93.5),      # 13 A erkennbar
    (93.5, 94.0, 92.0, 92.5),      # 14
    (92.5, 93.0, 91.2, 91.5),      # 15
    (91.5, 92.0, 90.0, 91.8),      # 16 Sweep
    (91.8, 95.0, 91.5, 94.8),      # 17
    (94.8, 98.0, 94.5, 97.5),      # 18
    (97.5, 100.5, 97.0, 99.8),     # 19 Docht über A, Close darunter
    (99.8, 101.0, 99.5, 100.5),    # 20 Close über A → bestätigt
    (100.5, 104.0, 100.0, 103.5),  # 21
    (103.5, 108.0, 103.0, 107.5),  # 22
    (107.5, 110.0, 107.0, 109.5),  # 23 −1 = 110.00 berührt
    (109.5, 115.5, 109.0, 115.0),  # 24 −1.5 = 115.00 überschritten
    (121.0, 121.5, 120.8, 121.2),  # 25 Kurslücke über −2 = 120.00
    (121.2, 122.0, 119.0, 120.0),  # 26 −2.25 = 122.50 nicht erreicht
    (120.0, 120.5, 110.0, 111.0),  # 27
    (111.0, 111.5, 100.0, 101.0),  # 28
    (101.0, 101.5, 92.0, 93.0),    # 29
    (93.0, 93.5, 90.0, 91.0),      # 30 Low = B genau → keine Ungültigkeit
    (91.0, 92.0, 89.99, 91.5),     # 31 B um 1 Tick unterschritten → ungültig
    (91.5, 92.0, 91.0, 91.8),      # 32 Abschlusskerze: erst mit ihrem Beginn ist #31 ausgewertet
]


def mirror(rows, axis=200.0):
    """Spiegelt ein Szenario an `axis`: Long-Szenario ↔ Short-Szenario."""
    return [(round(axis - o, 2), round(axis - l, 2), round(axis - h, 2), round(axis - c, 2)) for o, h, l, c in rows]


def run5(rows, **kw):
    src = make_src_bars(rows, 5)
    return run_on_chart(src, src, **kw)


def run1(rows, **kw):
    src = make_src_bars(rows, 5)
    return run_on_chart(src, split_to_lower(src, 5, 1), **kw)


def evs(eng, kind=None, d=None):
    return [e for e in eng.events if (kind is None or e.kind == kind) and (d is None or e.dir == d)]


def sig(e):
    """Vergleichbare Signatur eines Ereignisses (ohne Chartzeit)."""
    det = tuple(sorted((k, str(v)) for k, v in e.detail.items()))
    return (e.kind, e.dir, e.srcIdx, e.srcTC, e.a, e.b, e.l, det)


class FormulaTests(unittest.TestCase):
    def test_long_example(self):
        exp = [90, 95, 100, 110, 115, 120, 122.5, 125, 135, 140, 142.5, 145]
        self.assertEqual([round(f_level(100.0, 90.0, q), 10) for q in LEVELS], exp)

    def test_short_example(self):
        exp = [110, 105, 100, 90, 85, 80, 77.5, 75, 65, 60, 57.5, 55]
        self.assertEqual([round(f_level(100.0, 110.0, q), 10) for q in LEVELS], exp)

    def test_minus_one_is_not_just_origin(self):
        # −1 liegt eine volle Leglänge jenseits von A, nicht auf A.
        self.assertEqual(f_level(100.0, 90.0, -1.0), 110.0)
        self.assertNotEqual(f_level(100.0, 90.0, -1.0), 100.0)


class LongScenario(unittest.TestCase):
    def setUp(self):
        self.eng, _ = run5(BASE_LONG)

    def test_candidate_on_sweep_bar(self):
        c = evs(self.eng, "CAND", DIR_LONG)
        self.assertEqual(c[0].srcIdx, 16)
        self.assertEqual((c[0].l, c[0].a, c[0].b), (91.0, 100.0, 90.0))

    def test_wick_above_a_does_not_confirm(self):
        conf = evs(self.eng, "CONF", DIR_LONG)
        self.assertNotIn(19, [e.srcIdx for e in conf])

    def test_confirmation_on_later_close_above_a(self):
        conf = evs(self.eng, "CONF", DIR_LONG)
        self.assertEqual(conf[0].srcIdx, 20)
        self.assertEqual((conf[0].a, conf[0].b, conf[0].l), (100.0, 90.0, 91.0))
        self.assertEqual(conf[0].detail["pre"], [])

    def test_projection_hits_touch_exceed_gap(self):
        hits = evs(self.eng, "HIT", DIR_LONG)
        flat = [(e.srcIdx, q, round(p, 6), k) for e in hits for (q, p, k) in e.detail["hits"]]
        self.assertIn((23, -1.0, 110.0, HIT_TOUCH), flat)
        self.assertIn((24, -1.5, 115.0, HIT_EXCEED), flat)
        self.assertIn((25, -2.0, 120.0, HIT_GAP), flat)
        self.assertNotIn(-2.25, [q for (i, q, p, k) in flat if i <= 26])
        # jedes Level höchstens einmal je Leg
        first_leg = [x for x in flat if x[0] < 31]
        self.assertEqual(len({x[1] for x in first_leg}), len(first_leg))

    def test_no_hits_before_confirmation(self):
        self.assertTrue(all(e.srcIdx > 20 for e in evs(self.eng, "HIT", DIR_LONG)))

    def test_return_exactly_to_b_is_not_invalid(self):
        self.assertNotIn(30, [e.srcIdx for e in evs(self.eng, "INVALID")])

    def test_invalid_one_tick_beyond_b_keeps_anchors(self):
        inv = evs(self.eng, "INVALID", DIR_LONG)
        self.assertEqual(inv[0].srcIdx, 31)
        self.assertEqual((inv[0].a, inv[0].b), (100.0, 90.0))
        leg = self.eng.confLegs[0]
        self.assertEqual((leg.aPrice, leg.bPrice, leg.confIdx), (100.0, 90.0, 20))

    def test_touching_new_level_l_is_not_a_sweep(self):
        # #16 bildet ein Swing-Tief 90.00. #30 berührt es genau → kein Kandidat auf #30.
        self.assertNotIn(30, [e.srcIdx for e in evs(self.eng, "CAND", DIR_LONG)])

    def test_swept_level_is_consumed(self):
        # L = 91.00 (#5) darf kein zweites Kandidatenereignis erzeugen.
        self.assertEqual(sum(1 for e in evs(self.eng, "CAND", DIR_LONG) if e.l == 91.0), 1)


class ShortScenario(unittest.TestCase):
    def setUp(self):
        self.eng, _ = run5(mirror(BASE_LONG))

    def test_candidate_and_confirmation(self):
        c = evs(self.eng, "CAND", DIR_SHORT)
        self.assertEqual((c[0].srcIdx, c[0].l, c[0].a, c[0].b), (16, 109.0, 100.0, 110.0))
        conf = evs(self.eng, "CONF", DIR_SHORT)
        self.assertEqual((conf[0].srcIdx, conf[0].a, conf[0].b), (20, 100.0, 110.0))

    def test_projection_hits_below_a(self):
        hits = evs(self.eng, "HIT", DIR_SHORT)
        flat = [(e.srcIdx, q, round(p, 6), k) for e in hits for (q, p, k) in e.detail["hits"]]
        self.assertIn((23, -1.0, 90.0, HIT_TOUCH), flat)
        self.assertIn((24, -1.5, 85.0, HIT_EXCEED), flat)
        self.assertIn((25, -2.0, 80.0, HIT_GAP), flat)

    def test_invalid(self):
        inv = evs(self.eng, "INVALID", DIR_SHORT)
        self.assertEqual((inv[0].srcIdx, inv[0].a, inv[0].b), (31, 100.0, 110.0))

    def test_symmetry_with_long(self):
        lng, _ = run5(BASE_LONG)
        a = [(e.kind, e.srcIdx) for e in lng.events]
        b = [(e.kind, e.srcIdx) for e in self.eng.events]
        self.assertEqual(a, b)
        self.assertTrue(all(x.dir == -y.dir for x, y in zip(lng.events, self.eng.events)))


class EdgeCases(unittest.TestCase):
    def test_touch_without_sweep(self):
        rows = list(BASE_LONG)
        rows[16] = (91.5, 92.0, 91.0, 91.8)          # Low = L genau
        eng, _ = run5(rows[:20])
        self.assertEqual(evs(eng, "CAND", DIR_LONG), [])

    def test_one_tick_is_enough_by_default(self):
        rows = list(BASE_LONG)
        rows[16] = (91.5, 92.0, 90.99, 91.8)
        eng, _ = run5(rows[:20])
        self.assertEqual(evs(eng, "CAND", DIR_LONG)[0].srcIdx, 16)

    def test_min_sweep_ticks(self):
        rows = list(BASE_LONG)
        rows[16] = (91.5, 92.0, 90.99, 91.8)
        eng, _ = run5(rows[:20], minSweepTicks=2)
        self.assertEqual(evs(eng, "CAND", DIR_LONG), [])
        rows[16] = (91.5, 92.0, 90.98, 91.8)
        eng, _ = run5(rows[:20], minSweepTicks=2)
        self.assertEqual(evs(eng, "CAND", DIR_LONG)[0].srcIdx, 16)

    def test_sweep_without_reversal_expires(self):
        rows = BASE_LONG[:17] + [(92.0, 92.5, 91.5, 92.0)] * 25
        eng, _ = run5(rows)
        self.assertEqual(evs(eng, "CONF"), [])
        exp = evs(eng, "EXPIRED", DIR_LONG)
        self.assertEqual(len(exp), 1)
        self.assertEqual(exp[0].srcIdx, 16 + 20)
        self.assertEqual(exp[0].detail["reason"], "Frist")

    def test_expiry_respects_setting(self):
        rows = BASE_LONG[:17] + [(92.0, 92.5, 91.5, 92.0)] * 25
        eng, _ = run5(rows, maxBarsToConfirm=5)
        self.assertEqual(evs(eng, "EXPIRED", DIR_LONG)[0].srcIdx, 21)

    def test_new_extreme_before_confirmation_moves_b(self):
        rows = list(BASE_LONG)
        rows[17] = (91.8, 95.0, 89.5, 94.8)
        eng, _ = run5(rows)
        conf = evs(eng, "CONF", DIR_LONG)[0]
        self.assertEqual((conf.srcIdx, conf.a, conf.b), (20, 100.0, 89.5))
        self.assertEqual(eng.confLegs[0].bIdx, 17)
        # Kandidatenereignis bleibt beim ursprünglichen B (vorläufig), Bestätigung nutzt das neue B.
        self.assertEqual(evs(eng, "CAND", DIR_LONG)[0].b, 90.0)

    def test_new_extreme_after_confirmation_does_not_move_anchors(self):
        eng, _ = run5(BASE_LONG)
        leg = eng.confLegs[0]
        self.assertEqual((leg.aPrice, leg.bPrice, leg.aIdx, leg.bIdx), (100.0, 90.0, 10, 16))

    def test_same_bar_sweep_and_return_needs_later_bar(self):
        rows = BASE_LONG[:16] + [(91.5, 100.8, 90.0, 100.5), (100.5, 102.0, 100.2, 101.5)] + [(101.5, 102.0, 101.0, 101.5)] * 3
        eng, _ = run5(rows)
        cand = evs(eng, "CAND", DIR_LONG)
        conf = evs(eng, "CONF", DIR_LONG)
        self.assertEqual(cand[0].srcIdx, 16)
        self.assertEqual(conf[0].srcIdx, 17)
        self.assertNotIn(16, [e.srcIdx for e in conf])

    def test_level_reached_before_confirmation_never_alerts(self):
        rows = list(BASE_LONG)
        rows[19] = (97.5, 111.0, 97.0, 99.8)          # Docht bis über −1 (110), Close unter A
        rows[23] = (107.5, 112.0, 107.0, 109.5)       # später erneut über −1
        eng, _ = run5(rows)
        conf = evs(eng, "CONF", DIR_LONG)[0]
        self.assertEqual(conf.detail["pre"], [-1.0])
        self.assertEqual(eng.confLegs[0].hitState[LEVELS.index(-1.0)], HIT_PRE)
        later = [q for e in evs(eng, "HIT", DIR_LONG) for (q, p, k) in e.detail["hits"]]
        self.assertNotIn(-1.0, later)

    def test_equal_lows_produce_one_event(self):
        rows = list(BASE_LONG)
        # zweites Swing-Tief mit exakt 91.00 bei #1 (älter als #5, weit genug entfernt)
        rows = [(97.0, 97.5, 96.5, 97.0), (97.0, 97.5, 96.5, 97.0), (97.0, 97.5, 96.5, 97.0),
                (96.0, 96.5, 91.0, 92.0), (92.0, 96.4, 92.0, 96.0), (96.0, 96.5, 95.0, 95.5),
                (95.5, 96.0, 94.0, 94.5)] + BASE_LONG[2:]
        eng, _ = run5(rows)
        cand = evs(eng, "CAND", DIR_LONG)
        sweeps_at = [e.srcIdx for e in cand if e.l == 91.0]
        self.assertEqual(len(sweeps_at), 1)
        self.assertEqual(eng.confLegs[0].extraLevels, 1)

    def test_missing_history(self):
        eng, _ = run5(BASE_LONG[:5])
        self.assertEqual(eng.events, [])
        self.assertEqual(eng.pivHi + eng.pivLo, [])

    def test_younger_structure_replaces_running_candidate(self):
        # Kandidat 1 (A=100) läuft; Preis bildet ein tieferes Hoch A2=95.6 und sweept danach das neue
        # Swing-Tief 90.00 (#16) → neue Struktur ersetzt Kandidat 1.
        rows = BASE_LONG[:17] + [
            (91.8, 93.0, 91.5, 92.8),   # 17
            (92.8, 94.5, 92.5, 94.2),   # 18
            (94.2, 95.6, 94.0, 95.0),   # 19 A2
            (95.0, 95.2, 93.0, 93.2),   # 20
            (93.2, 93.5, 92.0, 92.2),   # 21
            (92.2, 92.5, 91.0, 91.2),   # 22 A2 erkennbar mit Schluss von #22
            (91.2, 91.5, 89.8, 90.5),   # 23 Sweep von 90.00 (#16)
            (90.5, 96.0, 90.4, 95.8),   # 24 Close über A2 → Bestätigung der jüngeren Struktur
            (95.8, 96.0, 95.0, 95.5),   # 25 Abschlusskerze
        ]
        eng, _ = run5(rows)
        cand = evs(eng, "CAND", DIR_LONG)
        self.assertEqual([(e.srcIdx, e.a) for e in cand], [(16, 100.0), (23, 95.6)])
        self.assertEqual([e.detail["reason"] for e in evs(eng, "EXPIRED", DIR_LONG)], ["ersetzt"])
        conf = evs(eng, "CONF", DIR_LONG)
        self.assertEqual([(e.srcIdx, e.a, e.b, e.l) for e in conf], [(24, 95.6, 89.8, 90.0)])


class TimeframeTests(unittest.TestCase):
    def test_1m_chart_gives_identical_events_exactly_once(self):
        e5, _ = run5(BASE_LONG)
        e1, processed = run1(BASE_LONG)
        self.assertEqual([sig(e) for e in e1.events], [sig(e) for e in e5.events])
        sigs = [sig(e) for e in e1.events]
        self.assertEqual(len(sigs), len(set(sigs)), "doppelte Ereignisse auf dem 1m-Chart")
        self.assertEqual(len(processed), len(set(processed)))

    def test_event_appears_when_source_bar_has_closed(self):
        e1, _ = run1(BASE_LONG)
        for e in e1.events:
            # Erste 1m-Kerze nach Schluss der Quellkerze – nie früher (kein Zukunftswissen), nie die Sweep-Kerze.
            self.assertEqual(e.chartT, e.srcTC)
        conf = evs(e1, "CONF", DIR_LONG)[0]
        cand = evs(e1, "CAND", DIR_LONG)[0]
        self.assertGreater(conf.chartT, cand.chartT)

    def test_15m_source_on_5m_chart(self):
        src15 = make_src_bars(BASE_LONG, 15)
        chart5 = split_to_lower(src15, 15, 5)
        e15, _ = run_on_chart(src15, src15)
        e5, _ = run_on_chart(src15, chart5)
        self.assertEqual([sig(e) for e in e5.events], [sig(e) for e in e15.events])

    def test_confirmed_history_is_stable_when_more_data_arrives(self):
        # Mit weniger Daten (früherer Replay-Zeitpunkt) entstehen exakt dieselben Ereignisse wie in der
        # vollen Historie bis zu diesem Zeitpunkt – nichts wird nachträglich verschoben oder gelöscht.
        full, _ = run1(BASE_LONG)
        for cut in range(5, len(BASE_LONG) + 1):
            part, _ = run1(BASE_LONG[:cut])
            self.assertEqual([sig(e) for e in part.events],
                             [sig(e) for e in full.events if e.srcIdx <= cut - 2])

    def test_deterministic(self):
        a, _ = run1(BASE_LONG)
        b, _ = run1(BASE_LONG)
        self.assertEqual([sig(e) for e in a.events], [sig(e) for e in b.events])


if __name__ == "__main__":
    unittest.main()
