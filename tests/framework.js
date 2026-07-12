// ===== Mini test runner (sem dependências, sem build) =====
// test(name, fn): registra um caso; fn lança se falhar (use as funções assert* abaixo).
// Ao final do carregamento da página, roda tudo e imprime o resumo no DOM + console.

const TESTS = [];
function test(name, fn) { TESTS.push({ name, fn }); }

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEqual'}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
  }
}

function assertClose(actual, expected, eps, msg) {
  eps = eps === undefined ? 1e-6 : eps;
  if (!(Math.abs(actual - expected) <= eps * Math.max(1, Math.abs(expected)))) {
    throw new Error(`${msg || 'assertClose'}: esperado ~${expected}, veio ${actual}`);
  }
}

function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg || 'assertTrue falhou');
}

function runTests() {
  const results = document.getElementById('results');
  const summary = document.getElementById('summary');
  let pass = 0, fail = 0;
  for (const t of TESTS) {
    const li = document.createElement('li');
    try {
      t.fn();
      pass++;
      li.className = 'pass';
      li.textContent = `✓ ${t.name}`;
      console.log(`✓ ${t.name}`);
    } catch (e) {
      fail++;
      li.className = 'fail';
      li.innerHTML = `✗ ${t.name}<span class="detail">${e.message}</span>`;
      console.error(`✗ ${t.name}:`, e.message);
    }
    results.appendChild(li);
  }
  summary.textContent = `${pass}/${TESTS.length} passaram` + (fail ? ` — ${fail} falharam` : '');
  summary.className = fail ? 'fail' : 'ok';
  window.__TEST_RESULTS__ = { pass, fail, total: TESTS.length };
}
