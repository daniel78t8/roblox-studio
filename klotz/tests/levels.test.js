#!/usr/bin/env node
/*
 * Level-Check für Klotz: `node klotz/tests/levels.test.js`
 *
 * Für jedes Level (normal und gespiegelt) wird geprüft:
 *   1. Stabilität – ohne Eingriff bleibt der Aufbau 6 s lang stehen.
 *   2. Lösbarkeit – die hinterlegte Lösung (Hinweis-Reihenfolge) führt zum Sieg.
 * Zusätzlich wird ausgegeben, welche "falschen" ersten Züge das Level verlieren.
 */
'use strict';

const path = require('path');
require(path.join(__dirname, '../js/physics.js'));
require(path.join(__dirname, '../js/levels.js'));
const Core = require(path.join(__dirname, '../js/core.js'));

const STEP = Core.STEP;
let failures = 0;

function snapshot(run) {
  const all = [run.klotz, ...run.shapes.values()];
  return all.map((b) => ({ b, x: b.pos.x, y: b.pos.y, a: b.angle }));
}

function maxDrift(snap) {
  let drift = 0;
  for (const s of snap) {
    drift = Math.max(drift, Math.hypot(s.b.pos.x - s.x, s.b.pos.y - s.y), Math.abs(s.b.angle - s.a));
  }
  return drift;
}

function settled(run) {
  for (const b of [run.klotz, ...run.shapes.values()]) {
    if (Math.hypot(b.vel.x, b.vel.y) > 0.05 || Math.abs(b.angVel) > 0.05) return false;
  }
  return true;
}

function simulate(run, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps && run.status === 'playing'; i++) Core.step(run, STEP);
  return run.status;
}

function waitSettled(run, maxSeconds) {
  const steps = Math.round(maxSeconds / STEP);
  for (let i = 0; i < steps && run.status === 'playing'; i++) {
    Core.step(run, STEP);
    if (i > 20 && settled(run)) break;
  }
}

function play(levelNumber, order) {
  const run = Core.createRun(levelNumber);
  waitSettled(run, 1);
  for (const id of order) {
    if (run.status !== 'playing') break;
    const body = run.shapes.get(id);
    if (body) Core.destroy(run, body);
    waitSettled(run, 4);
  }
  simulate(run, 8);
  return run;
}

function check(label, ok, detail) {
  console.log(`  ${ok ? '✔' : '✘'} ${label}${detail ? ' – ' + detail : ''}`);
  if (!ok) failures++;
}

for (let n = 1; n <= Core.LEVEL_COUNT * 2; n++) {
  const info = Core.levelInfo(n);
  console.log(`Level ${n}: ${info.def.name}${info.mirrored ? ' (gespiegelt)' : ''}`);

  const idle = Core.createRun(n);
  const snap = snapshot(idle);
  const idleStatus = simulate(idle, 6);
  const drift = maxDrift(snap);
  check('stabil ohne Eingriff', idleStatus === 'playing' && drift < 0.05, `Status ${idleStatus}, max. Drift ${drift.toFixed(4)}`);

  const solved = play(n, info.def.solution);
  check(`Lösung [${info.def.solution.join(', ')}]`, solved.status === 'win',
    `Status ${solved.status}${solved.failReason ? ' (' + solved.failReason + ')' : ''} nach ${solved.time.toFixed(1)} s`);

  const outcomes = info.def.shapes.map((s) => {
    const rest = info.def.solution.filter((id) => id !== s.id);
    const r = play(n, [s.id, ...rest]);
    return `${s.id}→${r.status}`;
  });
  console.log(`    erster Zug, danach Lösung: ${outcomes.join(', ')}`);
}

console.log(failures ? `\n${failures} Prüfung(en) fehlgeschlagen.` : '\nAlle Level stabil und lösbar.');
process.exit(failures ? 1 : 0);
