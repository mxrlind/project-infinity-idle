// ===== Estado do jogo + persistência =====
const SAVE_KEY = 'project-infinity-idle-save';
const SAVE_VERSION = 1;

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
    heroes: {},       // id -> { lvl, gear: { arma: item|null, amuleto: item|null } }

    combat: {
      wave: 1, maxWave: 1,
      hp: 0, maxHp: 0,
      boss: false, bossT: 0,
      bossCooldown: 0,   // kills de farm antes de re-desafiar o chefe
      kills: 0, bossKills: 0,
    },

    rooms: {},        // id -> nível
    talents: {},      // id -> nível
    ach: {},          // id -> true
    luckyNumberSeen: false, // true se algum gerador já cruzou 77 unidades (para a conquista s2)

    essence: 0,
    prestiges: 0,

    buffs: [],        // { id, name, icon, until, prod?, click?, dps? }
    invasion: 0,      // inimigos restantes com bônus de invasão

    unlocked: { heroes: false, base: false, talents: false, prestige: false, events: false, phase7: false },
    maxPhaseId: 1,    // maior fase já alcançada (permanente — não regride com prestígio)

    sound: true,
    flashFx: true,    // efeitos de tela cheia (flash de drop lendário)
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
    // merge sobre o default para tolerar saves de versões antigas
    const base = defaultState();
    S = Object.assign(base, data);
    S.res = Object.assign(base.res, data.res || {});
    S.combat = Object.assign(base.combat, data.combat || {});
    S.unlocked = Object.assign(base.unlocked, data.unlocked || {});
    S.buffs = (data.buffs || []).filter(b => b && b.until > Date.now());
    S.lastClickAt = Date.now(); // reinicia o timer de inatividade a cada carregamento (conquista s4 conta só com o jogo aberto)
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
