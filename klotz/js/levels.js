/*!
 * Klotz – Level-Daten
 *
 * Spielfeld: 10 x 15 Einheiten, Ursprung oben links, y zeigt nach unten.
 * Alle Angaben sind Mittelpunkte; Boxen haben w/h (+ optional angle in Radiant),
 * Kreise einen Radius r.
 *
 *   goal      grüne Zielplattform (statisch)
 *   statics   graue, unzerstörbare Elemente (statisch)
 *   shapes    zerstörbare Formen – jede braucht eine eindeutige id
 *   klotz     der rote Klotz (Kantenlänge size)
 *   solution  ids in der Reihenfolge, in der sie angetippt werden sollten
 *             (wird durch den Rewarded-Ad-Hinweis hervorgehoben)
 *
 * Neue Level einfach ans Array anhängen und mit `node klotz/tests/levels.test.js`
 * prüfen, ob sie stabil starten und mit der hinterlegten Lösung schaffbar sind.
 */
(function (root) {
  'use strict';

  const LEVELS = [
    {
      name: 'Erster Fall',
      tip: 'Tippe die türkisen Formen an, um sie zu zerstören. Bring den roten Klotz auf den grünen Boden!',
      goal: { x: 5, y: 14.5, w: 5, h: 1 },
      statics: [],
      shapes: [
        { id: 'saeule', type: 'box', x: 5, y: 12.5, w: 1, h: 3 },
        { id: 'brett', type: 'box', x: 5, y: 10.75, w: 3.2, h: 0.5 },
        { id: 'kugelL', type: 'circle', x: 3.9, y: 10.15, r: 0.35 },
        { id: 'kugelR', type: 'circle', x: 6.1, y: 10.15, r: 0.35 }
      ],
      klotz: { x: 5, y: 10, size: 1 },
      solution: ['brett', 'saeule']
    },
    {
      name: 'Die Wippe',
      tip: 'Achtung: Kippt das Brett, rutscht der Klotz ins Leere. Die Reihenfolge zählt!',
      goal: { x: 5, y: 14.5, w: 4, h: 1 },
      statics: [],
      shapes: [
        { id: 'stuetzeL', type: 'box', x: 3.5, y: 12.5, w: 0.8, h: 3 },
        { id: 'stuetzeR', type: 'box', x: 6.5, y: 12.5, w: 0.8, h: 3 },
        { id: 'ball', type: 'circle', x: 5, y: 13.4, r: 0.6 },
        { id: 'brett', type: 'box', x: 5, y: 10.75, w: 4.6, h: 0.5 },
        { id: 'sockel', type: 'box', x: 5, y: 10.1, w: 1.4, h: 0.8 },
        { id: 'wuerfel', type: 'box', x: 3.25, y: 10.15, w: 0.7, h: 0.7 }
      ],
      klotz: { x: 5, y: 9.2, size: 1 },
      solution: ['sockel', 'brett', 'ball']
    },
    {
      name: 'Der Turm',
      tip: 'Graue Teile sind unzerstörbar – landet der Klotz dort, steckt er fest.',
      goal: { x: 5, y: 14.5, w: 2.8, h: 1 },
      statics: [
        { type: 'box', x: 2.25, y: 14.5, w: 2.7, h: 1 },
        { type: 'box', x: 7.75, y: 14.5, w: 2.7, h: 1 }
      ],
      shapes: [
        { id: 'pfeilerL', type: 'box', x: 2.6, y: 12.5, w: 0.8, h: 3 },
        { id: 'pfeilerR', type: 'box', x: 7.4, y: 12.5, w: 0.8, h: 3 },
        { id: 'kugel', type: 'circle', x: 5, y: 13.35, r: 0.65 },
        { id: 'balken1', type: 'box', x: 5, y: 10.75, w: 6, h: 0.5 },
        { id: 'klotzL', type: 'box', x: 3.8, y: 9.7, w: 0.8, h: 1.6 },
        { id: 'klotzR', type: 'box', x: 6.2, y: 9.7, w: 0.8, h: 1.6 },
        { id: 'balken2', type: 'box', x: 5, y: 8.65, w: 3.6, h: 0.5 },
        { id: 'wuerfelL', type: 'box', x: 3.55, y: 8.1, w: 0.6, h: 0.6 },
        { id: 'wuerfelR', type: 'box', x: 6.45, y: 8.1, w: 0.6, h: 0.6 }
      ],
      klotz: { x: 5, y: 7.9, size: 1 },
      solution: ['balken2', 'balken1', 'kugel']
    }
  ];

  const api = { LEVELS: LEVELS, WORLD_W: 10, WORLD_H: 15 };
  root.KlotzLevels = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
