// ===== Estado do jogo + persistência =====
const SAVE_KEY = 'project-infinity-idle-save';
const SAVE_VERSION = 3;   // v3: loadGame() passou a usar deepMerge() genérico (ver comentário lá)

function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// Mescla `data` (save) sobre `base` (sempre um defaultState() fresco) recursivamente: quando os
// dois lados têm um objeto plano na mesma chave, desce um nível em vez de substituir a referência
// inteira. Isso é o que garante que um campo novo adicionado ao default (ex.: S.npcs.request) entre
// mesmo quando o save já tinha a chave-pai (S.npcs) só com os campos antigos — a versão anterior
// fazia isso campo a campo (`S.npcs = Object.assign(base.npcs, data.npcs||{})`), mas um
// `Object.assign(base, data)` raso no topo já sobrescrevia `base.npcs` com a referência SALVA antes
// dessas linhas rodarem, então "mesclar com o default" virava mesclar um objeto com ele mesmo — bug
// real, descoberto ao adicionar sub-campos a `npcs`/`codex` (roadmap #10/#11). Chaves de dicionário
// dinâmico (heroId, roomId, ...) não têm "default" pra mesclar — como `out[k]` não existe nesses
// casos, o valor do save vence por inteiro, igual ao comportamento de sempre. Arrays são atômicos:
// o array do save substitui o do default por inteiro, nunca mescla item a item.
function deepMerge(base, data) {
  if (!isPlainObject(data)) return data === undefined ? base : data;
  const out = isPlainObject(base) ? base : {};
  for (const k in data) {
    out[k] = (isPlainObject(data[k]) && isPlainObject(out[k])) ? deepMerge(out[k], data[k]) : data[k];
  }
  return out;
}

function defaultState() {
  return {
    v: SAVE_VERSION,
    gold: 0,
    earned: 0,        // ouro ganho nesta run (para fases e prestígio)
    allEarned: 0,     // ouro ganho em todas as runs (para conquistas)
    clicks: 0,
    titleClicks: 0,
    goldenClicks: 0,
    eventsSeen: 0,
    playTime: 0,      // segundos jogados (total)
    lastClickAt: Date.now(),

    res: { madeira: 0, pedra: 0, ferro: 0, energia: 0, cristal: 0, conhecimento: 0 },

    gens: {},         // id -> quantidade
    upgrades: {},     // id -> true
    heroes: {},       // id -> { lvl, gear: { arma: item|null, amuleto: item|null }, fieldSlot: null|0..FIELD_SLOTS-1 }

    // Forja: bolsa de cartas acumuladas (equipar/desmanchar quando quiser) + total forjado (estatística)
    // item = { uid, slot, rarity, mult, icon, affixes:[{type,val}] }
    forge: { inventory: [], forged: 0, nextUid: 1 },

    combat: {
      wave: 1, maxWave: 1,
      hp: 0, maxHp: 0,
      boss: false, bossT: 0,
      bossCooldown: 0,   // kills de farm antes de re-desafiar o chefe
      fightT: 0,         // segundos que o inimigo atual está vivo (fúria do Berserker)
      kills: 0, bossKills: 0,
      bossMech: null,    // id de BOSS_MECHANICS ativa neste chefe (null se não for chefe ou sem mecânica sorteada)
      bossShiftPhys: false, // Rei Demônio: true = fase de resistência física ativa agora
      bossShiftT: 0,     // segundos até a próxima troca de resistência (Rei Demônio)
    },

    rooms: {},        // id -> nível
    baseGrid: [],     // posição na grade da Base: array de células (roomId | null); ver Game.ensureBaseGrid
    talents: {},      // id -> nível
    ach: {},          // id -> true
    luckyNumberSeen: false, // true se algum gerador já cruzou 77 unidades (para a conquista s2)

    essence: 0,
    prestiges: 0,

    buffs: [],        // { id, name, icon, until, prod?, click?, dps? }
    invasion: 0,      // inimigos restantes com bônus de invasão

    unlocked: { heroes: false, base: false, talents: false, prestige: false, events: false, phase7: false },
    maxPhaseId: 1,    // maior fase já alcançada (permanente — não regride com prestígio)

    // ---- Expansão: sistemas permanentes (sobrevivem ao prestígio) ----
    world: {          // calendário interno: min = minutos de jogo acumulados
      min: 8 * 60,    // começa às 8h do dia 0, primavera
      weather: null,  // { id, until } (until em minutos de jogo)
      nextAt: 12 * 60,       // minuto de jogo do próximo sorteio de clima
      seenSeasons: {},       // id -> true (conquista "As Quatro Estações")
      seenWeathers: {},      // id -> true
    },
    pets: {
      owned: {},      // id -> { lvl, xp }
      active: [],     // ids ativos (1 slot; pesquisa "Vínculo Animal" → 2)
      fed: 0,         // total de alimentações (conquistas/missões)
    },
    research: {
      done: {},       // id -> true
      queue: [],      // [{ id, left }] — só o primeiro progride
      autoBuy: false, // toggle do Autocomprador (após pesquisado)
    },
    market: {
      idx: {},        // recurso -> índice de preço (0.35..2.8)
      hist: {},       // recurso -> [índices por hora de jogo]
      lastHour: -1,
      stats: { trades: 0, sold: 0, bought: 0 },
    },
    npcs: {
      rep: {},        // npcId -> XP de amizade
      day: -1,        // dia de jogo do último reabastecimento
      offers: {},     // npcId -> [ofertas geradas do dia]
      used: {},       // npcId -> { idx: true } ofertas já usadas hoje
      mission: {},    // npcId -> { type, need, prog, done, claimed }
      request: {},    // npcId -> { res, need, claimed } — roadmap #10, pedido de recurso do dia
      relics: 0,
      missionsDone: 0,
      requestsDone: 0,
    },
    codex: { lore: {}, bossMechs: {}, gearSets: {}, events: {}, monsters: {} },   // roadmap #11: rastros pra completude por categoria
    secrets: {},           // flags de segredos: aldric, dot, highSell, scrapLegend, moonBoss
    advisorSeen: {},        // id de PHASE1_FLAVOR -> true (flavor do Aldric mostrado uma única vez)
    audio: { vol: 0.7, music: false },

    relics: { owned: {}, equipped: [null, null, null] },  // relicId -> true (owned) | equipped: array de relicId|null (RELIC_SLOTS)

    layers: { ascensions: 0, ascPoints: 0 },  // Progressão em Camadas (#13) — permanente, não reseta nem no prestígio nem na ascensão

    worldTree: { level: 0 },  // Árvore do Mundo (#12) — permanente, não reseta nem no prestígio nem na ascensão

    sound: true,
    flashFx: true,    // efeitos de tela cheia (flash de drop lendário)
    hand: 'right',    // 'right' (destro: moeda à direita no mobile) | 'left' (canhoto: à esquerda)
    last: Date.now(),
    started: Date.now(),
  };
}

let S = defaultState();

function saveGame() {
  S.last = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) { /* armazenamento cheio ou bloqueado */ }
}

function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    // deepMerge genérico sobre um defaultState() fresco: cobre res/combat/unlocked/world/pets/
    // research/market/npcs/codex/secrets/audio/relics/layers/worldTree recursivamente, sem precisar
    // de uma linha por campo (e sem o bug de self-merge que essas linhas tinham antes — ver
    // deepMerge acima). SAVE_VERSION fica como o ponto de entrada pra uma futura migração que
    // deepMerge não resolva sozinho (renomear/remodelar um campo em vez de só adicionar um novo):
    // `if ((data.v || 0) < N) { /* transformação pontual daquela versão */ }` antes do deepMerge.
    S = deepMerge(defaultState(), data);

    // normalizações que não são merge simples (tipo errado, array de tamanho fixo, id inválido)
    if (!Array.isArray(S.pets.active)) S.pets.active = [];
    if (!Array.isArray(S.research.queue)) S.research.queue = [];
    if (typeof S.codex.lore !== 'object' || !S.codex.lore) S.codex.lore = {};
    if (!Array.isArray(S.relics.equipped) || S.relics.equipped.length !== RELIC_SLOTS) {
      const eq = Array.isArray((data.relics || {}).equipped) ? data.relics.equipped : [];
      S.relics.equipped = new Array(RELIC_SLOTS).fill(null).map((_, i) => eq[i] || null);
    }
    // saves antigos podem ter equipado uma relíquia que não existe mais nos dados (id removido/renomeado)
    S.relics.equipped = S.relics.equipped.map(id => (id && RELICS.some(r => r.id === id)) ? id : null);
    if (typeof S.worldTree.level !== 'number' || S.worldTree.level < 0) S.worldTree.level = 0;
    // migração: saves antigos tinham forge.pending (carta única) — descartado (perda aceitável de 1 carta não decidida)
    const rawForge = data.forge || {};
    S.forge = {
      inventory: Array.isArray(rawForge.inventory) ? rawForge.inventory : [],
      forged: typeof rawForge.forged === 'number' ? rawForge.forged : 0,
      nextUid: typeof rawForge.nextUid === 'number' ? rawForge.nextUid : 1,
    };
    if (S.forge.inventory.length) {
      const maxUid = S.forge.inventory.reduce((m, i) => Math.max(m, i.uid || 0), 0);
      S.forge.nextUid = Math.max(S.forge.nextUid, maxUid + 1);
    }
    S.buffs = (S.buffs || []).filter(b => b && b.until > Date.now());
    S.lastClickAt = Date.now(); // reinicia o timer de inatividade a cada carregamento (conquista s4 conta só com o jogo aberto)

    // migração: saves antigos não têm fieldSlot nos heróis — aloca os mais fortes em campo
    // pra preservar o DPS que o jogador já tinha (senão todo mundo cairia pra reserva e o DPS zeraria)
    const ids = Object.keys(S.heroes);
    const needsFieldMigration = ids.some(id => S.heroes[id].fieldSlot === undefined);
    if (needsFieldMigration) {
      ids.sort((a, b) => {
        const ha = S.heroes[a], hb = S.heroes[b];
        const strA = (ha.lvl || 0) * (1 + (ha.gear.arma ? ha.gear.arma.mult : 0) + (ha.gear.amuleto ? ha.gear.amuleto.mult : 0));
        const strB = (hb.lvl || 0) * (1 + (hb.gear.arma ? hb.gear.arma.mult : 0) + (hb.gear.amuleto ? hb.gear.amuleto.mult : 0));
        return strB - strA;
      });
      ids.forEach((id, i) => { S.heroes[id].fieldSlot = i < FIELD_SLOTS ? i : null; });
      S._fieldSlotMigrated = true; // flag transitória — main.js mostra o aviso do conselheiro uma única vez
    }
    // migração: nº de slots pode ter diminuído desde o save — manda pra reserva quem ficou fora de faixa
    // (a pesquisa "Formação Estendida" concede um 5º slot, então o teto é dinâmico)
    const slotCap = FIELD_SLOTS + (S.research.done && S.research.done.quinto_slot ? 1 : 0);
    for (const id of ids) {
      const slot = S.heroes[id].fieldSlot;
      if (slot !== null && slot !== undefined && slot >= slotCap) S.heroes[id].fieldSlot = null;
    }
    // migração: saves antigos não têm maxPhaseId — reconstrói a partir dos sistemas já desbloqueados
    if (data.maxPhaseId === undefined) {
      let m = 1;
      if (S.unlocked.heroes) m = 2;
      if (S.unlocked.base) m = 3;
      if (S.unlocked.talents) m = 4;
      if (S.unlocked.prestige) m = 5;
      if (S.unlocked.events) m = 6;
      if (S.unlocked.phase7) m = 7;
      S.maxPhaseId = m;
    }
    return S;
  } catch (e) {
    return null;
  }
}

function exportSave() {
  S.last = Date.now();
  return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
}

function importSave(str) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    if (typeof data !== 'object' || data === null || typeof data.gold !== 'number') return false;
    // schema mínimo: só aceita chaves conhecidas e com o mesmo tipo do default
    const base = defaultState();
    const clean = {};
    for (const k in base) {
      if (!(k in data)) continue;
      if (typeof data[k] !== typeof base[k]) continue;
      if (Array.isArray(base[k]) !== Array.isArray(data[k])) continue;
      clean[k] = data[k];
    }
    // buffs vão para a UI — só formato conhecido, com strings curtas
    clean.buffs = (Array.isArray(data.buffs) ? data.buffs : []).filter(b =>
      b && typeof b === 'object' &&
      typeof b.id === 'string' && typeof b.name === 'string' && typeof b.icon === 'string' &&
      typeof b.until === 'number' && b.name.length <= 40 && b.icon.length <= 8
    );
    localStorage.setItem(SAVE_KEY, JSON.stringify(clean));
    return true;
  } catch (e) {
    return false;
  }
}

function hardReset() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  S = defaultState();
}
