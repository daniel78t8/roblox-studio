/* Brewnado - hand-made SVG icons (no external images). */
(function (BW) {
  'use strict';
  var O = '#1d1030';               // outline colour
  var SW = 'stroke="' + O + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  function svg(inner, cls) {
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  function sparkle(x, y, r, c) {
    return '<path d="M' + x + ' ' + (y - r) + 'Q' + (x + r * 0.18) + ' ' + (y - r * 0.18) + ' ' + (x + r) + ' ' + y +
      'Q' + (x + r * 0.18) + ' ' + (y + r * 0.18) + ' ' + x + ' ' + (y + r) + 'Q' + (x - r * 0.18) + ' ' + (y + r * 0.18) + ' ' + (x - r) + ' ' + y +
      'Q' + (x - r * 0.18) + ' ' + (y - r * 0.18) + ' ' + x + ' ' + (y - r) + 'Z" fill="' + (c || '#ffe27a') + '"/>';
  }
  var I = {};
  I.potion = svg(
    '<rect x="25" y="4" width="14" height="7" rx="2" fill="#b0743f" ' + SW + '/>' +
    '<path d="M27 11h10v13c8.6 2.6 14 9.7 14 18.3C51 52.4 42.6 60 32 60S13 52.4 13 42.3C13 33.7 18.4 26.6 27 24z" fill="#efe4ff" ' + SW + '/>' +
    '<path d="M16.2 41c4.9 2.2 10.1 2.4 15.8.6 5.9-1.9 11-1.6 15.8.4.2 .9.2 1.6.2 2.3C48 51 40.9 57 32 57S16 51 16 43.3c0-.8.1-1.5.2-2.3z" fill="#5be36b"/>' +
    '<circle cx="25" cy="47" r="3" fill="#c3ffbb"/><circle cx="36" cy="51" r="2" fill="#c3ffbb"/>' +
    '<path d="M20 34c2-3 4.5-5 8-6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>');
  I.spoon = svg(
    '<g transform="rotate(38 32 32)"><rect x="29" y="24" width="6" height="36" rx="3" fill="#c98a4b" ' + SW + '/>' +
    '<ellipse cx="32" cy="15" rx="10" ry="12" fill="#e2a868" ' + SW + '/><ellipse cx="29" cy="12" rx="3" ry="4.5" fill="#f7d39e"/></g>' +
    sparkle(50, 46, 7) + sparkle(12, 18, 4, '#c9b6ff'));
  I.frog = svg(
    '<ellipse cx="32" cy="44" rx="21" ry="15" fill="#6fd36a" ' + SW + '/>' +
    '<circle cx="21" cy="30" r="7.5" fill="#6fd36a" ' + SW + '/><circle cx="43" cy="30" r="7.5" fill="#6fd36a" ' + SW + '/>' +
    '<circle cx="21" cy="30" r="3.4" fill="' + O + '"/><circle cx="43" cy="30" r="3.4" fill="' + O + '"/>' +
    '<circle cx="22.2" cy="28.8" r="1.2" fill="#fff"/><circle cx="44.2" cy="28.8" r="1.2" fill="#fff"/>' +
    '<ellipse cx="32" cy="49" rx="11" ry="7" fill="#c9f5a6"/>' +
    '<path d="M25 42q7 5 14 0" fill="none" stroke="' + O + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M26 24L35 3l7 21z" fill="#7b4fd6" ' + SW + '/>' + sparkle(35, 15, 3.5));
  I.shroom = svg(
    '<path d="M25 34h14l2 22H23z" fill="#f4e7d2" ' + SW + '/>' +
    '<path d="M6 34C6 18 18 8 32 8s26 10 26 26z" fill="#ff73c6" ' + SW + '/>' +
    '<circle cx="20" cy="23" r="4" fill="#ffe0f4"/><circle cx="35" cy="17" r="3.5" fill="#ffe0f4"/><circle cx="46" cy="27" r="3" fill="#ffe0f4"/>' +
    '<path d="M27 46h10" stroke="#d9c4a6" stroke-width="3" stroke-linecap="round"/>' + sparkle(55, 50, 5, '#8ff6ff'));
  I.cat = svg(
    '<path d="M12 30L11 8l14 11zM52 30l1-22-14 11z" fill="#2d2440" ' + SW + '/>' +
    '<ellipse cx="32" cy="36" rx="22" ry="20" fill="#2d2440" ' + SW + '/>' +
    '<path d="M16 33q5-6 10 0q-5 6-10 0zM38 33q5-6 10 0q-5 6-10 0z" fill="#ffd94a"/>' +
    '<path d="M21 29v8M43 29v8" stroke="' + O + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M29 42l3 3 3-3z" fill="#ff8ab8"/>' +
    '<path d="M32 45v3M10 41l9 1M10 46l9-1M54 41l-9 1M54 46l-9-1" stroke="#8c7ab0" stroke-width="2" stroke-linecap="round"/>');
  I.crystal = svg(
    '<path d="M17 52h30l4 8H13z" fill="#8a5a33" ' + SW + '/>' +
    '<circle cx="32" cy="30" r="20" fill="#9a78ff" ' + SW + '/>' +
    '<path d="M20 34c4-9 14-12 22-7-6-1-11 3-12 9 3-2 7-2 9 1-6 1-11 2-19-3z" fill="#d3c2ff"/>' +
    '<ellipse cx="24" cy="21" rx="5" ry="3.2" transform="rotate(-35 24 21)" fill="#fff" opacity=".85"/>' + sparkle(48, 14, 5));
  I.broom = svg(
    '<path d="M48 6L22 40" stroke="#9b6233" stroke-width="7" stroke-linecap="round"/><path d="M48 6L22 40" stroke="' + O + '" stroke-width="3" stroke-linecap="round" opacity="0"/>' +
    '<path d="M24 34l8 8-14 18c-4 2-12 0-13-1-1-2-2-9 0-13z" fill="#ffcb4f" ' + SW + '/>' +
    '<path d="M22 44l-9 9M27 46l-8 10M19 41l-10 7" stroke="#d99a24" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M21 36l11 7" stroke="#b5541f" stroke-width="5" stroke-linecap="round"/>' + sparkle(52, 30, 5) + sparkle(42, 52, 3.5, '#c9b6ff'));
  I.bog = svg(
    '<ellipse cx="32" cy="44" rx="27" ry="13" fill="#3e8f4a" ' + SW + '/>' +
    '<ellipse cx="32" cy="42" rx="20" ry="7.5" fill="#5bc364"/>' +
    '<circle cx="24" cy="37" r="4.5" fill="#9bf09b" ' + SW + '/><circle cx="38" cy="32" r="3.2" fill="#9bf09b" ' + SW + '/><circle cx="33" cy="24" r="2.2" fill="#9bf09b"/>' +
    '<path d="M8 40V18M12 40V24M56 40V20" stroke="#2f6b37" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="8" cy="16" rx="2.6" ry="5" fill="#8a5a33"/><ellipse cx="56" cy="18" rx="2.6" ry="5" fill="#8a5a33"/>');
  I.altar = svg(
    '<path d="M16 58h32l-3-8H19z" fill="#7d7fa6" ' + SW + '/>' +
    '<rect x="22" y="26" width="20" height="25" rx="2" fill="#9ea2c9" ' + SW + '/>' +
    '<path d="M18 26h28l-3-6H21z" fill="#7d7fa6" ' + SW + '/>' +
    '<path d="M38 4a12 12 0 1 0 6 18A10 10 0 1 1 38 4z" fill="#fff3b0" ' + SW + '/>' +
    '<path d="M28 34h8M28 41h8" stroke="#6c6f96" stroke-width="3" stroke-linecap="round"/>');
  I.dragon = svg(
    '<path d="M10 50c0-20 12-34 30-34 8 0 14 4 16 10l-6 2 2 6c-4 2-9 2-14 1-2 6-6 12-12 15z" fill="#ff6a4d" ' + SW + '/>' +
    '<path d="M30 18l-6-12 12 8M40 16l2-12 6 12" fill="#ffd17a" ' + SW + '/>' +
    '<circle cx="42" cy="25" r="3.2" fill="' + O + '"/><circle cx="43" cy="24" r="1.1" fill="#fff"/>' +
    '<path d="M54 33c3 0 5 2 7 0" stroke="#bbb" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
    '<path d="M18 46q6-4 10 2" stroke="#ffb199" stroke-width="3" fill="none" stroke-linecap="round"/>');
  I.forge = svg(
    '<path d="M8 30h40c0 6-5 10-12 11l2 9h8v6H18v-6h8l2-9C16 40 10 36 8 30z" fill="#59607d" ' + SW + '/>' +
    '<path d="M48 30h8l-2 5h-8z" fill="#59607d" ' + SW + '/>' +
    '<path d="M12 33h30" stroke="#8a91b3" stroke-width="3" stroke-linecap="round"/>' +
    sparkle(30, 15, 10, '#fff1a8') + sparkle(49, 10, 4) + sparkle(13, 17, 3.5, '#9fd9ff'));
  I.galaxy = svg(
    '<path d="M8 28h48c0 16-10 28-24 28S8 44 8 28z" fill="#2b2547" ' + SW + '/>' +
    '<ellipse cx="32" cy="28" rx="25" ry="7" fill="#7f5cff" ' + SW + '/>' +
    '<path d="M18 28c4-5 14-6 18-2 3 3-1 6-5 5 7 0 9-6 3-8 9 1 12 5 6 9" fill="none" stroke="#e6d9ff" stroke-width="2.5" stroke-linecap="round"/>' +
    sparkle(44, 12, 6, '#fff1a8') + sparkle(20, 10, 3.5, '#9fd9ff') + '<circle cx="54" cy="18" r="1.8" fill="#fff"/>');
  I.unicorn = svg(
    '<path d="M6 30c4-6 10-6 12-2" fill="none" stroke="#ff6f9c" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M7 36c4-5 9-5 11-1" fill="none" stroke="#ffd36b" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M16 44c0-12 8-22 20-24l6-2 10 6c3 2 4 6 2 8l-4 2-8-2c0 8-2 14-6 18H24c-5 0-8-2-8-6z" fill="#ffffff" ' + SW + '/>' +
    '<path d="M44 18l8-14 0 16z" fill="#ffd36b" ' + SW + '/>' +
    '<path d="M30 22c-2-6 2-12 8-12-2 4 0 6 2 8" fill="#b48cff" ' + SW + '/>' +
    '<circle cx="45" cy="25" r="2.6" fill="' + O + '"/><circle cx="46" cy="24" r="1" fill="#fff"/>' +
    '<circle cx="50" cy="31" r="2" fill="#ff93b6"/>' + sparkle(56, 48, 5) + sparkle(10, 54, 3.5, '#5ff3e6'));
  I.portal = svg(
    '<ellipse cx="32" cy="34" rx="22" ry="26" fill="#2b2547" ' + SW + '/>' +
    '<ellipse cx="32" cy="34" rx="15" ry="19" fill="#5ff3e6" ' + SW + '/>' +
    '<ellipse cx="32" cy="34" rx="8" ry="11" fill="#9a6bff"/>' +
    '<path d="M32 26v8l5 4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    sparkle(52, 10, 5) + sparkle(12, 12, 3.5, '#ff9be9') + '<circle cx="54" cy="56" r="2" fill="#fff"/>');
  // combo / luck / bubble / quest icons
  I.combo = svg('<path d="M36 4L14 36h14l-6 24 28-36H34z" fill="#ffe27a" ' + SW + '/>' +
    '<path d="M33 12l-10 18" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' + sparkle(52, 50, 6, '#ff6f9c') + sparkle(10, 14, 4, '#5ff3e6'));
  I.fever = svg('<path d="M32 4c4 10 18 16 18 32 0 12-8 22-18 22S14 48 14 36c0-8 4-12 8-16 0 6 3 9 6 9-2-9 0-18 4-25z" fill="#ff6f9c" ' + SW + '/>' +
    '<path d="M32 30c3 5 9 8 9 15 0 6-4 10-9 10s-9-4-9-10c0-4 2-6 4-8 0 3 2 4 3 4-1-4 0-8 2-11z" fill="#ffe27a"/>' + sparkle(54, 12, 5, '#5ff3e6'));
  I.jackpot = svg('<circle cx="32" cy="34" r="22" fill="#ffcf4a" ' + SW + '/><circle cx="32" cy="34" r="15" fill="#ffe27a" stroke="#d79a1e" stroke-width="3"/>' +
    '<path d="M27 26h10l-6 18" stroke="' + O + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    sparkle(52, 10, 7, '#fff') + sparkle(10, 12, 4) + sparkle(56, 54, 4, '#ff9be9'));
  I.bubble = svg('<circle cx="32" cy="34" r="22" fill="#9fe7ff" fill-opacity=".45" ' + SW + '/>' +
    '<path d="M20 26a14 14 0 0 1 10-8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="42" cy="44" r="3" fill="#fff" opacity=".8"/>' +
    '<circle cx="54" cy="12" r="5" fill="#9fe7ff" fill-opacity=".5" ' + SW + '/>');
  I.bubbleGold = svg('<circle cx="32" cy="34" r="22" fill="#ffd36b" fill-opacity=".75" ' + SW + '/>' +
    '<path d="M20 26a14 14 0 0 1 10-8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>' + sparkle(40, 42, 6, '#fff') + sparkle(54, 10, 5));
  I.scroll = svg('<path d="M16 10h30c4 0 6 3 6 6v34c0 4-3 6-6 6H18" fill="#f2dfb0" ' + SW + '/>' +
    '<path d="M18 56c-4 0-6-3-6-6s2-6 6-6h28" fill="#e2c88e" ' + SW + '/><path d="M16 10c-4 0-6 3-6 6s2 5 6 5h4V16c0-3-2-6-4-6z" fill="#e2c88e" ' + SW + '/>' +
    '<path d="M27 22h17M27 30h17M27 38h11" stroke="#a88552" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M40 40l4 4 9-10" stroke="#3fae55" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
  function ladle(col, extra) {
    return svg('<path d="M44 6l-16 30" stroke="' + O + '" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M44 6l-16 30" stroke="' + col + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<path d="M12 36c0-3 3-5 6-5h16c3 0 6 2 6 5 0 9-6 16-14 16S12 45 12 36z" fill="' + col + '" ' + SW + '/>' +
      '<path d="M17 39c1 4 4 7 8 8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".7"/>' + (extra || ''));
  }
  I.c1 = ladle('#d39a5b');
  I.c2 = ladle('#cfd6ea', sparkle(52, 40, 5, '#fff'));
  I.c3 = ladle('#ffcf4a', sparkle(52, 40, 6));
  I.c4 = ladle('#6ff0e6', '<path d="M46 34a10 10 0 0 1 0 14M52 30a16 16 0 0 1 0 22" fill="none" stroke="#6ff0e6" stroke-width="3" stroke-linecap="round"/>');
  I.c5 = ladle('#8fb7ff', '<path d="M52 26l-8 12h6l-4 12 10-15h-6l4-9z" fill="#ffe27a" ' + SW + '/>');
  I.c6 = ladle('#fff1a8', sparkle(50, 36, 7) + sparkle(56, 52, 4, '#c9b6ff'));
  I.c7 = ladle('#ff9be9', '<path d="M42 46c3-5 8-5 9 0s6 5 9 0-6-5-9 0-6 5-9 0z" fill="none" stroke="#ff9be9" stroke-width="3"/>');
  I.c8 = ladle('#b48cff', sparkle(50, 38, 8, '#fff1a8') + '<circle cx="57" cy="52" r="2" fill="#fff"/>');
  I.c9 = ladle('#7f5cff', sparkle(50, 38, 7, '#9fd9ff') + sparkle(56, 54, 4, '#fff1a8') + '<circle cx="46" cy="52" r="2" fill="#fff"/>');
  I.c10 = ladle('#ff6f9c', sparkle(50, 38, 9, '#ffe27a') + sparkle(57, 54, 4.5, '#5ff3e6') + sparkle(10, 12, 4, '#fff'));
  I.g1 = svg('<path d="M14 10h32c3 0 5 2 5 5v38c0 2-2 3-4 3H17c-3 0-5-2-5-5V12c0-1 1-2 2-2z" fill="#f2dfb0" ' + SW + '/>' +
    '<path d="M20 22h20M20 30h22M20 38h16" stroke="#a88552" stroke-width="3" stroke-linecap="round"/>' + sparkle(46, 46, 6, '#5be36b'));
  I.g2 = svg('<path d="M12 10h34a6 6 0 0 1 6 6v38H18a6 6 0 0 1-6-6z" fill="#7b4fd6" ' + SW + '/>' +
    '<path d="M18 48h34v8H18a4 4 0 0 1 0-8z" fill="#efe4ff" ' + SW + '/>' +
    '<path d="M36 18a8 8 0 1 0 4 13 7 7 0 1 1-4-13z" fill="#ffe27a"/>');
  I.g3 = svg('<circle cx="32" cy="32" r="22" fill="#fff3b0" ' + SW + '/><circle cx="24" cy="26" r="4" fill="#efdc8a"/><circle cx="38" cy="38" r="5" fill="#efdc8a"/><circle cx="40" cy="22" r="2.5" fill="#efdc8a"/>' + sparkle(54, 10, 5, '#c9b6ff'));
  I.g4 = svg('<path d="M14 56l4-44c0-3 3-5 6-5h16c3 0 6 2 6 5l4 44z" fill="#8f92b8" ' + SW + '/>' +
    '<path d="M27 18v14l8-7v14M24 44l8 6 8-6" fill="none" stroke="#5ff3e6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>');
  I.g5 = svg('<path d="M32 6l20 18-20 34-20-34z" fill="#ff5d8f" ' + SW + '/><path d="M12 24h40M32 6l-8 18 8 34 8-34z" fill="none" stroke="#ffc2d4" stroke-width="2.5" stroke-linejoin="round"/>');
  I.g6 = svg('<circle cx="32" cy="32" r="22" fill="#2b2547" ' + SW + '/>' + sparkle(32, 32, 16, '#fff1a8') + '<circle cx="18" cy="20" r="2" fill="#9fd9ff"/><circle cx="46" cy="46" r="2.4" fill="#ff9be9"/>');
  I.g7 = svg('<path d="M8 46a24 24 0 0 1 48 0" fill="none" stroke="' + O + '" stroke-width="15" stroke-linecap="round"/>' +
    '<path d="M8 46a24 24 0 0 1 48 0" fill="none" stroke="#ff6f9c" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M14 46a18 18 0 0 1 36 0" fill="none" stroke="#ffe27a" stroke-width="5"/>' +
    '<path d="M19 46a13 13 0 0 1 26 0" fill="none" stroke="#5ff3e6" stroke-width="4"/>' + sparkle(32, 14, 6, '#fff'));
  I.g8 = svg('<path d="M32 4l7 16 17 2-13 11 4 17-15-9-15 9 4-17L8 22l17-2z" fill="#ffcf4a" ' + SW + '/>' +
    '<path d="M32 16l3 8 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#fff3b0"/>' + sparkle(52, 52, 6, '#ff6f9c') + sparkle(12, 52, 4, '#5ff3e6'));
  I.k1 = I.combo; I.k2 = I.combo; I.k3 = I.combo; I.k4 = I.fever; I.k5 = I.combo;
  I.f1 = I.bubble; I.f2 = I.bubble; I.f3 = I.bubbleGold;
  I.tornado = svg('<path d="M8 10h48M14 20h38M20 30h28M24 40h18M28 50h10M31 58h4" stroke="' + O + '" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M8 10h48M14 20h38M20 30h28M24 40h18M28 50h10M31 58h4" stroke="#5be36b" stroke-width="4.5" stroke-linecap="round"/>' + sparkle(52, 36, 5));
  I.b1 = I.tornado; I.b2 = I.tornado; I.b3 = I.tornado; I.b4 = I.tornado;
  I.wisp = svg('<circle cx="32" cy="32" r="26" fill="#5ff3e6" opacity=".18"/><circle cx="32" cy="32" r="18" fill="#5ff3e6" opacity=".35"/>' +
    '<circle cx="32" cy="32" r="11" fill="#bffcf6" ' + SW + '/><circle cx="29" cy="29" r="4" fill="#fff"/>' + sparkle(52, 14, 5, '#fff'));
  I.w1 = I.wisp; I.w2 = I.wisp; I.w3 = I.wisp;
  I.moonstone = svg('<path d="M32 4l18 14-4 28-14 14-14-14-4-28z" fill="#b48cff" ' + SW + '/>' +
    '<path d="M36 16a10 10 0 1 0 4 16 8 8 0 1 1-4-16z" fill="#fff3b0"/><path d="M14 18h36" stroke="#d9c6ff" stroke-width="2.5"/>');
  I.trophy = svg('<path d="M20 8h24v14c0 9-5 15-12 15S20 31 20 22z" fill="#ffcf4a" ' + SW + '/>' +
    '<path d="M20 13H10c0 9 5 13 11 13M44 13h10c0 9-5 13-11 13" fill="none" stroke="' + O + '" stroke-width="3"/>' +
    '<path d="M28 37h8v9h-8z" fill="#e3ad2e" ' + SW + '/><rect x="18" y="46" width="28" height="10" rx="3" fill="#8a5a33" ' + SW + '/>' + sparkle(32, 20, 5, '#fff'));
  I.gear = svg('<path d="M32 6l5 6 7-2 2 7 7 2-2 7 6 5-6 5 2 7-7 2-2 7-7-2-5 6-5-6-7 2-2-7-7-2 2-7-6-5 6-5-2-7 7-2 2-7 7 2z" fill="#cfc4ea" ' + SW + '/><circle cx="32" cy="32" r="8" fill="#5a4a7f" ' + SW + '/>');
  I.sound = svg('<path d="M8 24h10l14-12v40L18 40H8z" fill="#cfc4ea" ' + SW + '/><path d="M40 22a14 14 0 0 1 0 20M46 15a22 22 0 0 1 0 34" fill="none" stroke="#cfc4ea" stroke-width="4" stroke-linecap="round"/>');
  I.mute = svg('<path d="M8 24h10l14-12v40L18 40H8z" fill="#cfc4ea" ' + SW + '/><path d="M42 24l14 16M56 24L42 40" stroke="#ff8a8a" stroke-width="5" stroke-linecap="round"/>');
  I.lock = svg('<rect x="14" y="28" width="36" height="28" rx="5" fill="#6d5a94" ' + SW + '/><path d="M22 28v-8a10 10 0 0 1 20 0v8" fill="none" stroke="' + O + '" stroke-width="5"/><circle cx="32" cy="41" r="4" fill="' + O + '"/>');
  I.check = svg('<circle cx="32" cy="32" r="24" fill="#5be36b" ' + SW + '/><path d="M20 33l8 8 16-17" fill="none" stroke="' + O + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>');
  I.close = svg('<path d="M18 18l28 28M46 18L18 46" stroke="#efe4ff" stroke-width="6" stroke-linecap="round"/>');

  // Magic Hand (same glove as in the scene and the tutorial hint)
  BW.HAND_PATH = 'M27 6c3 0 5 2.2 5 5v18l2.6-.7c2.6-.6 5.1 1 5.6 3.6l.2 1 2.6-.5c2.6-.5 5.1 1.2 5.6 3.8l.2 1.3 1.2-.2c2.7-.3 5.1 1.7 5.3 4.4l.7 8.6C56.7 57.7 50.2 62 42.6 62h-8.8c-5.8 0-10.8-3.4-13-8.7L14.9 40c-1-2.5.2-5.3 2.7-6.3 2.3-.9 4.8 0 6 2.1l1.4 2.4V11c0-2.8 2.2-5 5-5z';
  function gloveParts() {
    return '<rect x="26" y="3" width="12.5" height="34" rx="6.2"/><rect x="17" y="25" width="34" height="28" rx="11"/>' +
      '<circle cx="44" cy="29.5" r="6.8"/><circle cx="49" cy="37" r="6.2"/><circle cx="49" cy="45" r="5.6"/>' +
      '<ellipse cx="18.5" cy="37" rx="6.2" ry="10" transform="rotate(-24 18.5 37)"/>';
  }
  function handSvg(glove, cuff, ring) {
    return '<g transform="rotate(-20 32 34) translate(1 1) scale(.95)">' +
      '<g fill="none" stroke="' + O + '" stroke-width="6.4" stroke-linejoin="round">' + gloveParts() + '<rect x="15" y="49" width="38" height="13" rx="5.5"/></g>' +
      '<g fill="' + glove + '">' + gloveParts() + '</g><rect x="15" y="49" width="38" height="13" rx="5.5" fill="' + cuff + '"/>' +
      '<path d="M22.5 30q4 7 1 16M38.5 26.5q2.5 3.5 2 7.5M43.5 35q2.5 3 1.5 7" fill="none" stroke="' + O + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M29 41v6M34 41v6M39 41v6" stroke="' + O + '" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="18" y="51" width="32" height="3" rx="1.5" fill="#fff" opacity=".4"/><rect x="28.5" y="7" width="3.5" height="12" rx="1.75" fill="#fff" opacity=".9"/>' +
      (ring ? '<rect x="25" y="24" width="14.5" height="5" rx="2" fill="#e6ecfa" stroke="' + O + '" stroke-width="2.2"/>' : '') + '</g>';
  }
  I.hand = svg(handSvg('#ffffff', '#8a63e8', false) + sparkle(12, 14, 6, '#ffe27a') + sparkle(54, 10, 4, '#c9b6ff'));
  I.handGold = svg(handSvg('#ffd76a', '#e0892a', true) + sparkle(12, 14, 6, '#fff3b0'));
  I.gift = svg('<rect x="10" y="29" width="44" height="29" rx="4" fill="#ff6f9c" ' + SW + '/>' +
    '<rect x="7" y="20" width="50" height="12" rx="3" fill="#ff93b6" ' + SW + '/>' +
    '<path d="M28 20h8v38h-8z" fill="#ffd36b" ' + SW + '/>' +
    '<path d="M32 20c-4-9-15-12-15-5 0 4 7 5 15 5zM32 20c4-9 15-12 15-5 0 4-7 5-15 5z" fill="#ffd36b" ' + SW + '/>' +
    '<path d="M14 36v16" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>' + sparkle(56, 10, 6));
  var leaf = 'M32 31C27 25 18 23 20 15c2-6 10-5 12 0 2-5 10-6 12 0 2 8-7 10-12 16z';
  I.lucky = svg('<path d="M34 36c3 9 8 15 16 20" fill="none" stroke="' + O + '" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M34 36c3 9 8 15 16 20" fill="none" stroke="#3fae55" stroke-width="3" stroke-linecap="round"/>' +
    [0, 90, 180, 270].map(function (r) { return '<path d="' + leaf + '" transform="rotate(' + r + ' 32 32)" fill="' + (r % 180 ? '#5fd36a' : '#79e27f') + '" ' + SW + '/>'; }).join('') +
    '<circle cx="32" cy="32" r="3" fill="#3fae55" ' + SW + '/>' + sparkle(53, 12, 7) + sparkle(10, 50, 4, '#fff3b0'));

  // Cauldron icon per level (materials match the scene)
  var CAUL = [
    ['#2c2742', '#4a4370', '#120d1d', ''], ['#9a5230', '#d07a48', '#4a230f', 'patina'], ['#a7aec4', '#e3e8f5', '#3b3f55', 'shine'],
    ['#e2a93a', '#ffe08a', '#6b430a', 'gems'], ['#2fa36c', '#8de8bb', '#0b3d26', 'runes'], ['#8e6ff0', '#e2d6ff', '#2d1a72', 'facets'],
    ['#2a1d22', '#5a3a36', '#0a0505', 'cracks'], ['#1e2a72', '#8fa8ff', '#0a0f33', 'stars'],
    ['#ff8fc6', '#ffd3ea', '#8a1f5a', 'candy'], ['#7f5cff', '#ffffff', '#2d1a72', 'rainbow']];
  var caulCache = {};
  BW.iconCauldron = function (n) {
    n = Math.max(0, Math.min(CAUL.length - 1, n | 0));
    if (caulCache[n]) return caulCache[n];
    var m = CAUL[n], d = m[3], deco = '';
    if (d === 'patina') deco = '<circle cx="22" cy="44" r="3" fill="#5fc9a8" opacity=".55"/><circle cx="41" cy="49" r="2.4" fill="#5fc9a8" opacity=".5"/>';
    if (d === 'shine') deco = '<path d="M44 33q2 9-4 16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>';
    if (d === 'gems') deco = '<path d="M32 36l4 4-4 4-4-4z" fill="#ff4d6d" ' + SW + '/><circle cx="19" cy="38" r="2.6" fill="#4dc3ff" ' + SW + '/><circle cx="45" cy="38" r="2.6" fill="#4dc3ff" ' + SW + '/>';
    if (d === 'runes') deco = '<path d="M20 45q4-5 8 0t8 0 8 0" stroke="#0b3d26" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    if (d === 'facets') deco = '<path d="M14 34l12 16M30 34l-6 22M42 34l6 18" stroke="#fff" stroke-width="2" opacity=".55"/>';
    if (d === 'cracks') deco = '<path d="M18 38l6 5-2 6 6 4M44 36l-4 7 5 4" stroke="#ff8a2a" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>';
    if (d === 'stars') deco = sparkle(22, 44, 4, '#fff3b0') + sparkle(41, 48, 3, '#fff') + sparkle(33, 41, 2.2, '#fff');
    if (d === 'candy') deco = '<path d="M16 42l8-6M26 50l12-10M40 52l10-8" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>';
    if (d === 'rainbow') deco = '<path d="M13 46q19-12 38 0" stroke="#ff6f9c" stroke-width="3.2" fill="none"/><path d="M15 50q17-10 34 0" stroke="#ffe27a" stroke-width="3.2" fill="none"/><path d="M18 54q14-8 28 0" stroke="#5ff3e6" stroke-width="3.2" fill="none"/>';
    caulCache[n] = svg('<rect x="17" y="51" width="8" height="8" rx="2" fill="' + m[2] + '" ' + SW + '/><rect x="39" y="51" width="8" height="8" rx="2" fill="' + m[2] + '" ' + SW + '/>' +
      '<path d="M9 27C8 45 19 56 32 56S56 45 55 27z" fill="' + m[0] + '" ' + SW + '/>' +
      '<path d="M11 36q21 7 42 0" stroke="' + m[2] + '" stroke-width="4" fill="none"/>' + deco +
      '<path d="M15 33q1 10 8 16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".28"/>' +
      '<ellipse cx="32" cy="26" rx="25" ry="7.5" fill="' + m[1] + '" ' + SW + '/><ellipse cx="32" cy="26" rx="19.5" ry="4.6" fill="#5be36b"/>' +
      '<circle cx="26" cy="18" r="3.2" fill="#8dff9a" ' + SW + '/><circle cx="37" cy="13" r="2.2" fill="#8dff9a" ' + SW + '/>');
    return caulCache[n];
  };

  BW.ICON_FOR_HELPER = ['spoon', 'frog', 'shroom', 'cat', 'crystal', 'broom', 'bog', 'altar', 'dragon', 'forge', 'galaxy', 'unicorn', 'portal'];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  function badge(base, k) {
    return base.replace('</svg>', '<circle cx="48.5" cy="48.5" r="14.5" fill="#ffd36b" ' + SW + '/>' +
      '<text x="48.5" y="54" text-anchor="middle" font-size="' + (k >= 2 ? 13.5 : 16) + '" font-weight="800" fill="' + O + '" font-family="BrewDisplay, sans-serif">' + ROMAN[k] + '</text></svg>');
  }
  BW.icon = function (name) { return I[name] || I.potion; };
  BW.iconForUpgrade = function (u) {
    if (u.kind === 'tier') return badge(I[BW.ICON_FOR_HELPER[u.helper]], u.tier);
    if (u.kind === 'hand') { var k = Number(u.id.slice(1)) - 1; return badge(k >= 4 ? I.handGold : I.hand, k); }
    if (u.kind === 'combo' || u.kind === 'luck' || u.kind === 'bubble') return badge(u.kind === 'luck' ? I.lucky : I[u.id], Number(u.id.slice(1)) - 1);
    return I[u.id] || I.potion;
  };
  BW.iconForAch = function (a) {
    if (a.cat === 'stage') return BW.iconCauldron(a.n);
    var map = { brew: 'potion', click: 'c1', pps: 'g3', helpers: 'frog', nado: 'tornado', wisp: 'wisp', moon: 'moonstone', ups: 'g2', hands: 'hand', lucky: 'lucky',
      combo: 'combo', fever: 'fever', jackpot: 'jackpot', bubble: 'bubble', quest: 'scroll' };
    return I[map[a.cat]] || I.trophy;
  };
})(typeof window !== 'undefined' ? (window.BW = window.BW || {}) : (global.BW = global.BW || {}));
