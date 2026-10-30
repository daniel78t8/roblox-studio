"""Python-Referenzmodell der Pine-Logik von manipulation_leg_stdv.pine.

Bildet die Zustandsmaschine Funktion für Funktion nach (gleiche Namen, gleiche Reihenfolge),
damit die Szenarien ohne TradingView geprüft werden können. Es ist KEIN Pine-Interpreter:
Ein bestandener Test belegt die Logik des Modells, nicht die Kompilierung des Pine-Codes.

Zeichnungen werden nicht modelliert, nur Zustände, Anker und Ereignisse.
"""

from dataclasses import dataclass, field

ST_SEARCH, ST_CANDIDATE, ST_CONFIRMED, ST_INVALID, ST_EXPIRED = 0, 1, 2, 3, 4
DIR_LONG, DIR_SHORT = 1, -1
HIT_NONE, HIT_PRE, HIT_TOUCH, HIT_EXCEED, HIT_GAP = 0, 1, 2, 3, 4

LEVELS = [1.0, 0.5, 0.0, -1.0, -1.5, -2.0, -2.25, -2.5, -3.5, -4.0, -4.25, -4.5]


def f_level(a, b, q):
    return a + q * (b - a)


@dataclass
class Bar:
    t: int      # Öffnungszeit (ms)
    tc: int     # Schlusszeit (ms)
    o: float
    h: float
    l: float
    c: float


@dataclass
class Pivot:
    idx: int
    t: int
    price: float
    knownIdx: int
    knownT: int


@dataclass
class Leg:
    dir: int
    state: int
    lPrice: float
    lIdx: int
    lT: int
    aPrice: float
    aIdx: int
    aT: int
    aKnownIdx: int
    bPrice: float
    bIdx: int
    bT: int
    sweepIdx: int
    sweepT: int
    extremeD: float
    extraLevels: int
    hitState: list = field(default_factory=lambda: [HIT_NONE] * len(LEVELS))
    confIdx: int = None
    confT: int = None
    confClose: float = None
    endIdx: int = None
    endReason: str = ""


@dataclass
class Event:
    kind: str           # CAND, CONF, HIT, INVALID, EXPIRED
    dir: int
    srcIdx: int         # verarbeitete Quellkerze
    srcTC: int          # Schlusszeit dieser Quellkerze
    chartT: int = None  # Öffnungszeit der Chartkerze, auf der das Ereignis entstand
    a: float = None
    b: float = None
    l: float = None
    detail: dict = field(default_factory=dict)


class Engine:
    def __init__(self, leftBars=3, rightBars=3, minSweepTicks=1, maxBarsToConfirm=20,
                 bufferSize=1000, maxPivots=100, mintick=0.01, levelsOn=None):
        self.leftBars = leftBars
        self.rightBars = rightBars
        self.maxBarsToConfirm = maxBarsToConfirm
        self.bufferSize = bufferSize
        self.BUF_CAP = max(bufferSize, leftBars + rightBars + 2)
        self.MAX_LIVE = 200
        self.maxPivots = maxPivots
        self.TICK = mintick
        self.TOL = mintick * 0.01
        self.EPS = minSweepTicks * mintick
        self.LVL_ON = levelsOn if levelsOn is not None else [True] * len(LEVELS)
        self.buf = []
        self.srcCount = 0
        self.lastSrcT = None
        self.pivHi = []
        self.pivLo = []
        self.cand = [None, None]
        self.confLegs = []      # alle bestätigten Legs (Pine zeichnet davon nur die letzten maxLegs)
        self.liveLegs = []      # überwachte, noch gültige Legs (wie Pine liveLegs)
        self.lastConf = [None, None]
        self.events = []
        self.cnt = [0] * 10
        self._chartT = None

    # ── Puffer ──
    def f_first(self):
        return self.srcCount - len(self.buf)

    def bar(self, i):
        k = i - self.f_first()
        assert 0 <= k < len(self.buf), "Zugriff außerhalb des Puffers"
        return self.buf[k]

    def f_lowD(self, i, d):
        return self.bar(i).l if d == DIR_LONG else -self.bar(i).h

    def f_highD(self, i, d):
        return self.bar(i).h if d == DIR_LONG else -self.bar(i).l

    @staticmethod
    def f_slot(d):
        return 0 if d == DIR_LONG else 1

    def emit(self, kind, g, n, **detail):
        self.events.append(Event(kind, g.dir, n, self.bar(n).tc, self._chartT,
                                 g.aPrice, g.bPrice, g.lPrice, detail))

    # ── Übergänge ──
    def f_expire(self, g, n, reason):
        g.state = ST_EXPIRED
        g.endIdx = n
        g.endReason = reason
        self.cnt[5] += 1
        self.emit("EXPIRED", g, n, reason=reason)

    def f_confirm(self, g, n):
        d = g.dir
        aD, bD = d * g.aPrice, d * g.bPrice
        g.state = ST_CONFIRMED
        g.confIdx = n
        g.confT = self.bar(n).tc
        g.confClose = self.bar(n).c
        for i, q in enumerate(LEVELS):
            if q < 0:
                pD = aD + q * (bD - aD)
                if g.extremeD >= pD - self.TOL:
                    g.hitState[i] = HIT_PRE
        self.liveLegs.append(g)
        if len(self.liveLegs) > self.MAX_LIVE:
            self.liveLegs.pop(0)
        self.lastConf[self.f_slot(d)] = g
        self.confLegs.append(g)
        self.cnt[2 if d == DIR_LONG else 3] += 1
        self.emit("CONF", g, n, pre=[LEVELS[i] for i, s in enumerate(g.hitState) if s == HIT_PRE])

    def f_invalidate(self, g, n):
        g.state = ST_INVALID
        g.endIdx = n
        g.endReason = "B gebrochen"
        self.cnt[4] += 1
        self.emit("INVALID", g, n)

    def f_updateConfirmed(self, g, n):
        if g.state == ST_CONFIRMED and n > g.confIdx:
            d = g.dir
            aD, bD = d * g.aPrice, d * g.bPrice
            hD, lD, oD = self.f_highD(n, d), self.f_lowD(n, d), d * self.bar(n).o
            hits = []
            for i, q in enumerate(LEVELS):
                if q < 0 and self.LVL_ON[i] and g.hitState[i] == HIT_NONE:
                    pD = aD + q * (bD - aD)
                    if hD >= pD - self.TOL:
                        kind = (HIT_GAP if oD >= pD + self.TICK - self.TOL
                                else HIT_EXCEED if hD >= pD + self.TICK - self.TOL else HIT_TOUCH)
                        g.hitState[i] = kind
                        hits.append((q, f_level(g.aPrice, g.bPrice, q), kind))
            if hits:
                self.cnt[6] += 1
                self.emit("HIT", g, n, hits=hits)
            if lD <= bD - self.TICK + self.TOL:
                self.f_invalidate(g, n)

    def f_updateCandidate(self, g, n):
        if g is not None and g.state == ST_CANDIDATE and n > g.sweepIdx:
            d = g.dir
            lD = self.f_lowD(n, d)
            if lD < d * g.bPrice:
                g.bPrice = d * lD
                g.bIdx = n
                g.bT = self.bar(n).t
            g.extremeD = max(g.extremeD, self.f_highD(n, d))
            if d * self.bar(n).c > d * g.aPrice:
                self.f_confirm(g, n)
                self.cand[self.f_slot(d)] = None
            elif n - g.sweepIdx >= self.maxBarsToConfirm:
                self.f_expire(g, n, "Frist")
                self.cand[self.f_slot(d)] = None

    def f_detectSweep(self, n, d):
        liq = self.pivLo if d == DIR_LONG else self.pivHi
        orig = self.pivHi if d == DIR_LONG else self.pivLo
        lowN = self.f_lowD(n, d)
        swept = [i for i, p in enumerate(liq) if p.knownIdx < n and lowN <= d * p.price - self.EPS + self.TOL]
        if not swept:
            return swept
        selA = selL = None
        runMax = None
        scan = n - 1
        for k in range(len(orig) - 1, -1, -1):
            pa = orig[k]
            if pa.knownIdx < n:
                while scan > pa.idx:
                    hv = self.f_highD(scan, d)
                    runMax = hv if runMax is None else max(runMax, hv)
                    scan -= 1
                aD = d * pa.price
                if runMax is None or runMax <= aD:
                    for s in range(len(swept) - 1, -1, -1):
                        pl = liq[swept[s]]
                        if pl.idx < pa.idx and d * pl.price < aD:
                            selA, selL = pa, pl
                            break
            if selA is not None:
                break
        nSwept = len(swept)
        run = self.cand[self.f_slot(d)]
        running = run is not None and run.state == ST_CANDIDATE
        lc = self.lastConf[self.f_slot(d)]
        justConf = lc is not None and lc.confIdx == n
        if selA is None:
            self.cnt[7] += 1
        elif running and selA.idx <= run.aIdx:
            run.extraLevels += nSwept
            self.cnt[9] += 1
        elif justConf and selA.idx == lc.aIdx:
            lc.extraLevels += nSwept
            self.cnt[9] += 1
        else:
            bD = None
            bIdx = None
            for j in range(selA.idx + 1, n + 1):
                lv = self.f_lowD(j, d)
                if bD is None or lv < bD:
                    bD, bIdx = lv, j
            aD = d * selA.price
            orderOk = selL.idx < selA.idx and selA.knownIdx < n and selA.idx < bIdx <= n
            if not orderOk or aD - bD <= 0:
                self.cnt[8] += 1
            else:
                if running:
                    self.f_expire(run, n, "ersetzt")
                g = Leg(dir=d, state=ST_CANDIDATE, lPrice=selL.price, lIdx=selL.idx, lT=selL.t,
                        aPrice=selA.price, aIdx=selA.idx, aT=selA.t, aKnownIdx=selA.knownIdx,
                        bPrice=d * bD, bIdx=bIdx, bT=self.bar(bIdx).t,
                        sweepIdx=n, sweepT=self.bar(n).t, extremeD=self.f_highD(n, d),
                        extraLevels=nSwept - 1)
                self.cand[self.f_slot(d)] = g
                self.cnt[0 if d == DIR_LONG else 1] += 1
                self.emit("CAND", g, n)
        return swept

    def f_detectPivots(self, n):
        p = n - self.rightBars
        if p - self.leftBars >= self.f_first():
            hp, lp = self.bar(p).h, self.bar(p).l
            isH = isL = True
            for i in range(1, self.leftBars + 1):
                if self.bar(p - i).h >= hp:
                    isH = False
                if self.bar(p - i).l <= lp:
                    isL = False
            for i in range(1, self.rightBars + 1):
                if self.bar(p + i).h > hp:
                    isH = False
                if self.bar(p + i).l < lp:
                    isL = False
            if isH:
                self.pivHi.append(Pivot(p, self.bar(p).t, hp, n, self.bar(n).tc))
                if len(self.pivHi) > self.maxPivots:
                    self.pivHi.pop(0)
            if isL:
                self.pivLo.append(Pivot(p, self.bar(p).t, lp, n, self.bar(n).tc))
                if len(self.pivLo) > self.maxPivots:
                    self.pivLo.pop(0)

    # ── Eine Chartkerze: Ergebnis von request.security(..., [..][1], lookahead_on) ──
    def on_chart_bar(self, chartT, src):
        """src = zuletzt abgeschlossene Quellkerze (oder None). Entspricht dem `if newSrc`-Block."""
        self._chartT = chartT
        if src is None or (self.lastSrcT is not None and src.t <= self.lastSrcT):
            return False
        self.lastSrcT = src.t
        self.buf.append(src)
        self.srcCount += 1
        if len(self.buf) > self.BUF_CAP:
            self.buf.pop(0)
            first = self.f_first()
            while self.pivHi and self.pivHi[0].idx < first:
                self.pivHi.pop(0)
            while self.pivLo and self.pivLo[0].idx < first:
                self.pivLo.pop(0)
        n = self.srcCount - 1
        for g in self.liveLegs:
            self.f_updateConfirmed(g, n)
        self.liveLegs = [g for g in self.liveLegs if g.state == ST_CONFIRMED]
        self.f_updateCandidate(self.cand[0], n)
        self.f_updateCandidate(self.cand[1], n)
        swL = self.f_detectSweep(n, DIR_LONG)
        swS = self.f_detectSweep(n, DIR_SHORT)
        for s in reversed(swL):     # erst nach beiden Richtungen verbrauchen
            del self.pivLo[s]
        for s in reversed(swS):
            del self.pivHi[s]
        self.f_detectPivots(n)
        return True


# ── Chartsimulation ─────────────────────────────────────────────────────────

MIN = 60_000


def make_src_bars(ohlc, tf_min=5, t0=1_704_153_600_000):
    """ohlc: Liste (o, h, l, c) → Quellkerzen mit lückenloser Zeitachse."""
    return [Bar(t0 + i * tf_min * MIN, t0 + (i + 1) * tf_min * MIN, *row) for i, row in enumerate(ohlc)]


def split_to_lower(src_bars, tf_src=5, tf_chart=1):
    """Zerlegt jede Quellkerze in Chartkerzen, deren Aggregat wieder exakt die Quellkerze ergibt.
    Pfad: open → (low, high) bzw. (high, low) → close, je nach Kerzenfarbe."""
    k = tf_src // tf_chart
    out = []
    for b in src_bars:
        if k == 1:
            out.append(b)
            continue
        first, second = (b.l, b.h) if b.c >= b.o else (b.h, b.l)
        path = [b.o, first, second, b.c] + [b.c] * (k - 3)   # k Segmente: o→first→second→c, danach flach
        for j in range(k):
            t = b.t + j * tf_chart * MIN
            o, c = path[j], path[j + 1]
            out.append(Bar(t, t + tf_chart * MIN, o, max(o, c), min(o, c), c))
        chunk = out[-k:]
        assert chunk[0].o == b.o and chunk[-1].c == b.c
        assert max(x.h for x in chunk) == b.h and min(x.l for x in chunk) == b.l, "Aggregat stimmt nicht"
    return out


def run_on_chart(src_bars, chart_bars, **engine_kw):
    """Simuliert request.security(sym, srcTF, x[1], lookahead_on): Auf jeder Chartkerze ist die Quellkerze
    sichtbar, die VOR der Quellkerze liegt, in der die Chartkerze beginnt."""
    eng = Engine(**engine_kw)
    starts = [b.t for b in src_bars]
    import bisect
    processed_on = []
    for cb in chart_bars:
        pos = bisect.bisect_right(starts, cb.t) - 1   # Quellkerze, die diese Chartkerze enthält
        src = src_bars[pos - 1] if pos - 1 >= 0 else None
        # Kein Zukunftswissen: die sichtbare Quellkerze muss vor Beginn der Chartkerze geschlossen sein.
        assert src is None or src.tc <= cb.t
        if eng.on_chart_bar(cb.t, src):
            processed_on.append(cb.t)
    return eng, processed_on
