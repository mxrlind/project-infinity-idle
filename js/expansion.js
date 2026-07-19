// ===== Expansão do motor: Mundo Vivo, Mascotes, Pesquisa, Mercado, NPCs, Lore, Segredos =====
// Carregado depois de game.js — adiciona sistemas ao objeto Game e estende o Sound.
// Integração com o motor original acontece via hooks pontuais (ext*Mult, tickExt, onKillExt...).

Object.assign(Game, {

  // ---------- Mundo Vivo ----------

  // estado derivado do calendário: dia, hora, estação, noite, clima ativo
  worldInfo() {
    const min = S.world.min;
    const day = Math.floor(min / 1440);
    const hour = Math.floor(min / 60) % 24;
    const season = SEASONS[Math.floor(day / SEASON_DAYS) % SEASONS.length];
    const isNight = hour >= WORLD_NIGHT_START || hour < WORLD_DAY_START;
    let weather = null;
    if (S.world.weather && S.world.weather.until > min) {
      weather = WEATHERS.find(w => w.id === S.world.weather.id) || null;
    }
    return { min, day, hour, season, isNight, weather };
  },

  // sorteia um clima válido para a estação/hora atual (ou céu limpo)
  rollWeather() {
    const w = this.worldInfo();
    const pool = WEATHERS.filter(def =>
      (!def.only || def.only.includes(w.season.id)) &&
      (!def.not || !def.not.includes(w.season.id)) &&
      (!def.night || w.isNight));
    let total = 0;
    for (const d of pool) total += d.weight;
    // ~45% de chance de céu limpo (clima não é constante)
    if (Math.random() < 0.45 || total === 0) return null;
    let roll = Math.random() * total;
    for (const d of pool) { roll -= d.weight; if (roll <= 0) return d; }
    return null;
  },

  tickWorld(dt) {
    const w0 = this.worldInfo();
    S.world.min += dt * WORLD_MIN_PER_SEC;
    const w1 = this.worldInfo();

    // registra estações vistas (conquista/consciência do mundo) e anuncia a troca uma vez por virada
    if (!S.world.seenSeasons[w1.season.id]) S.world.seenSeasons[w1.season.id] = true;
    if (w0.season.id !== w1.season.id) {
      UI.log(`${w1.season.icon} A estação mudou: <b>${w1.season.name}</b> — ${w1.season.desc}.`);
      UI.toast(`${w1.season.icon} ${w1.season.name} chegou!`, '#e8a33d');
    }

    // clima expirou?
    if (S.world.weather && S.world.weather.until <= S.world.min) {
      const old = WEATHERS.find(x => x.id === S.world.weather.id);
      if (old) UI.log(`${old.icon} ${old.name} passou. O céu limpa.`);
      S.world.weather = null;
    }

    // hora do próximo sorteio de clima
    if (S.world.min >= S.world.nextAt) {
      const def = this.rollWeather();
      if (def) {
        const hours = def.hours[0] + Math.random() * (def.hours[1] - def.hours[0]);
        S.world.weather = { id: def.id, until: S.world.min + hours * 60 };
        S.world.seenWeathers[def.id] = true;
        UI.log(`${def.icon} <b>${def.name}!</b> ${def.desc}.`);
        UI.toast(`${def.icon} ${def.name}`, def.id === 'eclipse' ? '#b06fd8' : '#4fa8d8', def.id === 'eclipse');
        Sound.play(def.id === 'eclipse' ? 'event' : 'weather');
      }
      S.world.nextAt = S.world.min + (4 + Math.random() * 6) * 60;   // 4–10 horas de jogo
    }
  },

  // multiplicadores agregados do mundo (estação + clima + dia/noite)
  worldMults() {
    const w = this.worldInfo();
    const out = { gold: 1, dps: 1, knowledge: 1, material: 1 };
    const apply = (m) => { if (m) for (const k in m) out[k] = (out[k] || 1) * m[k]; };
    apply(w.season.mults);
    if (w.weather) apply(w.weather.mults);
    if (w.isNight) { out.knowledge *= 1.15; out.gold *= 0.95; }   // a noite favorece o estudo
    return out;
  },

  // ---------- Mascotes ----------

  petsUnlocked() {
    for (const _ in S.pets.owned) return true;
    return false;
  },

  petSlots() { return 1 + (this.hasResearch('vinculo') ? 1 : 0); },

  petStage(lvl) {
    let s = 0;
    for (const at of PET_EVO_LEVELS) if (lvl >= at) s++;
    return s;
  },

  petXpNeed(petId) {
    const def = PETS.find(p => p.id === petId);
    const lvl = S.pets.owned[petId].lvl;
    return Math.ceil(30 * Math.pow(lvl, 1.55) * (1 + def.rarity * 0.15));
  },

  // soma o bônus de um tipo entre os mascotes ATIVOS (fração; ex.: 0.15 = +15%)
  petBonus(type) {
    let total = 0;
    for (const id of S.pets.active) {
      const p = S.pets.owned[id];
      const def = PETS.find(x => x.id === id);
      if (!p || !def || !def.bonus[type]) continue;
      total += def.bonus[type] * p.lvl * PET_EVO_MULTS[this.petStage(p.lvl)];
    }
    return total;
  },

  grantPet(petId, silent) {
    if (S.pets.owned[petId]) return false;
    const def = PETS.find(p => p.id === petId);
    S.pets.owned[petId] = { lvl: 1, xp: 0 };
    if (S.pets.active.length < this.petSlots()) S.pets.active.push(petId);
    if (!silent) {
      UI.log(`${def.icon} <b>${def.name}</b> se juntou a você! <i>${def.desc}</i>`);
      UI.toast(`${def.icon} Novo mascote: ${def.name}!`, RARITIES[def.rarity].color, true);
      Sound.play('petlvl');
    }
    UI.dirty.pets = true;
    UI.dirty.tabs = true;
    return true;
  },

  addPetXp(petId, xp) {
    const p = S.pets.owned[petId];
    if (!p || p.lvl >= PET_MAX_LVL) return;
    const w = this.worldInfo();
    if (w.weather && w.weather.petXp) xp *= w.weather.petXp;   // eclipse acelera mascotes
    p.xp += xp;
    while (p.lvl < PET_MAX_LVL && p.xp >= this.petXpNeed(petId)) {
      p.xp -= this.petXpNeed(petId);
      p.lvl++;
      const def = PETS.find(x => x.id === petId);
      if (PET_EVO_LEVELS.includes(p.lvl)) {
        const stage = this.petStage(p.lvl);
        UI.log(`${def.icon} <b>${def.evo[stage]}</b>! Seu mascote evoluiu (bônus ×${PET_EVO_MULTS[stage]})!`);
        UI.toast(`${def.icon} Evoluiu: ${def.evo[stage]}!`, '#b06fd8', true);
        UI.legendaryFlash('#b06fd8', true);
        Sound.play('evolve');
      } else if (p.lvl % 10 === 0) {
        UI.log(`${def.icon} ${def.name} alcançou o nível <b>${p.lvl}</b>!`);
        Sound.play('petlvl');
      }
      UI.dirty.pets = true;
    }
    if (p.lvl >= PET_MAX_LVL) p.xp = 0;
  },

  petFeedCost(petId) {
    const def = PETS.find(p => p.id === petId);
    const lvl = S.pets.owned[petId].lvl;
    return { res: def.food, amount: Math.ceil(def.foodBase * Math.pow(1.18, Math.floor(lvl / 3))) };
  },

  feedPet(petId) {
    const p = S.pets.owned[petId];
    if (!p || p.lvl >= PET_MAX_LVL) return false;
    const cost = this.petFeedCost(petId);
    if ((S.res[cost.res] || 0) < cost.amount) return false;
    S.res[cost.res] -= cost.amount;
    S.pets.fed++;
    this.addPetXp(petId, this.petXpNeed(petId) * 0.25);   // 4 refeições ≈ 1 nível
    this.missionEvent('feed', 1);
    Sound.play('buy');
    UI.dirty.pets = true;
    return true;
  },

  togglePetActive(petId) {
    if (!S.pets.owned[petId]) return false;
    const i = S.pets.active.indexOf(petId);
    if (i >= 0) S.pets.active.splice(i, 1);
    else {
      if (S.pets.active.length >= this.petSlots()) S.pets.active.shift();  // troca o mais antigo
      S.pets.active.push(petId);
    }
    UI.dirty.pets = true;
    return true;
  },

  // concessões automáticas (cobrem saves antigos e novos gatilhos)
  checkPetGrants() {
    if (!S.pets.owned.lobo) { for (const _ in S.heroes) { this.grantPet('lobo'); break; } }
    if (!S.pets.owned.coruja && this.hasResearch('domesticacao')) this.grantPet('coruja');
    if (!S.pets.owned.fenix && S.prestiges >= 1) this.grantPet('fenix');
    if (!S.pets.owned.dragao && S.npcs.relics >= NPC_RELICS_FOR_DRAGON) this.grantPet('dragao');
  },

  // ---------- Pesquisa ----------

  hasResearch(id) { return !!S.research.done[id]; },

  researchDef(id) { return RESEARCH.find(r => r.id === id); },

  researchCost(def) {
    const out = { know: def.cost.know || 0, gold: 0, mats: {} };
    if (def.cost.goldMult) out.gold = Math.ceil(this.enemyGold(S.combat.maxWave, false) * def.cost.goldMult);
    for (const k in def.cost) {
      if (k === 'know' || k === 'goldMult') continue;
      out.mats[k] = def.cost[k];
    }
    return out;
  },

  researchReqMet(def) {
    return !def.req || def.req.every(id => S.research.done[id]);
  },

  // Pesquisa 2.0 (#5): ramos exclusivos — concluir um lado de um par `exclusiveWith` tranca o outro
  // para sempre nesta run (só um caminho de build por par). Retorna o id do concluído que bloqueia,
  // ou null se `def` ainda está livre para ser pesquisada.
  researchExclusionBlocker(def) {
    if (!def.exclusiveWith) return null;
    return def.exclusiveWith.find(id => S.research.done[id]) || null;
  },

  // pesquisas visíveis: pré-requisitos cumpridos, não concluídas e não enfileiradas
  // (inclui ramos travados por exclusividade — a UI os mostra bloqueados, não os esconde)
  researchAvailable() {
    const queued = new Set(S.research.queue.map(q => q.id));
    return RESEARCH.filter(r => !S.research.done[r.id] && !queued.has(r.id) && this.researchReqMet(r));
  },

  canStartResearch(id) {
    const def = this.researchDef(id);
    if (!def || S.research.done[id]) return false;
    if (S.research.queue.length >= RESEARCH_QUEUE_MAX) return false;
    if (S.research.queue.some(q => q.id === id)) return false;
    if (!this.researchReqMet(def)) return false;
    if (this.researchExclusionBlocker(def)) return false;
    const c = this.researchCost(def);
    if (S.res.conhecimento < c.know || S.gold < c.gold) return false;
    for (const k in c.mats) if ((S.res[k] || 0) < c.mats[k]) return false;
    return true;
  },

  startResearch(id) {
    if (!this.canStartResearch(id)) return false;
    const def = this.researchDef(id);
    const c = this.researchCost(def);
    S.res.conhecimento -= c.know;
    S.gold -= c.gold;
    for (const k in c.mats) S.res[k] -= c.mats[k];
    S.research.queue.push({ id, left: def.time });
    UI.log(`${def.icon} Pesquisa iniciada: <b>${def.name}</b> (${fmtTime(def.time)})`);
    Sound.play('upgrade');
    UI.dirty.research = true;
    return true;
  },

  cancelResearch(index) {
    const q = S.research.queue[index];
    if (!q) return false;
    const def = this.researchDef(q.id);
    const c = this.researchCost(def);
    S.res.conhecimento += c.know * RESEARCH_CANCEL_REFUND;
    this.gainGold(c.gold * RESEARCH_CANCEL_REFUND);
    for (const k in c.mats) S.res[k] += c.mats[k] * RESEARCH_CANCEL_REFUND;
    S.research.queue.splice(index, 1);
    UI.log(`${def.icon} Pesquisa <b>${def.name}</b> cancelada (50% reembolsado).`);
    UI.dirty.research = true;
    return true;
  },

  researchSpeed() { return (1 + this.petBonus('research') + this.teamRoleEffects().research) * this.relicEffect('research'); },   // Bardo em campo + Relíquia (Ampulheta/Selo)

  completeResearch(id) {
    const def = this.researchDef(id);
    S.research.done[id] = true;
    UI.log(`${def.icon} <b>Pesquisa concluída: ${def.name}!</b> ${def.desc}.`);
    UI.toast(`${def.icon} ${def.name} concluída!`, '#5fbf6b', true);
    Sound.play('research');
    this.missionEvent('research', 1);
    if (def.unlock === 'coruja') this.grantPet('coruja');
    if (def.unlock === 'market' || def.unlock === 'npcs') UI.dirty.tabs = true;
    if (def.unlock === 'slot5') UI.dirty.heroes = true;
    // Relíquias (#6): concluir a árvore de pesquisa até o fim (Portais Estelares) rende uma relíquia
    if (id === 'portais') this.grantRelic();
    UI.dirty.research = true;
  },

  // progride a fila (só o primeiro item); usado pelo tick e pelo offline
  advanceResearch(seconds) {
    let sec = seconds * this.researchSpeed();
    const finished = [];
    while (sec > 0 && S.research.queue.length) {
      const cur = S.research.queue[0];
      if (cur.left > sec) { cur.left -= sec; sec = 0; }
      else {
        sec -= cur.left;
        S.research.queue.shift();
        this.completeResearch(cur.id);
        finished.push(cur.id);
      }
    }
    return finished;
  },

  // multiplicadores/descontos derivados das pesquisas concluídas
  researchMult(key) {
    let m = 1;
    for (const r of RESEARCH) if (S.research.done[r.id] && r.mult && r.mult[key]) m *= r.mult[key];
    return m;
  },
  researchFactor(field) {   // produto de campos escalares (genCost, heroCost, roomCost, essence, killGold, synergy, fee, potion)
    let m = 1;
    for (const r of RESEARCH) if (S.research.done[r.id] && r[field]) m *= r[field];
    return m;
  },
  researchDropBonus() {
    let b = 0;
    for (const r of RESEARCH) if (S.research.done[r.id] && r.drop) b += r.drop;
    return b;
  },

  // ---------- Mercado ----------

  marketUnlocked() { return this.hasResearch('comercio'); },

  ensureMarket() {
    for (const g of MARKET_GOODS) {
      if (typeof S.market.idx[g.id] !== 'number') {
        S.market.idx[g.id] = 0.85 + Math.random() * 0.4;
        S.market.hist[g.id] = [S.market.idx[g.id]];
      }
    }
  },

  marketUnitVal(goodId) {
    const g = MARKET_GOODS.find(x => x.id === goodId);
    return Math.max(0.1, this.enemyGold(Math.max(1, S.combat.maxWave), false) * g.k);
  },

  // um passo de preço por hora de jogo: pressão de demanda (estação/clima) + ruído
  stepMarket() {
    const w = this.worldInfo();
    for (const g of MARKET_GOODS) {
      let demand = 1;
      if (g.season && g.season[w.season.id]) demand *= g.season[w.season.id];
      if (g.weather && w.weather && g.weather[w.weather.id]) demand *= g.weather[w.weather.id];
      let idx = S.market.idx[g.id];
      idx += (demand - idx) * 0.12 + (Math.random() - 0.5) * 0.14;
      idx = Math.max(MARKET_IDX_MIN, Math.min(MARKET_IDX_MAX, idx));
      S.market.idx[g.id] = idx;
      const h = S.market.hist[g.id] || (S.market.hist[g.id] = []);
      h.push(Math.round(idx * 1000) / 1000);
      while (h.length > MARKET_HIST) h.shift();
    }
    if (UI.activeTab === 'market') UI.dirty.market = true;
  },

  tickMarket() {
    this.ensureMarket();
    const hour = Math.floor(S.world.min / 60);
    if (S.market.lastHour < 0) S.market.lastHour = hour;
    let steps = Math.min(hour - S.market.lastHour, MARKET_HIST);
    while (steps-- > 0) this.stepMarket();
    S.market.lastHour = hour;
  },

  marketFee() {
    const rep = this.npcLevel('mercador');
    return Math.max(0, MARKET_FEE * this.researchFactor('fee') * (1 - 0.03 * rep));
  },

  marketBuyPrice(goodId)  { return this.marketUnitVal(goodId) * S.market.idx[goodId] * (1 + this.marketFee()); },
  marketSellPrice(goodId) { return this.marketUnitVal(goodId) * S.market.idx[goodId] * (1 - this.marketFee()); },

  marketBuy(goodId, n) {
    this.ensureMarket();
    if (n === 'max') n = Math.floor(S.gold / this.marketBuyPrice(goodId));
    n = Math.floor(n);
    if (n <= 0) return false;
    const cost = this.marketBuyPrice(goodId) * n;
    if (S.gold < cost) return false;
    S.gold -= cost;
    S.res[goodId] = (S.res[goodId] || 0) + n;
    S.market.stats.trades++;
    S.market.stats.bought += n;
    Sound.play('buy');
    UI.dirty.market = true;
    return true;
  },

  marketSell(goodId, n) {
    this.ensureMarket();
    if (n === 'max') n = Math.floor(S.res[goodId] || 0);
    n = Math.floor(n);
    if (n <= 0 || (S.res[goodId] || 0) < n) return false;
    S.res[goodId] -= n;
    this.gainGold(this.marketSellPrice(goodId) * n);
    S.market.stats.trades++;
    S.market.stats.sold += n;
    if (S.market.idx[goodId] >= 2.2) S.secrets.highSell = true;   // segredo "Timing Perfeito"
    this.missionEvent('sell', n);
    Sound.play('sell');
    UI.dirty.market = true;
    return true;
  },

  // ---------- NPCs da Cidade ----------

  npcsUnlocked() { return this.hasResearch('cidade'); },

  npcLevel(npcId) {
    const xp = S.npcs.rep[npcId] || 0;
    let lvl = 0;
    for (let i = 0; i < NPC_FRIEND_XP.length; i++) if (xp >= NPC_FRIEND_XP[i]) lvl = i;
    return lvl;
  },

  addRep(npcId, n) {
    const before = this.npcLevel(npcId);
    S.npcs.rep[npcId] = (S.npcs.rep[npcId] || 0) + n;
    const after = this.npcLevel(npcId);
    if (after > before) {
      const def = NPCS.find(x => x.id === npcId);
      UI.log(`${def.icon} Amizade com <b>${def.name}</b> subiu para o nível <b>${after}</b>! <i>(${def.perk})</i>`);
      UI.toast(`${def.icon} ${def.name} — amizade nv ${after}!`, '#5fbf6b');
      Sound.play('npc');
    }
    UI.dirty.city = true;
  },

  // RNG determinístico por dia (estoque igual até o dia virar, mesmo com F5)
  _seededRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // gera as ofertas do dia de um NPC (2 por NPC, determinísticas pelo dia)
  npcDailyOffers(npcId, day) {
    const rng = this._seededRng(day * 7919 + npcId.length * 131 + npcId.charCodeAt(0) * 17);
    const pickRes = () => MARKET_GOODS[Math.floor(rng() * MARKET_GOODS.length)].id;
    const offers = [];
    switch (npcId) {
      case 'mercador': {
        for (let i = 0; i < 2; i++) {
          const res = pickRes();
          const n = Math.ceil((res === 'cristal' ? 2 : 60) * (0.7 + rng()));
          offers.push({ kind: 'bundle', res, n, disc: 0.25 });
        }
        // NPCs como Progressão (#9): amizade máxima com o Mercador abre o Mercado Negro
        // (desconto muito maior, sempre em cristal — o recurso mais raro do jogo).
        if (this.npcLevel('mercador') >= 5) {
          const n = Math.ceil(3 * (0.7 + rng()));
          offers.push({ kind: 'bundle', res: 'cristal', n, disc: 0.45, blackmarket: true });
        }
        break;
      }
      case 'ferreiro':
        offers.push({ kind: 'temper' });
        offers.push({ kind: 'reroll' });
        break;
      case 'mago': {
        const spells = [
          { buff: 'prod', mult: 2.5, name: 'Chuva Dourada', icon: '🪙' },
          { buff: 'dps', mult: 3, name: 'Fúria Arcana', icon: '⚡' },
          { buff: 'click', mult: 5, name: 'Dedo do Trovão', icon: '👆' },
        ];
        const a = Math.floor(rng() * spells.length);
        offers.push(Object.assign({ kind: 'buff', dur: 600 }, spells[a]));
        offers.push(Object.assign({ kind: 'buff', dur: 600 }, spells[(a + 1) % spells.length]));
        // NPCs como Progressão (#9): amizade máxima com o Mago abre Encantamentos —
        // reforja os afixos do item mais raro da Bolsa com rolagem sempre no topo do intervalo.
        if (this.npcLevel('mago') >= 5) offers.push({ kind: 'enchant' });
        break;
      }
      case 'alquimista': {
        const potions = [
          { pid: 'sabedoria', name: 'Poção de Sabedoria', icon: '📘', buff: 'know', mult: 3, dur: 600, mats: { madeira: 80, pedra: 60 } },
          { pid: 'sorte', name: 'Poção da Sorte', icon: '🍀', drop: 0.25, dur: 900, mats: { ferro: 50, cristal: 1 } },
          { pid: 'vigor', name: 'Poção de Vigor', icon: '🍖', petxp: 2, dur: 900, mats: { madeira: 60, ferro: 30 } },
        ];
        const a = Math.floor(rng() * potions.length);
        offers.push(Object.assign({ kind: 'potion' }, potions[a]));
        offers.push(Object.assign({ kind: 'potion' }, potions[(a + 1) % potions.length]));
        // NPCs como Progressão (#9): amizade máxima com a Alquimista abre o Elixir Supremo,
        // que combina os 3 efeitos das poções normais (produção + drop + XP de mascote) de uma vez.
        if (this.npcLevel('alquimista') >= 5) {
          offers.push({ pid: 'elixir', name: 'Elixir Supremo', icon: '🌟', kind: 'potion',
            buff: 'prod', mult: 2, drop: 0.15, petxp: 1.5, dur: 900, mats: { madeira: 150, ferro: 100, cristal: 2 } });
        }
        break;
      }
      case 'colecionador':
        offers.push({ kind: 'relic' });
        break;
    }
    return offers;
  },

  // vira o dia: novo estoque + novas missões para todos os NPCs
  ensureNpcDay() {
    const day = this.worldInfo().day;
    if (S.npcs.day === day) return;
    S.npcs.day = day;
    S.npcs.offers = {};
    S.npcs.used = {};
    for (const npc of NPCS) {
      S.npcs.offers[npc.id] = this.npcDailyOffers(npc.id, day);
      const m = NPC_MISSIONS[npc.id];
      const rng = this._seededRng(day * 104729 + npc.id.charCodeAt(0));
      const need = Math.ceil(m.n[0] + rng() * (m.n[1] - m.n[0]));
      S.npcs.mission[npc.id] = { type: m.type, need, prog: 0, done: false, claimed: false };
      // Roadmap #10: pedido de recurso do dia (entrega manual, recompensa maior que a missão)
      const r = NPC_REQUESTS[npc.id];
      if (r) {
        const rrng = this._seededRng(day * 613 + npc.id.charCodeAt(0) * 7 + 3);
        const rneed = Math.ceil(r.n[0] + rrng() * (r.n[1] - r.n[0]));
        S.npcs.request[npc.id] = { res: r.res, need: rneed, claimed: false };
      }
    }
    if (this.npcsUnlocked()) UI.log(`🏘️ A Cidade acordou: estoques e missões dos NPCs foram renovados.`);
    UI.dirty.city = true;
  },

  npcOfferInfo(npcId, i) {
    const o = (S.npcs.offers[npcId] || [])[i];
    if (!o) return null;
    const eg = this.enemyGold(S.combat.maxWave, false);
    const magoDisc = 1 - 0.10 * this.npcLevel('mago');
    switch (o.kind) {
      case 'bundle': {
        const g = MARKET_GOODS.find(x => x.id === o.res);
        this.ensureMarket();
        const gold = Math.ceil(this.marketUnitVal(o.res) * o.n * (1 - o.disc));
        const tag = o.blackmarket ? '🏴 <b>Mercado Negro</b> — ' : '';
        return { o, label: `${tag}${g.icon} ${fmt(o.n)} ${g.name} <span class="npc-disc">(−${Math.round(o.disc * 100)}%)</span>`, cost: { gold } };
      }
      case 'temper':
        return { o, label: `🔥 <b>Temperar</b>: +10% no poder-base de um item equipado aleatório`, cost: { gold: Math.ceil(eg * 25), ferro: 40 } };
      case 'reroll':
        return { o, label: `🎲 <b>Reforjar</b>: re-rola os afixos de uma carta aleatória da Bolsa`, cost: { gold: Math.ceil(eg * 15), cristal: 1 } };
      case 'enchant':
        return { o, label: `🪄 <b>Encantamento Arcano</b>: reforja os afixos do item mais raro da Bolsa com rolagem <b>perfeita</b> (sempre no topo do intervalo)`, cost: { gold: Math.ceil(eg * 40), cristal: 3, conhecimento: 40 } };
      case 'buff':
        return { o, label: `${o.icon} <b>${o.name}</b>: ${o.buff === 'prod' ? 'produção' : o.buff === 'dps' ? 'DPS' : 'clique'} ×${o.mult} por ${fmtTime(o.dur)}`, cost: { gold: Math.ceil(eg * 30 * magoDisc) } };
      case 'potion': {
        const dur = o.dur * this.researchFactor('potion');
        const power = 1 + 0.05 * this.npcLevel('alquimista');
        const buffNames = { know: 'conhecimento', prod: 'produção', dps: 'DPS', click: 'clique' };
        const effs = [];
        if (o.buff) effs.push(`${buffNames[o.buff] || o.buff} ×${(o.mult * power).toFixed(1)}`);
        if (o.drop) effs.push(`drop +${Math.round(o.drop * power * 100)}%`);
        if (o.petxp) effs.push(`XP de mascote ×${(o.petxp * power).toFixed(1)}`);
        return { o, label: `${o.icon} <b>${o.name}</b>: ${effs.join(' · ')} por ${fmtTime(dur)}`, cost: Object.assign({}, o.mats) };
      }
      case 'relic': {
        const cost = 3 + S.npcs.relics * 2;
        return { o, label: `🏺 <b>Trocar relíquia</b> (${S.npcs.relics}/${NPC_RELICS_FOR_DRAGON} para o Dragão 🐉) — paga em conhecimento`, cost: { cristal: cost } };
      }
    }
    return null;
  },

  canAffordOffer(cost) {
    for (const k in cost) {
      const have = k === 'gold' ? S.gold : (S.res[k] || 0);
      if (have < cost[k]) return false;
    }
    return true;
  },

  useOffer(npcId, i) {
    if (S.npcs.used[npcId] && S.npcs.used[npcId][i]) return false;
    const info = this.npcOfferInfo(npcId, i);
    if (!info || !this.canAffordOffer(info.cost)) return false;
    const o = info.o;

    // pré-validações que não devem cobrar antes de falhar
    if (o.kind === 'temper') {
      const equipped = [];
      for (const hid in S.heroes) for (const slot of GEAR_SLOTS) if (S.heroes[hid].gear[slot.id]) equipped.push({ hid, slot: slot.id });
      if (!equipped.length) { UI.toast('Nenhum item equipado!', '#ff6b5e'); return false; }
      o._target = equipped[Math.floor(Math.random() * equipped.length)];
    }
    if (o.kind === 'reroll' && !S.forge.inventory.length) { UI.toast('Bolsa vazia!', '#ff6b5e'); return false; }
    if (o.kind === 'enchant' && !S.forge.inventory.length) { UI.toast('Bolsa vazia!', '#ff6b5e'); return false; }

    for (const k in info.cost) {
      if (k === 'gold') S.gold -= info.cost[k];
      else S.res[k] -= info.cost[k];
    }

    const def = NPCS.find(x => x.id === npcId);
    switch (o.kind) {
      case 'bundle':
        S.res[o.res] = (S.res[o.res] || 0) + o.n;
        UI.log(o.blackmarket
          ? `🏴 O Mercado Negro de ${def.name} entregou <b>${fmt(o.n)}</b> ${MARKET_GOODS.find(g => g.id === o.res).name} — sem perguntas.`
          : `${def.icon} ${def.name} entregou <b>${fmt(o.n)}</b> ${MARKET_GOODS.find(g => g.id === o.res).name}.`);
        break;
      case 'temper': {
        const t = o._target;
        const item = S.heroes[t.hid].gear[t.slot];
        item.mult *= 1.10;
        this._gearDirty = true;
        const hdef = HEROES.find(x => x.id === t.hid);
        UI.log(`${def.icon} ${def.name} temperou ${item.icon} de <b>${hdef.name}</b>: agora +${Math.round(item.mult * 100)}% DPS!`);
        UI.dirty.heroes = true;
        break;
      }
      case 'reroll': {
        const item = S.forge.inventory[Math.floor(Math.random() * S.forge.inventory.length)];
        const tier = FORGE_TIERS[1];   // reforja com as regras da Fornalha
        item.affixes = this.rollAffixes(item.rarity, tier);
        UI.log(`${def.icon} ${def.name} reforjou ${item.icon}: ${item.affixes.map(a => UI.affixLabel(a)).join(' · ') || 'sem afixos'}.`);
        UI.dirty.heroes = true;
        break;
      }
      case 'enchant': {
        let best = S.forge.inventory[0];
        for (const it of S.forge.inventory) if (it.rarity > best.rarity) best = it;
        best.affixes = this.rollAffixes(best.rarity, FORGE_TIERS[2], best.element, true);   // rolagem perfeita (Encantamento, #9)
        UI.log(`${def.icon} ${def.name} encantou ${best.icon}: ${best.affixes.map(a => UI.affixLabel(a)).join(' · ') || 'sem afixos'} <i>(rolagem perfeita)</i>.`);
        UI.dirty.heroes = true;
        break;
      }
      case 'buff': {
        const mults = {};
        mults[o.buff] = o.mult;
        this.addBuff('mago_' + o.buff, o.name, o.icon, o.dur, mults);
        UI.log(`${def.icon} ${def.name} lançou <b>${o.name}</b>!`);
        break;
      }
      case 'potion': {
        const dur = o.dur * this.researchFactor('potion');
        const power = 1 + 0.05 * this.npcLevel('alquimista');
        const mults = {};
        if (o.buff) mults[o.buff] = o.mult * power;
        if (o.drop) mults.drop = o.drop * power;
        if (o.petxp) mults.petxp = o.petxp * power;
        this.addBuff('pocao_' + o.pid, o.name, o.icon, dur, mults);
        UI.log(`${def.icon} Você bebeu <b>${o.name}</b>. ${def.name}: <i>"${def.lines[0]}"</i>`);
        break;
      }
      case 'relic': {
        S.npcs.relics++;
        const know = Math.ceil(20 + S.npcs.relics * 15);
        S.res.conhecimento += know;
        this.addRep(npcId, 15);
        UI.log(`${def.icon} Relíquia trocada! <b>+${fmt(know)}</b> 📘 conhecimento. ${def.name}: <i>"${def.lines[Math.floor(Math.random() * def.lines.length)]}"</i>`);
        if (S.npcs.relics >= NPC_RELICS_FOR_DRAGON) this.checkPetGrants();
        this.grantRelic();   // Relíquias (#6): o Colecionador também entrega uma relíquia de verdade
        break;
      }
    }
    if (o.kind !== 'relic') this.addRep(npcId, 2);
    (S.npcs.used[npcId] = S.npcs.used[npcId] || {})[i] = true;
    Sound.play('npc');
    UI.dirty.city = true;
    return true;
  },

  // gancho de progresso das missões diárias (chamado pelos sistemas: sell/forge/research/feed/boss)
  missionEvent(type, n) {
    if (!this.npcsUnlocked()) return;
    for (const npcId in S.npcs.mission) {
      const m = S.npcs.mission[npcId];
      if (!m || m.done || m.type !== type) continue;
      m.prog += n;
      if (m.prog >= m.need) {
        m.done = true;
        const def = NPCS.find(x => x.id === npcId);
        UI.toast(`${def.icon} Missão de ${def.name} concluída! Colete na Cidade.`, '#5fbf6b');
        Sound.play('achievement');
        UI.dirty.city = true;
      }
    }
  },

  claimMission(npcId) {
    const m = S.npcs.mission[npcId];
    if (!m || !m.done || m.claimed) return false;
    m.claimed = true;
    const reward = Math.ceil(this.enemyGold(S.combat.maxWave, false) * 40);
    this.gainGold(reward);
    this.addRep(npcId, 8);
    S.npcs.missionsDone = (S.npcs.missionsDone || 0) + 1;
    const def = NPCS.find(x => x.id === npcId);
    UI.log(`${def.icon} Missão de <b>${def.name}</b> cumprida: <b>+${fmt(reward)}</b> ouro e +8 amizade!`);
    Sound.play('golden');
    UI.dirty.city = true;
    return true;
  },

  // Roadmap #10: entrega manual do pedido de recurso do dia — recompensa maior que a missão normal.
  claimRequest(npcId) {
    const req = S.npcs.request[npcId];
    if (!req || req.claimed) return false;
    if ((S.res[req.res] || 0) < req.need) return false;
    S.res[req.res] -= req.need;
    req.claimed = true;
    const reward = Math.ceil(this.enemyGold(S.combat.maxWave, false) * NPC_REQUESTS[npcId].rewardMult);
    this.gainGold(reward);
    this.addRep(npcId, 10);
    S.npcs.requestsDone = (S.npcs.requestsDone || 0) + 1;
    const def = NPCS.find(x => x.id === npcId);
    const g = MARKET_GOODS.find(x => x.id === req.res);
    UI.log(`${def.icon} <b>${def.name}</b> recebeu <b>${fmt(req.need)}</b> ${g ? g.name : req.res} e pagou <b>+${fmt(reward)}</b> ouro (+10 amizade)!`);
    Sound.play('golden');
    UI.dirty.city = true;
    return true;
  },

  // ---------- Lore (Codex → Descobertas) ----------

  checkLore() {
    const D = this.derived();
    for (const item of LORE_ITEMS) {
      if (S.codex.lore[item.id]) continue;
      let ok = false;
      try { ok = item.check(S, D); } catch (e) {}
      if (ok) {
        S.codex.lore[item.id] = true;
        UI.log(`${item.icon} <b>Descoberta:</b> ${item.kind} — <i>${item.title}</i> foi registrado no 📖 Códex.`);
        UI.toast(`${item.icon} Nova descoberta no Códex!`, '#b06fd8', true);
        Sound.play('lore');
      }
    }
  },

  // Roadmap #11: completude do Códex por categoria (Heróis/Chefes/Equipamentos/Relíquias/
  // Eventos/NPCs/Lore/Mascotes/Monstros). Cada categoria reaproveita contadores já existentes no
  // estado — só Chefes/Equipamentos/Eventos/Monstros precisaram de rastros novos (S.codex.*),
  // marcados no momento em que o conteúdo aparece pela 1ª vez (rollBossMechanic, activeSetBonuses,
  // fireWorldEvent, spawnEnemy).
  codexCompletion() {
    const npcMaxed = NPCS.filter(n => this.npcLevel(n.id) >= 5).length;
    // filtra pelas definições atuais (não Object.keys cru) — mesmo padrão do found=LORE_ITEMS.filter
    // em UI.showCodex, imune a chaves obsoletas que sobrem de versões antigas do save.
    const countDefs = (dict, defs) => defs.filter(d => dict[d.id]).length;
    const cats = {
      herois:       { name: 'Heróis',       icon: '🦸', have: Object.keys(S.heroes).length,                    total: HEROES.length },
      chefes:       { name: 'Chefes',       icon: '💀', have: countDefs(S.codex.bossMechs, BOSS_MECHANICS),    total: BOSS_MECHANICS.length },
      equip:        { name: 'Equipamentos', icon: '🛡️', have: countDefs(S.codex.gearSets, GEAR_SETS),         total: GEAR_SETS.length },
      reliquias:    { name: 'Relíquias',    icon: '🏺', have: countDefs(S.relics.owned, RELICS),               total: RELICS.length },
      eventos:      { name: 'Eventos',      icon: '🎪', have: countDefs(S.codex.events, WORLD_EVENTS),         total: WORLD_EVENTS.length },
      npcs:         { name: 'NPCs',         icon: '🏘️', have: npcMaxed,                                       total: NPCS.length },
      lore:         { name: 'Lore',         icon: '📖', have: countDefs(S.codex.lore, LORE_ITEMS),             total: LORE_ITEMS.length },
      mascotes:     { name: 'Mascotes',     icon: '🐾', have: Object.keys(S.pets.owned).length,                total: PETS.length },
      monstros:     { name: 'Monstros',     icon: '👹', have: countDefs(S.codex.monsters, MONSTER_CODEX),     total: MONSTER_CODEX.length },
    };
    let have = 0, total = 0;
    for (const k in cats) { have += cats[k].have; total += cats[k].total; }
    return { cats, have, total, pct: total > 0 ? have / total : 0 };
  },

  // ---------- Agregadores usados pelo motor original ----------

  extGoldMult()     { return this.worldMults().gold * (1 + this.petBonus('gold')) * this.researchMult('gold') * this.relicEffect('gold') * this.ascMult() * this.worldTreeMult(); },
  extDpsMult()      { return this.worldMults().dps * (1 + this.petBonus('dps')) * this.researchMult('dps') * this.relicEffect('dps') * this.ascMult() * this.worldTreeMult(); },
  extKnowMult()     { return this.worldMults().knowledge * (1 + this.petBonus('knowledge')) * this.buffMult('know'); },
  extMaterialMult() { return this.worldMults().material * this.relicEffect('material'); },
  extCritBonus()    { return this.petBonus('crit'); },
  extEssenceMult()  { return this.researchFactor('essence') * (1 + this.petBonus('essence')) * this.relicEffect('essence') * this.ascMult() * this.worldTreeMult(); },
  extGenCostMult()  { return this.researchFactor('genCost') * this.relicEffect('genCost'); },
  extHeroCostMult() { return this.researchFactor('heroCost') * this.relicEffect('heroCost'); },
  extRoomCostMult() { return this.researchFactor('roomCost') * this.relicEffect('roomCost'); },
  extSynergyMult()  { return this.researchFactor('synergy'); },
  extBossHpMult()   { return this.relicEffect('bossHp'); },       // Relíquias (#6): chefes com HP inflado
  extEventFreqMult(){ return this.relicEffect('eventFreq'); },    // Relíquias (#6): eventos mais/menos raros
  extKillGoldMult() {
    let m = this.researchFactor('killGold') * this.relicEffect('killGold');
    const w = this.worldInfo();
    if (w.weather && w.weather.killGold) m *= w.weather.killGold;
    return m;
  },
  extDropBonus() {
    let b = this.petBonus('drop') + this.researchDropBonus() + this.relicDropBonus();
    const w = this.worldInfo();
    if (w.weather && w.weather.drop) b += w.weather.drop;
    const now = Date.now();
    for (const buff of S.buffs) if (buff.until > now && buff.drop) b += buff.drop;   // Poção da Sorte
    return b;
  },
  extEnergyMult() {
    const w = this.worldInfo();
    return (w.weather && w.weather.energy) ? w.weather.energy : 1;
  },
  extPetXpBuff() {
    const now = Date.now();
    let m = 1;
    for (const b of S.buffs) if (b.until > now && b.petxp) m *= b.petxp;   // Poção de Vigor
    return m;
  },

  // ---------- Hooks chamados pelo motor original ----------

  // após cada abate (XP de mascote, missões, segredos, portais estelares)
  onKillExt(wasBoss) {
    const xp = (1 + S.combat.wave * 0.04) * (wasBoss ? 6 : 1) * this.extPetXpBuff();
    const active = S.pets.active;
    for (const id of active) this.addPetXp(id, xp / active.length);
    if (wasBoss) {
      this.missionEvent('boss', 1);
      const w = this.worldInfo();
      if (w.weather && w.weather.id === 'luacheia') S.secrets.moonBoss = true;
      if (w.weather && w.weather.id === 'eclipse' && this.hasResearch('portais')) {
        S.essence += 1;
        UI.log(`🌀 O portal estelar drenou o chefe: <b>+1 ✦ Essência</b>!`);
        UI.toast('🌀 +1 ✦ Essência (eclipse)!', '#b06fd8', true);
      }
      // Relíquias (#6): drop raro de chefe (chance pequena, só a partir de ondas altas)
      if (S.combat.wave >= 40 && Math.random() < 0.08) this.grantRelic();
    }
  },

  // após o reset do prestígio (Fênix devolve o ninho; Memória Persistente devolve geradores)
  onPrestigeExt(prevEarned) {
    if (S.pets.active.includes('fenix') && S.pets.owned.fenix) {
      const p = S.pets.owned.fenix;
      const def = PETS.find(x => x.id === 'fenix');
      const frac = Math.min(PET_KEEP_CAP, def.bonus.keep * p.lvl * PET_EVO_MULTS[this.petStage(p.lvl)]);
      const nest = prevEarned * frac;
      if (nest >= 1) {
        this.gainGold(nest);
        UI.log(`🔥 A Fênix protegeu um <b>ninho de ouro</b>: +${fmt(nest)} (${Math.round(frac * 100)}% da run anterior)!`);
      }
    }
    if (this.hasResearch('memoria')) {
      S.gens.aprendiz = Math.max(S.gens.aprendiz || 0, 10);
      S.gens.mina = Math.max(S.gens.mina || 0, 10);
      S.gens.mercado = Math.max(S.gens.mercado || 0, 10);
      UI.log(`🧬 <b>Memória Persistente:</b> 10 Aprendizes, Minas e Mercados lembraram de você.`);
    }
  },

  // ganhos offline dos novos sistemas (mundo avança, pesquisa progride, mercado se move)
  offlineExt(seconds) {
    S.world.min += seconds * WORLD_MIN_PER_SEC;
    if (S.world.weather && S.world.weather.until <= S.world.min) S.world.weather = null;
    if (S.world.nextAt < S.world.min) S.world.nextAt = S.world.min + (1 + Math.random() * 5) * 60;
    const finished = this.advanceResearch(seconds);
    this.tickMarket();
    this.ensureNpcDay();
    return { research: finished };
  },

  // ---------- Tick da expansão ----------

  _autoBuyT: 0,

  // Roadmap #15: contexto da música ambiente por prioridade boss > prestige > city > combat.
  musicContext() {
    if (S.combat.boss) return 'boss';
    if (UI.activeTab === 'prestige' || UI.activeTab === 'worldtree') return 'prestige';
    if (UI.activeTab === 'city') return 'city';
    return 'combat';
  },

  tickExt(dt) {
    Sound.setMusicContext(this.musicContext());
    this.tickWorld(dt);
    this.advanceResearch(dt);
    this.tickMarket();
    this.ensureNpcDay();
    this.checkPetGrants();

    // Autocomprador: gerador mais barato que couber no bolso, a cada 10s
    if (this.hasResearch('autocomprador') && S.research.autoBuy) {
      this._autoBuyT += dt;
      if (this._autoBuyT >= 10) {
        this._autoBuyT = 0;
        let best = null, bestCost = Infinity;
        for (const g of GENERATORS) {
          if (g.reqPrestige && S.prestiges < g.reqPrestige) continue;
          if ((S.gens[g.id] || 0) === 0 && S.earned < g.baseCost * 0.4) continue;
          const c = this.genCost(g.id, 1);
          if (c <= S.gold && c < bestCost) { bestCost = c; best = g.id; }
        }
        if (best) this.buyGen(best, 1);
      }
    }

    // Mão Fantasma: meio clique por segundo, contínuo
    if (this.hasResearch('autoclique')) this.gainGold(this.clickPower() * 0.5 * dt);
  },
});

// ===== Extensão do sistema de Áudio =====
// Ganho-mestre (volume), anti-sobreposição, novos efeitos e música ambiente gerativa.
(function () {
  const baseEnsure = Sound.ensure.bind(Sound);
  const baseTone = Sound.tone.bind(Sound);

  Object.assign(Sound, {
    master: null,
    musicGain: null,
    _lastPlay: {},
    _musicTimer: null,

    ensure() {
      baseEnsure();
      if (this.ctx && !this.master) {
        this.master = this.ctx.createGain();
        this.master.gain.value = (S.audio && typeof S.audio.vol === 'number') ? S.audio.vol : 0.7;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0;
        this.musicGain.connect(this.master);
      }
    },

    setVolume(v) {
      S.audio.vol = v;
      this.ensure();
      if (this.master) this.master.gain.value = v;
    },

    // roteia os tons pelo ganho-mestre (mantém a assinatura original)
    tone(freq, dur, type = 'sine', vol = 0.08, delay = 0) {
      if (!S.sound || !this.ctx) return;
      if (!this.master) { baseTone(freq, dur, type, vol, delay); return; }
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + dur);
    },

    // anti-sobreposição: o mesmo tipo de som não repete em menos de 60ms
    _throttled(kind) {
      const now = performance.now();
      if (this._lastPlay[kind] && now - this._lastPlay[kind] < 60) return true;
      this._lastPlay[kind] = now;
      return false;
    },

    playExt(kind) {
      switch (kind) {
        case 'research': this.tone(587, 0.1, 'sine', 0.08); this.tone(740, 0.1, 'sine', 0.08, 0.09); this.tone(880, 0.12, 'sine', 0.08, 0.18); this.tone(1174, 0.3, 'sine', 0.08, 0.27); return true;
        case 'petlvl':   this.tone(660, 0.08, 'triangle', 0.08); this.tone(830, 0.1, 'triangle', 0.08, 0.07); this.tone(990, 0.18, 'triangle', 0.08, 0.14); return true;
        case 'evolve':   [440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.07, i * 0.09)); return true;
        case 'npc':      this.tone(392, 0.09, 'triangle', 0.06); this.tone(494, 0.12, 'triangle', 0.06, 0.08); return true;
        case 'sell':     this.tone(700, 0.06, 'triangle', 0.06); this.tone(560, 0.1, 'triangle', 0.06, 0.05); return true;
        case 'error':    this.tone(180, 0.15, 'sawtooth', 0.05); this.tone(140, 0.2, 'sawtooth', 0.05, 0.1); return true;
        case 'lore':     this.tone(494, 0.2, 'sine', 0.07); this.tone(587, 0.25, 'sine', 0.07, 0.15); this.tone(392, 0.4, 'sine', 0.05, 0.3); return true;
        case 'weather':  this.tone(311, 0.25, 'sine', 0.05); this.tone(370, 0.3, 'sine', 0.05, 0.18); return true;
        case 'portal':   [220, 330, 440, 660, 880].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.05, i * 0.06)); return true;
      }
      return false;
    },

    // ---- Música ambiente gerativa (pentatônica, sem arquivos) ----
    // Roadmap #15: contexto (combat/boss/city/prestige) troca escala/timbre/tempo em tempo real,
    // via auto-agendamento (setTimeout recursivo) — o intervalo de cada nota lê o contexto atual,
    // então a transição acontece na próxima nota sem precisar parar/reiniciar a música.
    _musicCtx: 'combat',

    setMusicContext(ctx) {
      this._musicCtx = MUSIC_CONTEXTS[ctx] ? ctx : 'combat';
    },

    startMusic() {
      this.ensure();
      if (!this.ctx || this._musicTimer) return;
      if (this.musicGain) {
        this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        this.musicGain.gain.exponentialRampToValueAtTime(0.5, this.ctx.currentTime + 2);  // fade-in
      }
      let step = 0;
      const scheduleNext = () => {
        const cfg = MUSIC_CONTEXTS[this._musicCtx] || MUSIC_CONTEXTS.combat;
        this._musicTimer = setTimeout(() => {
          if (S.audio.music && S.sound && !document.hidden) {
            const t = this.ctx.currentTime;
            const note = cfg.scale[Math.floor(Math.random() * cfg.scale.length)];
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = cfg.wave;
            osc.frequency.value = note * (Math.random() < 0.2 ? 0.5 : 1);
            g.gain.setValueAtTime(cfg.vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + cfg.decay);
            osc.connect(g).connect(this.musicGain);
            osc.start(t);
            osc.stop(t + cfg.decay + 0.1);
            if (step % cfg.padEvery === 0) {   // pad grave ocasional
              const pad = this.ctx.createOscillator();
              const pg = this.ctx.createGain();
              pad.type = cfg.padWave;
              pad.frequency.value = cfg.padFreq;
              pg.gain.setValueAtTime(cfg.padVol, t);
              pg.gain.exponentialRampToValueAtTime(0.001, t + cfg.padDecay);
              pad.connect(pg).connect(this.musicGain);
              pad.start(t);
              pad.stop(t + cfg.padDecay + 0.1);
            }
            step++;
          }
          scheduleNext();
        }, cfg.interval);
      };
      scheduleNext();
    },

    stopMusic() {
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value || 0.001, this.ctx.currentTime);
        this.musicGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);  // fade-out
      }
      if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
    },
  });

  // intercepta play(): aplica throttle e novos efeitos, delega o resto ao original
  const basePlay = Sound.play.bind(Sound);
  Sound.play = function (kind) {
    if (!S.sound) return;
    this.ensure();
    if (!this.ctx) return;
    if (this._throttled(kind)) return;
    if (!this.playExt(kind)) basePlay(kind);
  };
})();
