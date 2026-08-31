// ===== Runner de linha de comando: `node tests/run.js` =====
// Roda a MESMA suíte que tests/index.html, sem browser e sem npm install — só o `node:vm` da
// biblioteca padrão, na mesma filosofia zero-dependência/zero-build do resto do projeto.
//
// Existe porque a suíte de browser exige abrir a página na mão: não serve pra rodar antes de um
// commit nem em CI. Aqui o processo sai com código 1 se algum teste falhar, que é o que um hook de
// pre-commit ou um workflow de CI precisa.
//
// A ordem de carregamento espelha tests/index.html de propósito — se um arquivo novo do motor entrar
// lá, precisa entrar AQUI também (a lista ENGINE abaixo), senão a suíte de browser e a de terminal
// divergem silenciosamente.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// só o motor — nunca ui.js/main.js (as fórmulas testadas não tocam DOM, e main.js iniciaria o loop
// do jogo e um autosave capaz de sobrescrever save de verdade)
const ENGINE = [
  'js/format.js', 'js/data.js', 'js/state.js', 'js/game.js', 'js/expansion.js',
  'js/relics.js', 'js/bosses.js', 'js/gearsets.js', 'js/layers.js', 'js/worldtree.js',
  'js/daily.js',
];

// ---------- stubs de browser ----------
// Superfície real usada pelo motor: localStorage (state.js), performance.now e document.hidden
// (expansion.js), window.AudioContext (game.js). Nada mais.

function fakeElement() {
  const el = {
    children: [], className: '', textContent: '', innerHTML: '', style: {},
    appendChild(c) { el.children.push(c); return c; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    setAttribute() {}, addEventListener() {},
  };
  return el;
}

const storage = new Map();
const sandbox = {
  console,
  Math, Date, JSON, Object, Array, String, Number, Boolean, Error, RegExp, Map, Set, isNaN, parseInt, parseFloat, Infinity, NaN, undefined,
  setTimeout, clearTimeout, setInterval, clearInterval,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  escape, unescape, encodeURIComponent, decodeURIComponent,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  },
  document: {
    hidden: false,
    getElementById: () => fakeElement(),
    createElement: () => fakeElement(),
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    body: fakeElement(),
  },
  // o motor chama UI.log/UI.toast/Sound.play no meio da lógica (spawnEnemy, buyGen, killEnemy...):
  // sem este Proxy, testar essas funções morre num ReferenceError. Mesmo stub de tests/index.html.
  UI: new Proxy({ dirty: {}, R: {} }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'esc') return (s) => String(s);
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  }),
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// ---------- carga ----------
function load(rel) {
  const file = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  const code = fs.readFileSync(file, 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: rel });
  } catch (e) {
    console.error(`\x1b[31mFalha ao carregar ${rel}:\x1b[0m ${e.message}`);
    process.exit(1);
  }
}

for (const f of ENGINE) load(f);
vm.runInContext('Sound.play = () => {}; Sound.ensure = () => {}; Sound.tone = () => {};', sandbox);
load('tests/framework.js');
// argumento opcional: outro arquivo de teste (caminho relativo à raiz do projeto ou absoluto),
// útil pra rodar um subconjunto durante desenvolvimento
load(process.argv[2] || 'tests/formulas.test.js');   // chama runTests() no fim

// ---------- relatório ----------
// framework.js grava window.__TEST_RESULTS__ e já imprime ✓/✗ por caso via console.
const r = sandbox.__TEST_RESULTS__;
if (!r) {
  console.error('\x1b[31mA suíte não produziu resultado — runTests() não rodou.\x1b[0m');
  process.exit(1);
}

const cor = r.fail ? '\x1b[31m' : '\x1b[32m';
console.log(`\n${cor}${r.pass}/${r.total} passaram${r.fail ? ` — ${r.fail} falharam` : ''}\x1b[0m`);
process.exit(r.fail ? 1 : 0);
