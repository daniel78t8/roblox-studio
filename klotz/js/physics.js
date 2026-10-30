/*!
 * Klotz – Mini-Physik-Engine (Vanilla JS, keine Abhängigkeiten)
 *
 * 2D-Starrkörper mit Boxen (beliebig rotiert) und Kreisen, statischen und
 * dynamischen Körpern, Reibung und Warm-Starting. Der Sequential-Impulse-Solver
 * und die Box-Box-Kollision (Clipping) sind ein Port von "Box2D Lite"
 * (c) 2006-2007 Erin Catto, http://www.box2d.org – die Erlaubnis zur freien
 * Nutzung setzt voraus, dass dieser Hinweis erhalten bleibt.
 * Kreis-Kollisionen, Dämpfung und die JS-API sind Ergänzungen für Klotz.
 *
 * Koordinaten: y zeigt nach UNTEN (wie im Canvas), Einheiten sind "Meter".
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Vektor- und Matrix-Helfer
  // ---------------------------------------------------------------------------
  const vec = (x, y) => ({ x: x, y: y });
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const cross = (a, b) => a.x * b.y - a.y * b.x;

  // 2x2-Rotationsmatrix mit den Spalten (ax, ay) und (bx, by)
  function mat(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { ax: c, ay: s, bx: -s, by: c };
  }
  const mulMV = (m, p) => vec(m.ax * p.x + m.bx * p.y, m.ay * p.x + m.by * p.y);
  const mulMTV = (m, p) => vec(m.ax * p.x + m.ay * p.y, m.bx * p.x + m.by * p.y);
  const transpose = (m) => ({ ax: m.ax, ay: m.bx, bx: m.ay, by: m.by });
  const absM = (m) => ({ ax: Math.abs(m.ax), ay: Math.abs(m.ay), bx: Math.abs(m.bx), by: Math.abs(m.by) });
  function mulMM(a, b) {
    const c1 = mulMV(a, vec(b.ax, b.ay));
    const c2 = mulMV(a, vec(b.bx, b.by));
    return { ax: c1.x, ay: c1.y, bx: c2.x, by: c2.y };
  }

  // ---------------------------------------------------------------------------
  // Körper
  // ---------------------------------------------------------------------------
  let nextBodyId = 1;

  class Body {
    /**
     * @param {object} o
     *   shape: 'box' | 'circle'
     *   x, y, angle        Position (Mittelpunkt) und Rotation in Radiant
     *   w, h               Breite/Höhe (Box)   r  Radius (Kreis)
     *   isStatic           unbeweglich (Boden, Wände)
     *   density, friction
     *   data               beliebige Spieldaten (Typ, ID, Farbe …)
     */
    constructor(o) {
      this.id = nextBodyId++;
      this.shape = o.shape === 'circle' ? 'circle' : 'box';
      this.pos = vec(o.x || 0, o.y || 0);
      this.angle = o.angle || 0;
      this.vel = vec(0, 0);
      this.angVel = 0;
      this.friction = o.friction != null ? o.friction : 0.5;
      this.isStatic = !!o.isStatic;
      this.data = o.data || {};

      let area;
      if (this.shape === 'circle') {
        this.r = o.r;
        this.boundR = o.r;
        area = Math.PI * o.r * o.r;
      } else {
        this.hw = o.w / 2;
        this.hh = o.h / 2;
        this.boundR = Math.hypot(this.hw, this.hh);
        area = o.w * o.h;
      }

      if (this.isStatic) {
        this.mass = Infinity;
        this.invMass = 0;
        this.invI = 0;
      } else {
        const m = (o.density || 1) * area;
        const I = this.shape === 'circle'
          ? 0.5 * m * o.r * o.r
          : m * (o.w * o.w + o.h * o.h) / 12;
        this.mass = m;
        this.invMass = 1 / m;
        this.invI = 1 / I;
      }
    }

    /** Liegt der Weltpunkt p (mit Toleranz pad) innerhalb des Körpers? */
    containsPoint(p, pad) {
      pad = pad || 0;
      const dx = p.x - this.pos.x, dy = p.y - this.pos.y;
      if (this.shape === 'circle') return dx * dx + dy * dy <= (this.r + pad) * (this.r + pad);
      const local = mulMTV(mat(this.angle), vec(dx, dy));
      return Math.abs(local.x) <= this.hw + pad && Math.abs(local.y) <= this.hh + pad;
    }

    /** Abstand von p zur Oberfläche (negativ = innen). */
    distanceTo(p) {
      const dx = p.x - this.pos.x, dy = p.y - this.pos.y;
      if (this.shape === 'circle') return Math.hypot(dx, dy) - this.r;
      const local = mulMTV(mat(this.angle), vec(dx, dy));
      const qx = Math.abs(local.x) - this.hw, qy = Math.abs(local.y) - this.hh;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
    }
  }

  // ---------------------------------------------------------------------------
  // Kollision Box–Box (Box2D Lite: SAT + Clipping, liefert bis zu 2 Kontakte)
  // ---------------------------------------------------------------------------
  //        e1
  //   v2 ------ v1        Kanten/Ecken-Nummerierung für die Feature-IDs,
  //    |        |         über die Kontakte zwischen Frames wiedererkannt
  // e2 |        | e4      werden (Warm-Starting).
  //   v3 ------ v4
  //        e3
  const NO_EDGE = 0, EDGE1 = 1, EDGE2 = 2, EDGE3 = 3, EDGE4 = 4;
  const FACE_A_X = 0, FACE_A_Y = 1, FACE_B_X = 2, FACE_B_Y = 3;

  const clipVertex = (x, y, in2, out2) => ({ v: vec(x, y), fp: { in1: NO_EDGE, out1: NO_EDGE, in2: in2, out2: out2 } });
  const copyFp = (fp) => ({ in1: fp.in1, out1: fp.out1, in2: fp.in2, out2: fp.out2 });
  const featureKey = (fp) => fp.in1 | (fp.out1 << 4) | (fp.in2 << 8) | (fp.out2 << 12);

  function clipSegmentToLine(vIn, normal, offset, clipEdge) {
    const out = [];
    const d0 = dot(normal, vIn[0].v) - offset;
    const d1 = dot(normal, vIn[1].v) - offset;
    if (d0 <= 0) out.push({ v: vIn[0].v, fp: copyFp(vIn[0].fp) });
    if (d1 <= 0) out.push({ v: vIn[1].v, fp: copyFp(vIn[1].fp) });
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      const p = vec(vIn[0].v.x + t * (vIn[1].v.x - vIn[0].v.x), vIn[0].v.y + t * (vIn[1].v.y - vIn[0].v.y));
      let fp;
      if (d0 > 0) {
        fp = copyFp(vIn[0].fp);
        fp.in1 = clipEdge;
        fp.in2 = NO_EDGE;
      } else {
        fp = copyFp(vIn[1].fp);
        fp.out1 = clipEdge;
        fp.out2 = NO_EDGE;
      }
      out.push({ v: p, fp: fp });
    }
    return out;
  }

  function computeIncidentEdge(h, pos, rot, normal) {
    // Normale der Referenzbox ins System der einfallenden Box drehen und umkehren
    const n = mulMTV(rot, normal);
    n.x = -n.x;
    n.y = -n.y;
    let c;
    if (Math.abs(n.x) > Math.abs(n.y)) {
      c = n.x >= 0
        ? [clipVertex(h.x, -h.y, EDGE3, EDGE4), clipVertex(h.x, h.y, EDGE4, EDGE1)]
        : [clipVertex(-h.x, h.y, EDGE1, EDGE2), clipVertex(-h.x, -h.y, EDGE2, EDGE3)];
    } else {
      c = n.y >= 0
        ? [clipVertex(h.x, h.y, EDGE4, EDGE1), clipVertex(-h.x, h.y, EDGE1, EDGE2)]
        : [clipVertex(-h.x, -h.y, EDGE2, EDGE3), clipVertex(h.x, -h.y, EDGE3, EDGE4)];
    }
    for (const cv of c) {
      const w = mulMV(rot, cv.v);
      cv.v = vec(pos.x + w.x, pos.y + w.y);
    }
    return c;
  }

  function collideBoxBox(A, B) {
    const hA = vec(A.hw, A.hh), hB = vec(B.hw, B.hh);
    const posA = A.pos, posB = B.pos;
    const rotA = mat(A.angle), rotB = mat(B.angle);
    const rotAT = transpose(rotA), rotBT = transpose(rotB);

    const dp = vec(posB.x - posA.x, posB.y - posA.y);
    const dA = mulMV(rotAT, dp);
    const dB = mulMV(rotBT, dp);

    const C = mulMM(rotAT, rotB);
    const absC = absM(C);
    const absCT = transpose(absC);

    const tB = mulMV(absC, hB);
    const faceA = vec(Math.abs(dA.x) - hA.x - tB.x, Math.abs(dA.y) - hA.y - tB.y);
    if (faceA.x > 0 || faceA.y > 0) return null;

    const tA = mulMV(absCT, hA);
    const faceB = vec(Math.abs(dB.x) - tA.x - hB.x, Math.abs(dB.y) - tA.y - hB.y);
    if (faceB.x > 0 || faceB.y > 0) return null;

    // Beste Trennachse wählen (mit Toleranz zugunsten von A → stabilere Kontakte)
    const relativeTol = 0.95, absoluteTol = 0.01;
    let axis = FACE_A_X;
    let separation = faceA.x;
    let normal = dA.x > 0 ? vec(rotA.ax, rotA.ay) : vec(-rotA.ax, -rotA.ay);

    if (faceA.y > relativeTol * separation + absoluteTol * hA.y) {
      axis = FACE_A_Y;
      separation = faceA.y;
      normal = dA.y > 0 ? vec(rotA.bx, rotA.by) : vec(-rotA.bx, -rotA.by);
    }
    if (faceB.x > relativeTol * separation + absoluteTol * hB.x) {
      axis = FACE_B_X;
      separation = faceB.x;
      normal = dB.x > 0 ? vec(rotB.ax, rotB.ay) : vec(-rotB.ax, -rotB.ay);
    }
    if (faceB.y > relativeTol * separation + absoluteTol * hB.y) {
      axis = FACE_B_Y;
      separation = faceB.y;
      normal = dB.y > 0 ? vec(rotB.bx, rotB.by) : vec(-rotB.bx, -rotB.by);
    }

    let frontNormal, sideNormal, front, negSide, posSide, negEdge, posEdge, incident, side;
    switch (axis) {
      case FACE_A_X:
        frontNormal = normal;
        front = dot(posA, frontNormal) + hA.x;
        sideNormal = vec(rotA.bx, rotA.by);
        side = dot(posA, sideNormal);
        negSide = -side + hA.y;
        posSide = side + hA.y;
        negEdge = EDGE3;
        posEdge = EDGE1;
        incident = computeIncidentEdge(hB, posB, rotB, frontNormal);
        break;
      case FACE_A_Y:
        frontNormal = normal;
        front = dot(posA, frontNormal) + hA.y;
        sideNormal = vec(rotA.ax, rotA.ay);
        side = dot(posA, sideNormal);
        negSide = -side + hA.x;
        posSide = side + hA.x;
        negEdge = EDGE2;
        posEdge = EDGE4;
        incident = computeIncidentEdge(hB, posB, rotB, frontNormal);
        break;
      case FACE_B_X:
        frontNormal = vec(-normal.x, -normal.y);
        front = dot(posB, frontNormal) + hB.x;
        sideNormal = vec(rotB.bx, rotB.by);
        side = dot(posB, sideNormal);
        negSide = -side + hB.y;
        posSide = side + hB.y;
        negEdge = EDGE3;
        posEdge = EDGE1;
        incident = computeIncidentEdge(hA, posA, rotA, frontNormal);
        break;
      default: // FACE_B_Y
        frontNormal = vec(-normal.x, -normal.y);
        front = dot(posB, frontNormal) + hB.y;
        sideNormal = vec(rotB.ax, rotB.ay);
        side = dot(posB, sideNormal);
        negSide = -side + hB.x;
        posSide = side + hB.x;
        negEdge = EDGE2;
        posEdge = EDGE4;
        incident = computeIncidentEdge(hA, posA, rotA, frontNormal);
        break;
    }

    const clip1 = clipSegmentToLine(incident, vec(-sideNormal.x, -sideNormal.y), negSide, negEdge);
    if (clip1.length < 2) return null;
    const clip2 = clipSegmentToLine(clip1, sideNormal, posSide, posEdge);
    if (clip2.length < 2) return null;

    const contacts = [];
    for (let i = 0; i < 2; i++) {
      const sep = dot(frontNormal, clip2[i].v) - front;
      if (sep <= 0) {
        const fp = clip2[i].fp;
        if (axis === FACE_B_X || axis === FACE_B_Y) {
          // Feature-Paar spiegeln, damit die ID unabhängig von der Referenzbox ist
          let t = fp.in1; fp.in1 = fp.in2; fp.in2 = t;
          t = fp.out1; fp.out1 = fp.out2; fp.out2 = t;
        }
        contacts.push(makeContact(
          // Kontaktpunkt auf die Referenzfläche schieben
          vec(clip2[i].v.x - sep * frontNormal.x, clip2[i].v.y - sep * frontNormal.y),
          normal, sep, featureKey(fp)
        ));
      }
    }
    return contacts;
  }

  // ---------------------------------------------------------------------------
  // Kollision mit Kreisen (Ergänzung)
  // ---------------------------------------------------------------------------
  function collideCircleCircle(A, B) {
    const dx = B.pos.x - A.pos.x, dy = B.pos.y - A.pos.y;
    const rSum = A.r + B.r;
    const d2 = dx * dx + dy * dy;
    if (d2 > rSum * rSum) return null;
    const d = Math.sqrt(d2);
    const n = d > 1e-9 ? vec(dx / d, dy / d) : vec(0, 1);
    const sep = d - rSum;
    const p = vec(A.pos.x + n.x * (A.r + 0.5 * sep), A.pos.y + n.y * (A.r + 0.5 * sep));
    return [makeContact(p, n, sep, 1)];
  }

  // Normale zeigt von der Box zum Kreis
  function collideBoxCircle(box, circle) {
    const rot = mat(box.angle);
    const d = mulMTV(rot, vec(circle.pos.x - box.pos.x, circle.pos.y - box.pos.y));
    const hx = box.hw, hy = box.hh, r = circle.r;
    const cx = Math.max(-hx, Math.min(hx, d.x));
    const cy = Math.max(-hy, Math.min(hy, d.y));
    let nLocal, sep, pLocal;

    if (cx !== d.x || cy !== d.y) {
      // Kreismittelpunkt außerhalb der Box: nächster Punkt auf dem Rand
      const ex = d.x - cx, ey = d.y - cy;
      const dist = Math.hypot(ex, ey);
      if (dist > r) return null;
      nLocal = vec(ex / dist, ey / dist);
      sep = dist - r;
      pLocal = vec(cx, cy);
    } else {
      // Mittelpunkt innerhalb: über die Fläche mit der geringsten Eindringtiefe raus
      const px = hx - Math.abs(d.x), py = hy - Math.abs(d.y);
      if (px < py) {
        const sx = d.x < 0 ? -1 : 1;
        nLocal = vec(sx, 0);
        sep = -(px + r);
        pLocal = vec(sx * hx, d.y);
      } else {
        const sy = d.y < 0 ? -1 : 1;
        nLocal = vec(0, sy);
        sep = -(py + r);
        pLocal = vec(d.x, sy * hy);
      }
    }
    const n = mulMV(rot, nLocal);
    const pw = mulMV(rot, pLocal);
    return [makeContact(vec(box.pos.x + pw.x, box.pos.y + pw.y), n, sep, 1)];
  }

  function makeContact(position, normal, separation, feature) {
    return {
      position: position, normal: normal, separation: separation, feature: feature,
      Pn: 0, Pt: 0, massNormal: 0, massTangent: 0, bias: 0
    };
  }

  /** Kontakte zwischen b1 und b2; Normale zeigt von b1 nach b2. */
  function collide(b1, b2) {
    if (b1.shape === 'box' && b2.shape === 'box') return collideBoxBox(b1, b2);
    if (b1.shape === 'circle' && b2.shape === 'circle') return collideCircleCircle(b1, b2);
    if (b1.shape === 'box') return collideBoxCircle(b1, b2);
    const contacts = collideBoxCircle(b2, b1);
    if (contacts) for (const c of contacts) c.normal = vec(-c.normal.x, -c.normal.y);
    return contacts;
  }

  // ---------------------------------------------------------------------------
  // Arbiter: Kontaktpaar zweier Körper inkl. akkumulierter Impulse
  // ---------------------------------------------------------------------------
  const ALLOWED_PENETRATION = 0.01;
  const BIAS_FACTOR = 0.2;
  // Rollwiderstand für Kreise: hält Kugeln auf minimal schiefen Flächen fest,
  // statt dass sie durch numerisches Rauschen endlos weiterkriechen.
  const ROLLING_RESISTANCE = 0.03;

  class Arbiter {
    constructor(b1, b2) {
      this.b1 = b1;
      this.b2 = b2;
      this.contacts = [];
      this.friction = Math.sqrt(b1.friction * b2.friction);
      const circle = b1.shape === 'circle' ? b1 : (b2.shape === 'circle' ? b2 : null);
      this.rollRadius = circle ? circle.r : 0;
      this.rollMass = circle ? 1 / (b1.invI + b2.invI) : 0;
      this.Pr = 0;
    }

    update(newContacts) {
      // Impulse wiedererkannter Kontakte übernehmen (Warm-Starting)
      for (const c of newContacts) {
        for (const old of this.contacts) {
          if (old.feature === c.feature) {
            c.Pn = old.Pn;
            c.Pt = old.Pt;
            break;
          }
        }
      }
      this.contacts = newContacts;
    }

    preStep(invDt) {
      const b1 = this.b1, b2 = this.b2;
      this.Pr = 0;
      for (const c of this.contacts) {
        const r1 = vec(c.position.x - b1.pos.x, c.position.y - b1.pos.y);
        const r2 = vec(c.position.x - b2.pos.x, c.position.y - b2.pos.y);
        c.r1 = r1;
        c.r2 = r2;

        const rn1 = dot(r1, c.normal), rn2 = dot(r2, c.normal);
        let kNormal = b1.invMass + b2.invMass;
        kNormal += b1.invI * (dot(r1, r1) - rn1 * rn1) + b2.invI * (dot(r2, r2) - rn2 * rn2);
        c.massNormal = 1 / kNormal;

        const t = vec(c.normal.y, -c.normal.x);
        const rt1 = dot(r1, t), rt2 = dot(r2, t);
        let kTangent = b1.invMass + b2.invMass;
        kTangent += b1.invI * (dot(r1, r1) - rt1 * rt1) + b2.invI * (dot(r2, r2) - rt2 * rt2);
        c.massTangent = 1 / kTangent;

        c.bias = -BIAS_FACTOR * invDt * Math.min(0, c.separation + ALLOWED_PENETRATION);

        // Warm-Start: Impulse des letzten Frames erneut anwenden
        const Px = c.Pn * c.normal.x + c.Pt * t.x;
        const Py = c.Pn * c.normal.y + c.Pt * t.y;
        applyImpulsePair(b1, b2, r1, r2, Px, Py);
      }
    }

    applyImpulse() {
      const b1 = this.b1, b2 = this.b2;
      for (const c of this.contacts) {
        const r1 = c.r1, r2 = c.r2, n = c.normal;

        // Normalimpuls
        let dvx = b2.vel.x - b2.angVel * r2.y - b1.vel.x + b1.angVel * r1.y;
        let dvy = b2.vel.y + b2.angVel * r2.x - b1.vel.y - b1.angVel * r1.x;
        const vn = dvx * n.x + dvy * n.y;
        let dPn = c.massNormal * (-vn + c.bias);
        const Pn0 = c.Pn;
        c.Pn = Math.max(Pn0 + dPn, 0);
        dPn = c.Pn - Pn0;
        applyImpulsePair(b1, b2, r1, r2, dPn * n.x, dPn * n.y);

        // Reibungsimpuls (Coulomb, durch Normalimpuls begrenzt)
        dvx = b2.vel.x - b2.angVel * r2.y - b1.vel.x + b1.angVel * r1.y;
        dvy = b2.vel.y + b2.angVel * r2.x - b1.vel.y - b1.angVel * r1.x;
        const tx = n.y, ty = -n.x;
        const vt = dvx * tx + dvy * ty;
        let dPt = c.massTangent * (-vt);
        const maxPt = this.friction * c.Pn;
        const Pt0 = c.Pt;
        c.Pt = Math.max(-maxPt, Math.min(maxPt, Pt0 + dPt));
        dPt = c.Pt - Pt0;
        applyImpulsePair(b1, b2, r1, r2, dPt * tx, dPt * ty);
      }

      if (this.rollRadius > 0) {
        let Pn = 0;
        for (const c of this.contacts) Pn += c.Pn;
        const maxPr = ROLLING_RESISTANCE * this.rollRadius * Pn;
        const Pr0 = this.Pr;
        this.Pr = Math.max(-maxPr, Math.min(maxPr, Pr0 - this.rollMass * (b2.angVel - b1.angVel)));
        const dPr = this.Pr - Pr0;
        b1.angVel -= b1.invI * dPr;
        b2.angVel += b2.invI * dPr;
      }
    }
  }

  function applyImpulsePair(b1, b2, r1, r2, Px, Py) {
    b1.vel.x -= b1.invMass * Px;
    b1.vel.y -= b1.invMass * Py;
    b1.angVel -= b1.invI * (r1.x * Py - r1.y * Px);
    b2.vel.x += b2.invMass * Px;
    b2.vel.y += b2.invMass * Py;
    b2.angVel += b2.invI * (r2.x * Py - r2.y * Px);
  }

  // ---------------------------------------------------------------------------
  // Welt
  // ---------------------------------------------------------------------------
  class World {
    constructor(opts) {
      opts = opts || {};
      this.gravity = vec(0, opts.gravity != null ? opts.gravity : 10);
      this.iterations = opts.iterations || 12;
      this.linearDamping = opts.linearDamping != null ? opts.linearDamping : 0.02;
      this.angularDamping = opts.angularDamping != null ? opts.angularDamping : 0.1;
      this.bodies = [];
      this.arbiters = new Map();
    }

    add(body) {
      this.bodies.push(body);
      return body;
    }

    remove(body) {
      const i = this.bodies.indexOf(body);
      if (i >= 0) this.bodies.splice(i, 1);
      for (const [key, arb] of this.arbiters) {
        if (arb.b1 === body || arb.b2 === body) {
          // Nachbarn "aufwecken": gespeicherte Stützimpulse verfallen lassen
          this.arbiters.delete(key);
        }
      }
    }

    static key(a, b) {
      return a.id < b.id ? a.id * 100003 + b.id : b.id * 100003 + a.id;
    }

    isTouching(a, b) {
      const arb = this.arbiters.get(World.key(a, b));
      return !!arb && arb.contacts.length > 0;
    }

    broadPhase() {
      const bodies = this.bodies;
      for (let i = 0; i < bodies.length; i++) {
        const bi = bodies[i];
        for (let j = i + 1; j < bodies.length; j++) {
          const bj = bodies[j];
          if (bi.isStatic && bj.isStatic) continue;
          const key = World.key(bi, bj);
          const reach = bi.boundR + bj.boundR;
          if (Math.abs(bi.pos.x - bj.pos.x) > reach || Math.abs(bi.pos.y - bj.pos.y) > reach) {
            this.arbiters.delete(key);
            continue;
          }
          const b1 = bi.id < bj.id ? bi : bj;
          const b2 = b1 === bi ? bj : bi;
          const contacts = collide(b1, b2);
          if (contacts && contacts.length) {
            let arb = this.arbiters.get(key);
            if (!arb) {
              arb = new Arbiter(b1, b2);
              this.arbiters.set(key, arb);
            }
            arb.update(contacts);
          } else {
            this.arbiters.delete(key);
          }
        }
      }
    }

    step(dt) {
      const invDt = dt > 0 ? 1 / dt : 0;
      this.broadPhase();

      const linDamp = 1 / (1 + dt * this.linearDamping);
      for (const b of this.bodies) {
        if (b.isStatic) continue;
        b.vel.x = (b.vel.x + dt * this.gravity.x) * linDamp;
        b.vel.y = (b.vel.y + dt * this.gravity.y) * linDamp;
        b.angVel *= 1 / (1 + dt * this.angularDamping);
      }

      for (const arb of this.arbiters.values()) arb.preStep(invDt);
      for (let k = 0; k < this.iterations; k++) {
        for (const arb of this.arbiters.values()) arb.applyImpulse();
      }

      for (const b of this.bodies) {
        if (b.isStatic) continue;
        b.pos.x += dt * b.vel.x;
        b.pos.y += dt * b.vel.y;
        b.angle += dt * b.angVel;
      }
    }
  }

  const api = { World: World, Body: Body, vec: vec, dot: dot, cross: cross };
  root.KlotzPhysics = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
