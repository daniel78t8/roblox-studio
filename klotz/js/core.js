/*!
 * Klotz – Spiellogik ohne DOM (Level aufbauen, Antippen, Sieg/Niederlage).
 * Läuft im Browser und in Node (für die Level-Tests).
 */
(function (root) {
  'use strict';

  const Physics = root.KlotzPhysics || (typeof require === 'function' && require('./physics.js'));
  const Levels = root.KlotzLevels || (typeof require === 'function' && require('./levels.js'));
  const { World, Body } = Physics;

  const W = Levels.WORLD_W;
  const H = Levels.WORLD_H;
  const STEP = 1 / 60;
  const WIN_HOLD = 0.8;     // Sekunden, die der Klotz ruhig auf dem Ziel liegen muss
  const WIN_MAX_SPEED = 1.5;
  const STUCK_HOLD = 1.5;   // Sekunden Stillstand ohne verbleibende Formen = Sackgasse

  const FRICTION = { goal: 0.8, static: 0.15, breakable: 0.6, klotz: 0.6 };

  /** Level n (1-basiert). Nach dem letzten Level geht es gespiegelt von vorn los. */
  function levelInfo(n) {
    const count = Levels.LEVELS.length;
    const idx = (n - 1) % count;
    return { def: Levels.LEVELS[idx], index: idx, mirrored: Math.floor((n - 1) / count) % 2 === 1 };
  }

  function createRun(levelNumber) {
    const info = levelInfo(levelNumber);
    const def = info.def;
    const mx = (x) => (info.mirrored ? W - x : x);
    const ma = (a) => (info.mirrored ? -(a || 0) : (a || 0));
    const world = new World({ gravity: 10, iterations: 12 });

    const goal = world.add(new Body({
      shape: 'box', x: mx(def.goal.x), y: def.goal.y, w: def.goal.w, h: def.goal.h,
      isStatic: true, friction: FRICTION.goal, data: { kind: 'goal' }
    }));

    const statics = def.statics.map((s) => world.add(new Body({
      shape: s.type, x: mx(s.x), y: s.y, w: s.w, h: s.h, r: s.r, angle: ma(s.angle),
      isStatic: true, friction: FRICTION.static, data: { kind: 'static' }
    })));

    const shapes = new Map();
    for (const s of def.shapes) {
      shapes.set(s.id, world.add(new Body({
        shape: s.type, x: mx(s.x), y: s.y, w: s.w, h: s.h, r: s.r, angle: ma(s.angle),
        friction: FRICTION.breakable, data: { kind: 'breakable', id: s.id }
      })));
    }

    const k = def.klotz;
    const klotz = world.add(new Body({
      shape: 'box', x: mx(k.x), y: k.y, w: k.size, h: k.size, angle: ma(k.angle),
      friction: FRICTION.klotz, density: 1.2, data: { kind: 'klotz' }
    }));

    return {
      levelNumber: levelNumber, def: def, mirrored: info.mirrored,
      world: world, goal: goal, statics: statics, shapes: shapes, klotz: klotz,
      status: 'playing', failReason: null,
      time: 0, goalTime: 0, stuckTime: 0, taps: 0
    };
  }

  /** Formen bzw. Klotz am Weltpunkt p; tolerance vergrößert die Trefferfläche (Touch). */
  function pick(run, p, tolerance) {
    const candidates = [run.klotz];
    for (const b of run.shapes.values()) candidates.push(b);
    // Exakter Treffer – zuletzt hinzugefügte (= vorne gezeichnete) Formen zuerst
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (candidates[i].containsPoint(p)) return candidates[i];
    }
    // Sonst die nächstgelegene Form innerhalb der Toleranz
    let best = null, bestDist = tolerance || 0;
    for (const b of candidates) {
      const d = b.distanceTo(p);
      if (d <= bestDist) {
        best = b;
        bestDist = d;
      }
    }
    return best;
  }

  /** Zerstört eine Form. Der Klotz und statische Teile sind unzerstörbar. */
  function destroy(run, body) {
    if (run.status !== 'playing' || !body || body.data.kind !== 'breakable') return false;
    run.world.remove(body);
    run.shapes.delete(body.data.id);
    run.taps++;
    return true;
  }

  /** Nächste noch vorhandene Form der hinterlegten Lösung (für den Hinweis). */
  function nextHint(run) {
    for (const id of run.def.solution) {
      const b = run.shapes.get(id);
      if (b) return b;
    }
    return null;
  }

  function step(run, dt) {
    if (run.status !== 'playing') return run.status;
    dt = dt || STEP;
    run.world.step(dt);
    run.time += dt;

    // Heruntergefallene Formen entsorgen
    for (const [id, b] of run.shapes) {
      if (b.pos.y > H + 4 || b.pos.x < -4 || b.pos.x > W + 4) {
        run.world.remove(b);
        run.shapes.delete(id);
      }
    }

    const k = run.klotz;
    if (k.pos.x < 0 || k.pos.x > W || k.pos.y > H + k.hh) {
      run.status = 'fail';
      run.failReason = 'out';
      return run.status;
    }

    const speed = Math.hypot(k.vel.x, k.vel.y);
    if (run.world.isTouching(k, run.goal) && speed < WIN_MAX_SPEED) {
      run.goalTime += dt;
      if (run.goalTime >= WIN_HOLD) run.status = 'win';
    } else {
      run.goalTime = 0;
    }

    if (run.status === 'playing' && run.shapes.size === 0 && speed < 0.05 && Math.abs(k.angVel) < 0.05) {
      run.stuckTime += dt;
      if (run.stuckTime >= STUCK_HOLD) {
        run.status = 'fail';
        run.failReason = 'stuck';
      }
    } else {
      run.stuckTime = 0;
    }
    return run.status;
  }

  const api = {
    W: W, H: H, STEP: STEP, WIN_HOLD: WIN_HOLD, LEVEL_COUNT: Levels.LEVELS.length,
    levelInfo: levelInfo, createRun: createRun, pick: pick, destroy: destroy, nextHint: nextHint, step: step
  };
  root.KlotzCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
