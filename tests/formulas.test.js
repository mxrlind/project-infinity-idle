// ===== Testes das fórmulas puras de js/game.js (+ layers.js/worldtree.js) =====
// Item 7 da AUDIT.md ("zero testes automatizados"). Cobre as fórmulas citadas explicitamente
// (genCost, essenceGain, enemyGold) mais as outras de mesma natureza (heroLvlCost, enemyMaxHp,
// roomCost, ascensionGain, worldTreeCost) — todas puras: leem `S`/`data.js`, não tocam DOM.
// Cada teste começa com `S = defaultState()` pra não herdar estado de um teste anterior.

// ---------- genCost / genMaxBuy ----------

test('genCost: 1ª unidade custa exatamente o baseCost', () => {
  S = defaultState();
  assertClose(Game.genCost('aprendiz', 1), 15, 1e-9);
});

test('genCost: fórmula fechada bate com a soma força-bruta (10 unidades já possuídas, comprando 7)', () => {
  S = defaultState();
  S.gens.aprendiz = 10;
  const closed = Game.genCost('aprendiz', 7);
  let brute = 0;
  for (let i = 0; i < 7; i++) brute += 15 * Math.pow(GEN_COST_MULT, 10 + i);
  assertClose(closed, brute, 1e-6, 'fórmula fechada vs força-bruta');
});

test('genCost: desconto do talento Barganha reduz o custo (nunca abaixo do piso de 50%)', () => {
  S = defaultState();
  const semTalento = Game.genCost('mina', 1);
  S.talents.barganha = 10; // qualquer nível > 0 já deve reduzir
  const comTalento = Game.genCost('mina', 1);
  assertTrue(comTalento < semTalento, 'custo deveria cair com Barganha');
  S.talents.barganha = 999; // nível absurdo: desconto tem que ficar travado no piso (0.5×)
  const noPiso = Game.genCost('mina', 1);
  assertClose(noPiso, semTalento * 0.5, 1e-6, 'piso de desconto (50%) deveria segurar o custo');
});

test('genMaxBuy: nunca compra além do ouro disponível, e comprar mais um sempre estoura o orçamento', () => {
  S = defaultState();
  S.gold = 1e6;
  S.gens.mina = 37; // owned arbitrário, testa a fórmula fechada em ponto não-trivial
  const n = Game.genMaxBuy('mina');
  assertTrue(Game.genCost('mina', n) <= S.gold, `genCost(${n}) deveria caber no ouro`);
  assertTrue(Game.genCost('mina', n + 1) > S.gold, `genCost(${n + 1}) deveria estourar o ouro`);
});

test('genMaxBuy: retorna 0 quando não dá nem pra comprar a 1ª unidade', () => {
  S = defaultState();
  S.gold = 1;
  assertEqual(Game.genMaxBuy('motor'), 0);
});

// ---------- heroLvlCost / heroMaxLevels ----------

test('heroLvlCost: fórmula fechada bate com a soma força-bruta (herói nv 20, comprando 15)', () => {
  S = defaultState();
  S.heroes.bran = { lvl: 20, gear: { arma: null, amuleto: null }, fieldSlot: 0 };
  const def = HEROES.find(h => h.id === 'bran');
  const closed = Game.heroLvlCost('bran', 15);
  let brute = 0;
  for (let i = 0; i < 15; i++) brute += def.baseCost * 0.2 * Math.pow(HERO_LVL_COST_MULT, 20 + i);
  assertClose(closed, brute, 1e-6, 'fórmula fechada vs força-bruta');
});

test('heroMaxLevels: nunca compra além do ouro, e mais um nível sempre estoura', () => {
  S = defaultState();
  S.gold = 5e9;
  S.heroes.bran = { lvl: 80, gear: { arma: null, amuleto: null }, fieldSlot: 0 };
  const n = Game.heroMaxLevels('bran');
  assertTrue(Game.heroLvlCost('bran', n) <= S.gold, `heroLvlCost(${n}) deveria caber no ouro`);
  assertTrue(Game.heroLvlCost('bran', n + 1) > S.gold, `heroLvlCost(${n + 1}) deveria estourar o ouro`);
});

// ---------- essenceGain (Prestígio) ----------

test('essenceGain: zero abaixo do piso de 1e8 ganho', () => {
  S = defaultState();
  S.earned = 1e8 - 1;
  assertEqual(Game.essenceGain(), 0);
});

test('essenceGain: bate a fórmula ⌊(earned/1e8)^0.45⌋ exatamente em 1e10 ganho', () => {
  S = defaultState();
  S.earned = 1e10;
  const expected = Math.floor(Math.pow(1e10 / 1e8, 0.45));
  assertEqual(Game.essenceGain(), expected);
});

test('essenceGain: dobrar o ouro ganho NÃO dobra a essência (expoente 0.45 achata a curva)', () => {
  S = defaultState();
  S.earned = 1e10;
  const g1 = Game.essenceGain();
  S.earned = 2e10;
  const g2 = Game.essenceGain();
  assertTrue(g2 < g1 * 2, 'a curva achatada não deveria deixar dobrar o ganho ao dobrar o ouro');
});

// ---------- enemyGold / enemyMaxHp (combate) ----------

test('enemyGold: escala 4×1.42^(onda-1) em estado limpo (sem talentos/sinergias/salas)', () => {
  S = defaultState();
  const wave = 25;
  const expected = 4 * Math.pow(1.42, wave - 1);
  assertClose(Game.enemyGold(wave, false), expected, 1e-6);
});

test('enemyGold: chefe vale 14× o inimigo comum da mesma onda (mesmo estado limpo)', () => {
  S = defaultState();
  const wave = 40;
  const normal = Game.enemyGold(wave, false);
  const boss = Game.enemyGold(wave, true);
  assertClose(boss, normal * 14, 1e-6);
});

test('enemyMaxHp: escala 15×1.45^(onda-1) em estado limpo', () => {
  S = defaultState();
  const wave = 33;
  const expected = 15 * Math.pow(1.45, wave - 1);
  assertClose(Game.enemyMaxHp(wave, false), expected, 1e-6);
});

test('enemyMaxHp: chefe vale 9× o inimigo comum da mesma onda', () => {
  S = defaultState();
  const wave = 50;
  const normal = Game.enemyMaxHp(wave, false);
  const boss = Game.enemyMaxHp(wave, true);
  assertClose(boss, normal * 9, 1e-6);
});

// ---------- roomCost (Base) ----------

test('roomCost: escala por costMult^nível e cresce com o nível', () => {
  S = defaultState();
  const def = ROOMS.find(r => r.id === 'serraria');
  const cost0 = Game.roomCost('serraria');
  assertClose(cost0.gold, def.baseCost.gold, 1e-6, 'nível 0 deveria custar exatamente o baseCost');
  S.rooms.serraria = 5;
  const cost5 = Game.roomCost('serraria');
  assertClose(cost5.gold, def.baseCost.gold * Math.pow(def.costMult, 5), 1e-6);
  assertTrue(cost5.gold > cost0.gold, 'custo deveria crescer com o nível');
});

// ---------- ascensionGain (Progressão em Camadas #13) ----------

test('ascensionGain: zero abaixo do piso de essência', () => {
  S = defaultState();
  S.essence = ASCENSION_ESSENCE_REQ - 1;
  assertEqual(Game.ascensionGain(), 0);
});

test('ascensionGain: bate a fórmula ⌊√(essência/req)⌋ acima do piso', () => {
  S = defaultState();
  S.essence = ASCENSION_ESSENCE_REQ * 9; // 9 é quadrado perfeito -> resultado exato, sem floor ambíguo
  assertEqual(Game.ascensionGain(), 3);
});

// ---------- worldTreeCost (Árvore do Mundo #12) ----------

test('worldTreeCost: é exatamente WORLD_TREE.costAt(nível atual)', () => {
  S = defaultState();
  S.worldTree.level = 7;
  const cost = Game.worldTreeCost();
  const expected = WORLD_TREE.costAt(7);
  assertEqual(cost.essence, expected.essence);
  assertEqual(cost.conhecimento, expected.conhecimento);
  assertEqual(cost.madeira, expected.madeira);
  assertEqual(cost.cristal, expected.cristal);
});

test('worldTreeCost: custo nunca fica mais barato a cada nível (pode empatar por causa do floor em bases pequenas)', () => {
  S = defaultState();
  let prevEssence = -1;
  for (let lvl = 0; lvl < 30; lvl++) {
    const c = WORLD_TREE.costAt(lvl);
    assertTrue(c.essence >= prevEssence, `custo de essência não deveria CAIR no nível ${lvl}`);
    prevEssence = c.essence;
  }
  // nota: os 2 primeiros níveis empatam em 1 essência (floor(1×1.15^0)=floor(1×1.15^1)=1) — é uma
  // imprecisão real e pequena da fórmula (base 1 é baixa demais pro floor distinguir), não um bug
  // deste teste; registrado aqui em vez de "corrigido" porque mexer no balanceamento do jogo não foi
  // o que foi pedido — só a cobertura de teste.
  assertEqual(WORLD_TREE.costAt(0).essence, WORLD_TREE.costAt(1).essence);
});

runTests();
