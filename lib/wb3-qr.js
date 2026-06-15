/* ============================================================
 * wb3-qr.js — Générateur de QR code embarqué (hors-ligne, sans dépendance).
 * Portage compact de l'algorithme QR (ISO/IEC 18004), mode octet (UTF-8),
 * d'après l'implémentation domaine public de Nayuki (Project Nayuki).
 * API :  WB3QR.svg(texte, { ecl:'M', scale:4, margin:2, dark:'#000', light:'#fff' })
 *        WB3QR.matrix(texte, 'M')  -> { size, modules:boolean[][] }
 * ============================================================ */
(function (global) {
  'use strict';

  // Codewords de correction d'erreur par bloc, indexés [eclOrd][version]
  var ECC_CW = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  var ECC_BLK = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];
  var ECL = { L: { ord: 0, fb: 1 }, M: { ord: 1, fb: 0 }, Q: { ord: 2, fb: 3 }, H: { ord: 3, fb: 2 } };

  function rsMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z & 0xFF;
  }
  function rsDivisor(degree) {
    var result = []; for (var i = 0; i < degree; i++) result.push(0);
    result[degree - 1] = 1;
    var root = 1;
    for (var i = 0; i < degree; i++) {
      for (var j = 0; j < result.length; j++) {
        result[j] = rsMul(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = rsMul(root, 2);
    }
    return result;
  }
  function rsRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    for (var k = 0; k < data.length; k++) {
      var factor = data[k] ^ result.shift();
      result.push(0);
      for (var i = 0; i < divisor.length; i++) result[i] ^= rsMul(divisor[i], factor);
    }
    return result;
  }

  function getNumRawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      result -= (25 * na - 10) * na - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }
  function getNumDataCodewords(ver, eclOrd) {
    return Math.floor(getNumRawDataModules(ver) / 8) - ECC_CW[eclOrd][ver] * ECC_BLK[eclOrd][ver];
  }

  function alignPositions(ver) {
    if (ver === 1) return [];
    var num = Math.floor(ver / 7) + 2;
    var step = (ver === 32) ? 26 : Math.ceil((ver * 4 + 4) / (num * 2 - 2)) * 2;
    var result = [6];
    for (var pos = ver * 4 + 10; result.length < num; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  function utf8Bytes(str) {
    var out = [], s = unescape(encodeURIComponent(str));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xFF);
    return out;
  }

  // Construit la matrice QR (mode octet) pour le texte donné.
  function matrix(text, eclName) {
    var eclOrd = (ECL[eclName] || ECL.M).ord;
    var data = utf8Bytes(text);

    // Choix de la version minimale qui contient les données (mode octet).
    var ver = 0, dataCapacityBits = 0;
    for (var v = 1; v <= 40; v++) {
      var cc = (v <= 9) ? 8 : 16;                  // longueur du champ "nb caractères" en octet
      var usable = getNumDataCodewords(v, eclOrd) * 8;
      var need = 4 + cc + data.length * 8;          // mode(4) + count + données
      if (need <= usable) { ver = v; break; }
    }
    if (ver === 0) throw new Error('QR: données trop longues');

    var numDataCw = getNumDataCodewords(ver, eclOrd);

    // ── Bitstream : mode octet (0100) + nb caractères + octets ──
    var bb = [];
    function appendBits(val, len) { for (var i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1); }
    appendBits(0b0100, 4);
    appendBits(data.length, ver <= 9 ? 8 : 16);
    for (var i = 0; i < data.length; i++) appendBits(data[i], 8);
    // Terminateur + bourrage à l'octet + octets de remplissage 0xEC/0x11
    var capBits = numDataCw * 8;
    appendBits(0, Math.min(4, capBits - bb.length));
    while (bb.length % 8 !== 0) bb.push(0);
    for (var pad = 0xEC; bb.length < capBits; pad ^= 0xEC ^ 0x11) appendBits(pad, 8);

    // Octets de données
    var dataCw = [];
    for (var i = 0; i < bb.length; i += 8) {
      var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bb[i + j];
      dataCw.push(b);
    }

    // ── ECC + entrelacement par blocs ──
    var numBlocks = ECC_BLK[eclOrd][ver];
    var blockEcc = ECC_CW[eclOrd][ver];
    var rawCw = Math.floor(getNumRawDataModules(ver) / 8);
    var numShort = numBlocks - rawCw % numBlocks;
    var shortLen = Math.floor(rawCw / numBlocks);     // longueur bloc (data+ecc) court
    var divisor = rsDivisor(blockEcc);

    var blocks = [], k = 0;
    for (var b = 0; b < numBlocks; b++) {
      var datLen = shortLen - blockEcc + (b < numShort ? 0 : 1);
      var dat = dataCw.slice(k, k + datLen); k += datLen;
      var ecc = rsRemainder(dat, divisor);
      blocks.push({ dat: dat, ecc: ecc });
    }
    // Entrelacement
    var result = [];
    var maxDat = shortLen - blockEcc + 1;
    for (var i = 0; i < maxDat; i++)
      for (var b = 0; b < numBlocks; b++)
        if (i < blocks[b].dat.length) result.push(blocks[b].dat[i]);
    for (var i = 0; i < blockEcc; i++)
      for (var b = 0; b < numBlocks; b++) result.push(blocks[b].ecc[i]);

    // ── Matrice ──
    var size = ver * 4 + 17;
    var mods = [], isFn = [];
    for (var y = 0; y < size; y++) { mods.push(new Array(size).fill(false)); isFn.push(new Array(size).fill(false)); }
    function setFn(x, y, val) { if (x >= 0 && x < size && y >= 0 && y < size) { mods[y][x] = val; isFn[y][x] = true; } }

    // Timing
    for (var i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
    // Finders
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    // Alignements
    var ap = alignPositions(ver);
    for (var a = 0; a < ap.length; a++) for (var b2 = 0; b2 < ap.length; b2++) {
      if ((a === 0 && b2 === 0) || (a === 0 && b2 === ap.length - 1) || (a === ap.length - 1 && b2 === 0)) continue;
      var cx = ap[a], cy = ap[b2];
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++)
        setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    // Réserver zones format/version (marquées fonctionnelles)
    function reserveFormat() {
      for (var i = 0; i < 9; i++) { setFn(8, i, false); setFn(i, 8, false); }
      for (var i = 0; i < 8; i++) { setFn(size - 1 - i, 8, false); setFn(8, size - 1 - i, false); }
      setFn(8, size - 8, true); // module noir fixe
    }
    reserveFormat();
    if (ver >= 7) {
      for (var i = 0; i < 18; i++) { var x = i % 3, y = Math.floor(i / 3); setFn(5 - y, size - 9 - x, false); setFn(size - 9 - x, 5 - y, false); }
    }

    // ── Placement des données (zigzag) ──
    var bits = [];
    for (var i2 = 0; i2 < result.length; i2++) for (var j = 7; j >= 0; j--) bits.push((result[i2] >>> j) & 1);
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var c = 0; c < 2; c++) {
          var x = right - c;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!isFn[y][x] && bi < bits.length) { mods[y][x] = bits[bi] !== 0; bi++; }
        }
      }
    }

    // ── Masquage : on choisit le masque de plus faible pénalité ──
    function applyMask(m) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        if (isFn[y][x]) continue;
        var inv;
        switch (m) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = (x * y) % 2 + (x * y) % 3 === 0; break;
          case 6: inv = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
          case 7: inv = ((x + y) % 2 + (x * y) % 3) % 2 === 0; break;
        }
        if (inv) mods[y][x] = !mods[y][x];
      }
    }
    function drawFormat(m) {
      var fb = (ECL[eclName] || ECL.M).fb;
      var dataF = (fb << 3) | m;
      var rem = dataF;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fbits = ((dataF << 10) | rem) ^ 0x5412;
      // positions (15 bits)
      for (var i = 0; i <= 5; i++) setFn(8, i, ((fbits >> i) & 1) !== 0);
      setFn(8, 7, ((fbits >> 6) & 1) !== 0); setFn(8, 8, ((fbits >> 7) & 1) !== 0); setFn(7, 8, ((fbits >> 8) & 1) !== 0);
      for (var i = 9; i < 15; i++) setFn(14 - i, 8, ((fbits >> i) & 1) !== 0);
      for (var i = 0; i < 8; i++) setFn(size - 1 - i, 8, ((fbits >> i) & 1) !== 0);
      for (var i = 8; i < 15; i++) setFn(8, size - 15 + i, ((fbits >> i) & 1) !== 0);
      setFn(8, size - 8, true);
    }
    function drawVersion() {
      if (ver < 7) return;
      var rem = ver;
      for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vbits = (ver << 12) | rem;
      for (var i = 0; i < 18; i++) {
        var bit = ((vbits >> i) & 1) !== 0, a = Math.floor(i / 3), b = i % 3;
        setFn(a, size - 11 + b, bit); setFn(size - 11 + b, a, bit);
      }
    }
    function penalty() {
      var p = 0, i, j, run, color;
      // règle 1 : suites
      for (i = 0; i < size; i++) {
        run = 1;
        for (j = 1; j < size; j++) { if (mods[i][j] === mods[i][j - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; } else run = 1; }
        run = 1;
        for (j = 1; j < size; j++) { if (mods[j][i] === mods[j - 1][i]) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; } else run = 1; }
      }
      // règle 2 : blocs 2x2
      for (i = 0; i < size - 1; i++) for (j = 0; j < size - 1; j++)
        if (mods[i][j] === mods[i][j + 1] && mods[i][j] === mods[i + 1][j] && mods[i][j] === mods[i + 1][j + 1]) p += 3;
      // règle 3 : motifs 1:1:3:1:1
      var patt = [true, false, true, true, true, false, true];
      function hasPatt(get, len) {
        var cnt = 0;
        for (var s = 0; s <= len - 7; s++) {
          var ok = true; for (var t = 0; t < 7; t++) if (get(s + t) !== patt[t]) { ok = false; break; }
          if (ok) {
            var before = true, after = true;
            for (var t = 1; t <= 4; t++) { if (s - t < 0 || get(s - t)) before = false; }
            for (var t = 1; t <= 4; t++) { if (s + 7 + t - 1 >= len || get(s + 7 + t - 1)) after = false; }
            if (before || after) cnt++;
          }
        }
        return cnt;
      }
      for (i = 0; i < size; i++) {
        p += 40 * hasPatt(function (k) { return mods[i][k]; }, size);
        p += 40 * hasPatt(function (k) { return mods[k][i]; }, size);
      }
      // règle 4 : équilibre
      var dark = 0; for (i = 0; i < size; i++) for (j = 0; j < size; j++) if (mods[i][j]) dark++;
      var ratio = dark * 100 / (size * size);
      p += Math.floor(Math.abs(ratio - 50) / 5) * 10;
      return p;
    }

    var best = -1, bestP = Infinity, snapshot = mods.map(function (r) { return r.slice(); });
    for (var m = 0; m < 8; m++) {
      mods = snapshot.map(function (r) { return r.slice(); });
      drawFormat(m); applyMask(m);
      var pen = penalty();
      if (pen < bestP) { bestP = pen; best = m; }
    }
    mods = snapshot.map(function (r) { return r.slice(); });
    drawFormat(best); applyMask(best); drawVersion();

    return { size: size, modules: mods };
  }

  function svg(text, opts) {
    opts = opts || {};
    var ecl = opts.ecl || 'M', scale = opts.scale || 4, margin = opts.margin == null ? 2 : opts.margin;
    var dark = opts.dark || '#000', light = opts.light || '#fff';
    var qr = matrix(text, ecl), size = qr.size, dim = (size + margin * 2) * scale;
    var path = '';
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (qr.modules[y][x])
      path += 'M' + ((x + margin) * scale) + ',' + ((y + margin) * scale) + 'h' + scale + 'v' + scale + 'h-' + scale + 'z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" shape-rendering="crispEdges">' +
      '<rect width="' + dim + '" height="' + dim + '" fill="' + light + '"/>' +
      '<path d="' + path + '" fill="' + dark + '"/></svg>';
  }
  function dataUri(text, opts) { return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg(text, opts)))); }

  global.WB3QR = { matrix: matrix, svg: svg, dataUri: dataUri };
})(typeof window !== 'undefined' ? window : this);
