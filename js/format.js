// ===== Formatação de números gigantes =====
const NUM_SUFFIXES = ['', ' K', ' Mi', ' Bi', ' Tri', ' Qa', ' Qi', ' Sx', ' Sp', ' Oc', ' No', ' Dc', ' UDc', ' DDc', ' TDc', ' QaDc', ' QiDc'];

function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    return n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
  }
  let tier = Math.floor(Math.log10(n) / 3);
  if (tier >= NUM_SUFFIXES.length) {
    return n.toExponential(2).replace('+', '');
  }
  let scaled = n / Math.pow(10, tier * 3);
  let digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  if (parseFloat(scaled.toFixed(digits)) >= 1000) {
    tier++;
    if (tier >= NUM_SUFFIXES.length) {
      return n.toExponential(2).replace('+', '');
    }
    scaled = n / Math.pow(10, tier * 3);
    digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  }
  return scaled.toFixed(digits) + NUM_SUFFIXES[tier];
}

function fmtRate(n) {
  return '+' + fmt(n) + '/s';
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return m + 'm ' + s + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

function fmtMult(m) {
  return '×' + (m >= 100 ? fmt(m) : (m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)));
}

function fmtPct(p) {
  return (p >= 0 ? '+' : '') + Math.round(p * 100) + '%';
}
