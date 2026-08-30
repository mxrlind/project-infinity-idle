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

// ---------- roomYield / matPerSec (marco de extração + fonte de cristal) ----------

test('roomYield: dobra a cada ROOM_MILESTONE níveis (marco de extração)', () => {
  S = defaultState();
  S.rooms.serraria = ROOM_MILESTONE - 1;
  assertEqual(Game.roomYield('serraria'), ROOM_MILESTONE - 1, 'antes do 1º marco é só o nível');
  S.rooms.serraria = ROOM_MILESTONE;
  assertEqual(Game.roomYield('serraria'), ROOM_MILESTONE * 2, '1º marco dobra');
  S.rooms.serraria = ROOM_MILESTONE * 2;
  assertEqual(Game.roomYield('serraria'), ROOM_MILESTONE * 2 * 4, '2º marco quadruplica');
});

test('roomYield: cresce mais rápido que o custo NÃO cresce — a Base deixa de travar', () => {
  // Antes do marco a produção era linear no nível contra um custo ×1.7/nível: a partir de ~nível 10
  // nenhum tempo de jogo alcançava o próximo nível. Aqui só garantimos o essencial: 10 níveis a mais
  // rendem MAIS que o dobro (linear renderia exatamente o dobro em 10→20).
  S = defaultState();
  S.rooms.mina_r = 10;
  const at10 = Game.roomYield('mina_r');
  S.rooms.mina_r = 20;
  assertTrue(Game.roomYield('mina_r') > at10 * 2, 'o marco tem que superar o crescimento linear');
});

test('matPerSec: cristal só flui a partir de CRYSTAL_MINE_LEVEL na Mina Profunda', () => {
  S = defaultState();
  S.rooms.mina_r = CRYSTAL_MINE_LEVEL - 1;
  assertEqual(Game.matPerSec().cristal, 0, 'abaixo do nível de corte não rende cristal');
  S.rooms.mina_r = CRYSTAL_MINE_LEVEL;
  assertTrue(Game.matPerSec().cristal > 0, 'a partir do nível de corte rende cristal');
});

test('matPerSec: pedra e ferro saem da mesma mina na proporção 3:1', () => {
  S = defaultState();
  S.rooms.mina_r = 12;
  const m = Game.matPerSec();
  assertClose(m.pedra / m.ferro, 3, 1e-9, '1,5 pedra/s contra 0,5 ferro/s');
});

// ---------- bossStudyMult (Estudo do Inimigo) ----------

test('bossStudyMult: não vale nada fora de um chefe', () => {
  S = defaultState();
  S.combat.boss = false;
  S.combat.bossTries = 5;
  assertEqual(Game.bossStudyMult(), 1);
});

test('bossStudyMult: soma BOSS_STUDY_PER_TRY por tentativa falha, com teto em BOSS_STUDY_MAX', () => {
  S = defaultState();
  S.combat.boss = true;
  S.combat.bossTries = 0;
  assertEqual(Game.bossStudyMult(), 1, 'sem tentativa falha não há bônus');
  S.combat.bossTries = 3;
  assertClose(Game.bossStudyMult(), 1 + 3 * BOSS_STUDY_PER_TRY, 1e-9);
  S.combat.bossTries = 1000;
  assertEqual(Game.bossStudyMult(), BOSS_STUDY_MAX, 'o teto existe pra não trivializar a parede');
});

// ---------- equilíbrio das compras ----------

test('geradores: nenhum tier de topo é armadilha (custo por ouro/s cresce no máximo ×1,6 por tier)', () => {
  // O ratio baseCost/prod define quanto ouro custa cada +1 ouro/s daquele gerador. Um salto grande
  // demais entre tiers é o que fazia o gerador recém-desbloqueado ser SEMPRE a pior compra do jogo.
  for (let i = 1; i < GENERATORS.length; i++) {
    const prev = GENERATORS[i - 1].baseCost / GENERATORS[i - 1].prod;
    const cur = GENERATORS[i].baseCost / GENERATORS[i].prod;
    assertTrue(cur / prev <= 1.6,
      `${GENERATORS[i].id} custa ${(cur / prev).toFixed(2)}× mais por ouro/s que ${GENERATORS[i - 1].id}`);
  }
});

test('heróis: a escada de contratação não tem degrau maior que 32×', () => {
  // O salto Thora→Vex era de 27× e criava a parede mais longa medida no simulador (~25 min sem
  // nenhuma compra de combate possível). Este teste é a trava contra reintroduzir um degrau assim.
  for (let i = 1; i < HEROES.length; i++) {
    const step = HEROES[i].baseCost / HEROES[i - 1].baseCost;
    assertTrue(step <= 32, `${HEROES[i].id} custa ${step.toFixed(1)}× o anterior (${HEROES[i - 1].id})`);
  }
});

// ---------- Base: sinergias em três níveis ----------

// Monta uma grade controlada: recebe {roomId: indice} e coloca o resto nas células que sobram.
function gridWith(placement, lvl) {
  const size = BASE_GRID_COLS * BASE_GRID_ROWS;
  const g = new Array(size).fill(null);
  for (const id in placement) g[placement[id]] = id;
  let free = 0;
  for (const r of ROOMS) {
    if (g.includes(r.id)) continue;
    while (g[free] !== null) free++;
    g[free] = r.id;
  }
  S.baseGrid = g;
  for (const r of ROOMS) S.rooms[r.id] = lvl === undefined ? 1 : lvl;
  return g;
}

test('cellsConnected: uma linha de células vizinhas está conectada; uma célula solta não está', () => {
  S = defaultState();
  assertTrue(Game.cellsConnected([0, 1, 2]), 'três em linha na mesma fileira');
  assertTrue(Game.cellsConnected([0, 1, 1 + BASE_GRID_COLS]), 'formato em L');
  assertTrue(!Game.cellsConnected([0, 2]), 'com um buraco no meio não conecta');
  assertTrue(!Game.cellsConnected([0, 1, 15]), 'uma célula longe quebra o grupo');
  assertTrue(Game.cellsConnected([7]), 'uma célula só é trivialmente conectada');
});

test('cellsConnected: diagonal NÃO conecta (a adjacência do jogo é ortogonal)', () => {
  S = defaultState();
  assertTrue(!Game.cellsConnected([0, BASE_GRID_COLS + 1]), 'canto a canto não vale');
});

test('activeComplexes: exige as salas construídas E conectadas entre si', () => {
  S = defaultState();
  const cx = ROOM_COMPLEXES.find(d => d.id === 'complexo_industrial');
  // as três em linha → ativo
  gridWith({ [cx.rooms[0]]: 0, [cx.rooms[1]]: 1, [cx.rooms[2]]: 2 }, 3);
  assertTrue(Game.activeComplexes().some(c => c.def.id === cx.id), 'em linha deveria ativar');
  // uma delas longe → inativo
  gridWith({ [cx.rooms[0]]: 0, [cx.rooms[1]]: 1, [cx.rooms[2]]: 15 }, 3);
  assertTrue(!Game.activeComplexes().some(c => c.def.id === cx.id), 'separada não deveria ativar');
  // conectadas, mas uma não construída → inativo
  gridWith({ [cx.rooms[0]]: 0, [cx.rooms[1]]: 1, [cx.rooms[2]]: 2 }, 3);
  S.rooms[cx.rooms[2]] = 0;
  assertTrue(!Game.activeComplexes().some(c => c.def.id === cx.id), 'sala nível 0 não conta');
});

test('activeComplexes: o bônus escala pelo MENOR nível entre as salas do complexo', () => {
  S = defaultState();
  const cx = ROOM_COMPLEXES.find(d => d.id === 'complexo_industrial');
  gridWith({ [cx.rooms[0]]: 0, [cx.rooms[1]]: 1, [cx.rooms[2]]: 2 }, 10);
  S.rooms[cx.rooms[1]] = 4;   // o elo mais fraco
  const found = Game.activeComplexes().find(c => c.def.id === cx.id);
  assertEqual(found.lvl, 4, 'o nível do complexo é o menor entre os membros');
});

test('adjacencyPairs: conta cada par de vizinhas construídas UMA vez só', () => {
  S = defaultState();
  const g = new Array(BASE_GRID_COLS * BASE_GRID_ROWS).fill(null);
  g[0] = 'serraria'; g[1] = 'mina_r';
  S.baseGrid = g;
  S.rooms = { serraria: 2, mina_r: 5 };
  const pairs = Game.adjacencyPairs();
  assertEqual(pairs.length, 1, 'duas salas lado a lado = um par, não dois');
  assertEqual(pairs[0].lvl, 2, 'o par vale pelo menor nível');
});

test('adjacencyPairs: sala de nível 0 não forma vizinhança', () => {
  S = defaultState();
  const g = new Array(BASE_GRID_COLS * BASE_GRID_ROWS).fill(null);
  g[0] = 'serraria'; g[1] = 'mina_r';
  S.baseGrid = g;
  S.rooms = { serraria: 2 };   // mina_r não construída
  assertEqual(Game.adjacencyPairs().length, 0);
});

test('synergyBonuses: soma os três níveis (vizinhança + combinação + complexo)', () => {
  S = defaultState();
  const g = new Array(BASE_GRID_COLS * BASE_GRID_ROWS).fill(null);
  // Quartel + Oficina lado a lado = combinação "Arsenal" (dps) + vizinhança (ouro)
  g[0] = 'quartel'; g[1] = 'oficina';
  S.baseGrid = g;
  S.rooms = { quartel: 5, oficina: 5 };
  const b = Game.synergyBonuses();
  const arsenal = ROOM_SYNERGIES.find(d => d.name === 'Arsenal');
  assertClose(b.dps, arsenal.per * 5, 1e-9, 'a combinação entra no bucket dela');
  assertClose(b.gold, ADJACENCY_BONUS * 5, 1e-9, 'e a vizinhança entra no ouro, cumulativa');
});

test('roomConnections: lista a vizinhança de TODO vizinho, inclusive quem também forma combinação', () => {
  // O bônus de adjacência é cumulativo com o da combinação (synergyBonuses soma os dois), então
  // filtrar da lista faria o painel reportar menos ouro do que o jogador realmente ganha. A
  // sobreposição é resolvida só no desenho das linhas.
  S = defaultState();
  const g = new Array(BASE_GRID_COLS * BASE_GRID_ROWS).fill(null);
  g[0] = 'quartel'; g[1] = 'oficina';
  S.baseGrid = g;
  S.rooms = { quartel: 5, oficina: 5 };
  const conn = Game.roomConnections(0);
  assertEqual(conn.combinacoes.length, 1, 'Arsenal aparece como combinação');
  assertEqual(conn.vizinhanca.length, 1, 'e a MESMA sala continua contando como vizinha');
});

runTests();
