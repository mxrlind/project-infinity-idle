// ===== Motor do jogo =====

const Game = {

  // ---------- Multiplicadores derivados ----------

  achCount() { return Object.keys(S.ach).length; },
  talentLvl(id) { return S.talents[id] || 0; },
  roomLvl(id) { return S.rooms[id] || 0; },

  buffMult(kind) {
    let m = 1;
    const now = Date.now();
    for (const b of S.buffs) if (b.until > now && b[kind]) m *= b[kind];
    return m;
  },

  globalProdMult() {
    let m = 1;
    m *= 1 + 0.01 * this.achCount();                       // conquistas
    m *= 1 + 0.02 * S.essence;                             // essência
    m *= 1 + 0.05 * this.talentLvl('ganancia');            // talento
    m *= 1 + 0.03 * this.talentLvl('harmonia') * S.prestiges;
    m *= 1 + 0.06 * this.roomLvl('cofre');                 // sala
    for (const u of UPGRADES) if (u.type === 'global' && S.upgrades[u.id]) m *= u.mult;
    m *= this.buffMult('prod');
    return m;
  },

  genMult(genId) {
    let m = 1;
    for (const u of UPGRADES) if (u.type === 'gen' && u.gen === genId && S.upgrades[u.id]) m *= u.mult;
    const owned = S.gens[genId] || 0;
    m *= Math.pow(2, Math.floor(owned / GEN_MILESTONE));   // marcos de quantidade
    return m;
  },

  genProd(genId) {
    const g = GENERATORS.find(x => x.id === genId);
    const owned = S.gens[genId] || 0;
    return g.prod * owned * this.genMult(genId);
  },

  goldPerSec() {
    let total = 0;
    for (const g of GENERATORS) total += this.genProd(g.id);
    return total * this.globalProdMult();
  },

  genCost(genId, count = 1) {
    const g = GENERATORS.find(x => x.id === genId);
    const owned = S.gens[genId] || 0;
    const disc = Math.max(0.5, 1 - 0.015 * this.talentLvl('barganha'));
    let cost = 0;
    for (let i = 0; i < count; i++) cost += g.baseCost * Math.pow(GEN_COST_MULT, owned + i);
    return cost * disc;
  },

  genMaxBuy(genId) {
    let n = 0;
    while (n < 500 && this.genCost(genId, n + 1) <= S.gold) n++;
    return n;
  },

  clickPower() {
    let base = 1;
    for (const u of UPGRADES) if (u.type === 'click' && S.upgrades[u.id]) base *= u.mult;
    base *= 1 + 0.25 * this.talentLvl('maos');
    base *= 1 + 0.02 * S.essence;
    let pct = 0;
    for (const u of UPGRADES) if (u.type === 'clickProd' && S.upgrades[u.id]) pct += u.pct;
    base += this.goldPerSec() * pct;
    return base * this.buffMult('click');
  },

  // ---------- Heróis e combate ----------

  heroGearMult(heroId) {
    const h = S.heroes[heroId];
    if (!h) return 1;
    let m = 1;
    const power = 1 + 0.10 * this.roomLvl('oficina');
    for (const slot of GEAR_SLOTS) {
      const item = h.gear[slot.id];
      if (item) m *= 1 + item.mult * power;
    }
    return m;
  },

  heroDps(heroId) {
    const def = HEROES.find(x => x.id === heroId);
    const h = S.heroes[heroId];
    if (!h || h.lvl <= 0) return 0;
    return def.baseDps * h.lvl * Math.pow(2, Math.floor(h.lvl / HERO_MILESTONE)) * this.heroGearMult(heroId);
  },

  teamDps() {
    let total = 0;
    for (const id in S.heroes) total += this.heroDps(id);
    total *= 1 + 0.10 * this.roomLvl('quartel');
    total *= 1 + 0.10 * this.talentLvl('furia');
    total *= 1 + 0.01 * this.achCount();
    total *= this.buffMult('dps');
    return total;
  },

  heroHireCost(heroId) {
    return HEROES.find(x => x.id === heroId).baseCost;
  },

  heroLvlCost(heroId, count = 1) {
    const def = HEROES.find(x => x.id === heroId);
    const h = S.heroes[heroId];
    const lvl = h ? h.lvl : 0;
    let cost = 0;
    for (let i = 0; i < count; i++) cost += def.baseCost * 0.2 * Math.pow(HERO_LVL_COST_MULT, lvl + i);
    return cost;
  },

  heroMaxLevels(heroId) {
    const def = HEROES.find(x => x.id === heroId);
    const h = S.heroes[heroId];
    const lvl = h ? h.lvl : 0;
    let n = 0, gold = S.gold;
    while (n < 200) {
      const c = def.baseCost * 0.2 * Math.pow(HERO_LVL_COST_MULT, lvl + n);
      if (gold < c) break;
      gold -= c; n++;
    }
    return n;
  },

  enemyMaxHp(wave, boss) {
    return 15 * Math.pow(1.45, wave - 1) * (boss ? 9 : 1);
  },

  enemyGold(wave, boss) {
    let g = 4 * Math.pow(1.42, wave - 1) * (boss ? 14 : 1);
    g *= 1 + 0.08 * this.talentLvl('cacador');
    if (S.invasion > 0 && !boss) g *= 3;
    return g;
  },

  bossTimeLimit() { return 30 + 3 * this.talentLvl('paciencia'); },

  spawnEnemy() {
    const c = S.combat;
    c.boss = c.wave % 10 === 0 && c.bossCooldown === 0;
    c.maxHp = this.enemyMaxHp(c.wave, c.boss);
    c.hp = c.maxHp;
    c.bossT = c.boss ? this.bossTimeLimit() : 0;
  },

  dropChance() {
    let ch = 0.35;
    ch += 0.05 * this.roomLvl('oficina');
    ch += 0.04 * this.talentLvl('pilhagem');
    return Math.min(0.95, ch);
  },

  rollGear() {
    // sorteia herói contratado, slot e raridade (ondas altas puxam raridades maiores)
    const owned = Object.keys(S.heroes);
    if (owned.length === 0) return null;
    const heroId = owned[Math.floor(Math.random() * owned.length)];
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
    const waveBonus = Math.min(3, 1 + S.combat.wave / 100);
    let totalW = 0;
    const weights = RARITIES.map((r, i) => {
      const w = r.weight * (i >= 3 ? waveBonus : 1);
      totalW += w;
      return w;
    });
    let roll = Math.random() * totalW, idx = 0;
    for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll <= 0) { idx = i; break; } }
    const rar = RARITIES[idx];
    const mult = rar.power * (1 + S.combat.wave / 40) * (0.85 + Math.random() * 0.30);
    const icon = slot.icons[Math.floor(Math.random() * slot.icons.length)];
    return { heroId, slot: slot.id, rarity: idx, mult, icon };
  },

  onEnemyKilled() {
    const c = S.combat;
    const wasBoss = c.boss;
    const reward = this.enemyGold(c.wave, wasBoss);
    this.gainGold(reward);
    c.kills++;
    if (S.invasion > 0 && !wasBoss) S.invasion--;

    // materiais em ondas mais altas
    if (c.wave >= 12 && Math.random() < 0.30) {
      const amt = Math.ceil(c.wave / 10);
      S.res.pedra += amt;
      if (Math.random() < 0.5) S.res.ferro += Math.ceil(amt / 2);
    }
    if (wasBoss && c.wave >= 30 && Math.random() < 0.4) {
      S.res.cristal += 1;
      UI.log(`💠 O chefe soltou um <b>Cristal</b>!`);
    }

    if (wasBoss) {
      c.bossKills++;
      UI.log(`👑 Chefe da onda <b>${c.wave}</b> derrotado! <b>+${fmt(reward)}</b> ouro`);
      if (Math.random() < this.dropChance()) this.awardGear();
      c.wave++;
      c.maxWave = Math.max(c.maxWave, c.wave);
      this.heroChatter();
    } else {
      if (c.bossCooldown > 0) {
        c.bossCooldown--;
        if (c.bossCooldown === 0) UI.log('⚔️ O time se reagrupou. Desafiando o chefe novamente!');
      } else {
        c.wave++;
        c.maxWave = Math.max(c.maxWave, c.wave);
      }
    }
    this.spawnEnemy();
  },

  awardGear() {
    const item = this.rollGear();
    if (!item) return;
    const h = S.heroes[item.heroId];
    const def = HEROES.find(x => x.id === item.heroId);
    const rar = RARITIES[item.rarity];
    const current = h.gear[item.slot];
    if (!current || item.mult > current.mult) {
      h.gear[item.slot] = item;
      const isRare = item.rarity >= 3; // Épico ou Lendário
      UI.log(`${item.icon} <b>${def.name}</b> equipou <span style="color:${rar.color}">${rar.name}</span> (+${Math.round(item.mult * 100)}% DPS)!`);
      UI.toast(`${item.icon} ${rar.name} para ${def.name}!`, rar.color, isRare);
      if (isRare) UI.legendaryFlash(rar.color);
      Sound.play('drop');
      UI.dirty.heroes = true;
    } else {
      UI.log(`${item.icon} Drop <span style="color:${rar.color}">${rar.name}</span> vendido (inferior ao atual). +${fmt(this.enemyGold(S.combat.wave, false) * 5)} ouro`);
      this.gainGold(this.enemyGold(S.combat.wave, false) * 5);
    }
  },

  bossFailed() {
    const c = S.combat;
    UI.log(`⏳ O chefe da onda <b>${c.wave}</b> resistiu! O time recua para treinar (5 abates).`);
    c.bossCooldown = 5;
    this.spawnEnemy();
  },

  clickAttack() {
    // clicar no monstro causa dano
    const dmg = Math.max(1, this.teamDps() * 0.05 + this.clickPower() * 0.5);
    this.damageEnemy(dmg);
    return dmg;
  },

  damageEnemy(dmg) {
    const c = S.combat;
    if (c.hp <= 0) return;
    c.hp -= dmg;
    if (c.hp <= 0) this.onEnemyKilled();
  },

  heroChatter() {
    // heróis conversam em marcos (personalidade!)
    if (Math.random() > 0.25) return;
    const owned = Object.keys(S.heroes);
    if (!owned.length) return;
    const id = owned[Math.floor(Math.random() * owned.length)];
    const def = HEROES.find(x => x.id === id);
    const line = def.lines[Math.floor(Math.random() * def.lines.length)];
    UI.log(`${def.icon} <b>${def.name}:</b> <i>"${line}"</i>`);
  },

  // ---------- Economia ----------

  gainGold(amount) {
    S.gold += amount;
    S.earned += amount;
    S.allEarned += amount;
  },

  buyGen(genId, count) {
    if (count === 'max') count = this.genMaxBuy(genId);
    if (count <= 0) return false;
    const cost = this.genCost(genId, count);
    if (S.gold < cost) return false;
    S.gold -= cost;
    const before = S.gens[genId] || 0;
    S.gens[genId] = before + count;
    if (before < 77 && before + count >= 77) S.luckyNumberSeen = true;
    // marco de quantidade cruzado?
    if (Math.floor((before + count) / GEN_MILESTONE) > Math.floor(before / GEN_MILESTONE)) {
      const g = GENERATORS.find(x => x.id === genId);
      UI.log(`${g.icon} <b>${g.name}</b> atingiu ${Math.floor((before + count) / GEN_MILESTONE) * GEN_MILESTONE} unidades — produção <b>×2</b>!`);
      UI.toast(`${g.icon} ${g.name} ×2!`, '#e8a33d');
    }
    Sound.play('buy');
    UI.dirty.prod = true;
    return true;
  },

  buyUpgrade(upId) {
    const u = UPGRADES.find(x => x.id === upId);
    if (!u || S.upgrades[upId] || S.gold < u.cost) return false;
    S.gold -= u.cost;
    S.upgrades[upId] = true;
    UI.log(`${u.icon} Upgrade: <b>${u.name}</b> — ${u.desc}`);
    Sound.play('upgrade');
    UI.dirty.prod = true;
    return true;
  },

  hireHero(heroId) {
    const def = HEROES.find(x => x.id === heroId);
    if (S.heroes[heroId] || S.gold < def.baseCost) return false;
    S.gold -= def.baseCost;
    S.heroes[heroId] = { lvl: 1, gear: { arma: null, amuleto: null } };
    UI.log(`${def.icon} <b>${def.name}</b>, ${def.title}, entrou para o time!`);
    UI.log(`${def.icon} <b>${def.name}:</b> <i>"${def.lines[0]}"</i>`);
    Sound.play('hire');
    UI.dirty.heroes = true;
    return true;
  },

  levelHero(heroId, count) {
    const h = S.heroes[heroId];
    if (!h) return false;
    if (count === 'max') count = this.heroMaxLevels(heroId);
    if (count <= 0) return false;
    const cost = this.heroLvlCost(heroId, count);
    if (S.gold < cost) return false;
    S.gold -= cost;
    const before = h.lvl;
    h.lvl += count;
    if (Math.floor(h.lvl / HERO_MILESTONE) > Math.floor(before / HERO_MILESTONE)) {
      const def = HEROES.find(x => x.id === heroId);
      UI.log(`${def.icon} <b>${def.name}</b> nível ${h.lvl} — DPS <b>×2</b>!`);
      const line = def.lines[Math.floor(Math.random() * def.lines.length)];
      UI.log(`${def.icon} <b>${def.name}:</b> <i>"${line}"</i>`);
    }
    Sound.play('buy');
    UI.dirty.heroes = true;
    return true;
  },

  // ---------- Base ----------

  roomCost(roomId) {
    const r = ROOMS.find(x => x.id === roomId);
    const lvl = this.roomLvl(roomId);
    const cost = {};
    for (const k in r.baseCost) cost[k] = r.baseCost[k] * Math.pow(r.costMult, lvl);
    return cost;
  },

  canAffordRoom(roomId) {
    const cost = this.roomCost(roomId);
    for (const k in cost) {
      const have = k === 'gold' ? S.gold : S.res[k];
      if (have < cost[k]) return false;
    }
    return true;
  },

  buildRoom(roomId) {
    if (!this.canAffordRoom(roomId)) return false;
    const cost = this.roomCost(roomId);
    for (const k in cost) {
      if (k === 'gold') S.gold -= cost[k];
      else S.res[k] -= cost[k];
    }
    S.rooms[roomId] = this.roomLvl(roomId) + 1;
    const r = ROOMS.find(x => x.id === roomId);
    UI.log(`${r.icon} <b>${r.name}</b> agora é nível ${S.rooms[roomId]}!`);
    Sound.play('build');
    UI.dirty.base = true;
    return true;
  },

  energyBoost() { return 1 + 0.08 * this.roomLvl('gerador'); },

  knowledgePerSec() {
    return 0.2 * this.roomLvl('lab')
      * (1 + 0.15 * this.roomLvl('biblioteca'))
      * (1 + 0.10 * this.talentLvl('sabedoria'))
      * this.energyBoost();
  },

  // ---------- Talentos ----------

  talentCost(talId) {
    const t = TALENTS.find(x => x.id === talId);
    return Math.ceil(t.baseCost * Math.pow(TALENT_COST_MULT, this.talentLvl(talId)));
  },

  buyTalent(talId) {
    const t = TALENTS.find(x => x.id === talId);
    const lvl = this.talentLvl(talId);
    if (lvl >= t.max) return false;
    const cost = this.talentCost(talId);
    if (S.res.conhecimento < cost) return false;
    S.res.conhecimento -= cost;
    S.talents[talId] = lvl + 1;
    UI.log(`${t.icon} Talento <b>${t.name}</b> nível ${lvl + 1}!`);
    Sound.play('upgrade');
    UI.dirty.talents = true;
    return true;
  },

  // ---------- Prestígio ----------

  essenceGain() {
    if (S.earned < 1e8) return 0;
    let g = Math.floor(Math.pow(S.earned / 1e8, 0.45));
    g = Math.floor(g * (1 + 0.05 * this.talentLvl('transcend')));
    return g;
  },

  doPrestige() {
    const gain = this.essenceGain();
    if (gain < 1) return false;
    S.essence += gain;
    S.prestiges++;
    // reseta a run — mantém: essência, prestígios, conquistas, talentos, fases desbloqueadas
    S.gold = 0;
    S.earned = 0;
    S.gens = {};
    S.upgrades = {};
    S.heroes = {};
    S.combat = { wave: 1, maxWave: 1, hp: 0, maxHp: 0, boss: false, bossT: 0, bossCooldown: 0, kills: S.combat.kills, bossKills: S.combat.bossKills };
    S.rooms = {};
    S.res = { madeira: 0, pedra: 0, ferro: 0, energia: 0, cristal: 0, conhecimento: S.res.conhecimento };
    S.buffs = [];
    S.invasion = 0;
    this.spawnEnemy();
    UI.log(`🌅 <b>PRESTÍGIO ${S.prestiges}!</b> Você renasce com <b>+${gain} ✦ Essência</b> (agora ${S.essence} — produção global ×${(1 + 0.02 * S.essence).toFixed(2)})`);
    UI.toast(`✦ +${gain} Essência!`, '#e8a33d');
    Sound.play('prestige');
    UI.dirtyAll();
    return true;
  },

  // ---------- Fases ----------

  updatePhases() {
    const u = S.unlocked;
    const notify = (key, tip) => {
      if (!u[key]) {
        u[key] = true;
        UI.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${tip}"</i>`);
        UI.toast('🔓 Novo sistema desbloqueado!', '#e8a33d');
        Sound.play('unlock');
        UI.dirtyAll();
      }
    };
    if (S.earned >= PHASES[1].at) notify('heroes', ADVISOR_TIPS.heroes);
    if (S.earned >= PHASES[2].at) notify('base', ADVISOR_TIPS.base);
    if (S.earned >= PHASES[3].at) notify('talents', ADVISOR_TIPS.talents);
    if (S.earned >= PHASES[4].at) notify('prestige', ADVISOR_TIPS.prestige);
    if (S.earned >= PHASES[5].at || S.prestiges >= 1) notify('events', ADVISOR_TIPS.events);
    if (S.earned >= PHASES[6].at) notify('phase7', ADVISOR_TIPS.phase7);

    const reached = this.earnedPhase().id;
    if (reached > S.maxPhaseId) S.maxPhaseId = reached;
  },

  // fase indicada pelo ouro ganho nesta run (reseta no prestígio)
  earnedPhase() {
    let p = PHASES[0];
    for (const ph of PHASES) if (S.earned >= ph.at) p = ph;
    return p;
  },

  // fase exibida ao jogador — nunca regride, mesmo após prestígio
  currentPhase() {
    const earned = this.earnedPhase();
    if (S.maxPhaseId > earned.id) return PHASES.find(p => p.id === S.maxPhaseId) || earned;
    return earned;
  },

  // próxima fase ainda não alcançada permanentemente, e progresso do ouro desta run até ela
  nextPhaseProgress() {
    const next = PHASES.find(p => p.id === S.maxPhaseId + 1);
    if (!next) return null;
    const prev = PHASES.find(p => p.id === S.maxPhaseId);
    const span = next.at - (prev ? prev.at : 0);
    const pct = span > 0 ? Math.max(0, Math.min(1, S.earned / next.at)) : 1;
    return { next, pct };
  },

  // ---------- Conquistas ----------

  derived() {
    let totalGens = 0;
    for (const id in S.gens) totalGens += S.gens[id];
    let heroCount = 0, maxHeroLvl = 0;
    for (const id in S.heroes) { heroCount++; maxHeroLvl = Math.max(maxHeroLvl, S.heroes[id].lvl); }
    let totalRooms = 0;
    for (const id in S.rooms) totalRooms += S.rooms[id];
    let totalTalents = 0;
    for (const id in S.talents) totalTalents += S.talents[id];
    const idleTime = (Date.now() - S.lastClickAt) / 1000;
    return { totalGens, heroCount, maxHeroLvl, totalRooms, totalTalents, idleTime };
  },

  checkAchievements() {
    const D = this.derived();
    for (const a of ACHIEVEMENTS) {
      if (S.ach[a.id]) continue;
      let ok = false;
      try { ok = a.check(S, D); } catch (e) {}
      if (ok) {
        S.ach[a.id] = true;
        UI.log(`🏅 Conquista: <b>${a.name}</b> — ${a.desc} <span class="ach-bonus">(+1% produção)</span>`);
        UI.toast(`🏅 ${a.name}`, '#e8a33d');
        Sound.play('achievement');
        UI.dirty.ach = true;
        UI.dirty.prod = true;
      }
    }
  },

  // conquista (normal ou secreta) mais perto de ser batida
  closestAchievement() {
    const D = this.derived();
    let best = null, bestPct = -1;
    for (const a of ACHIEVEMENTS) {
      if (S.ach[a.id] || !a.progress) continue;
      let cur, target;
      try { [cur, target] = a.progress(S, D); } catch (e) { continue; }
      const pct = target > 0 ? Math.min(0.999, cur / target) : 0;
      if (pct > bestPct) { bestPct = pct; best = a; }
    }
    if (!best) return null;
    return { ach: best, pct: Math.max(0, bestPct) };
  },

  // ---------- Eventos ----------

  eventTimer: 0,
  goldenTimer: 0,

  scheduleEvent() {
    const freq = 1 + 0.10 * this.talentLvl('fortuna');
    this.eventTimer = (160 + Math.random() * 180) / freq;
  },

  scheduleGolden() {
    const freq = 1 + 0.10 * this.talentLvl('fortuna');
    this.goldenTimer = (70 + Math.random() * 150) / freq;
  },

  addBuff(id, name, icon, dur, mults) {
    // renova se já existir
    S.buffs = S.buffs.filter(b => b.id !== id);
    S.buffs.push(Object.assign({ id, name, icon, until: Date.now() + dur * 1000 }, mults));
    UI.dirty.left = true;
  },

  fireWorldEvent() {
    const ev = WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)];
    S.eventsSeen++;
    Sound.play('event');
    switch (ev.type) {
      case 'instant': { // meteorito
        const stone = 50 + Math.ceil(S.combat.maxWave * 2);
        const iron = 20 + Math.ceil(S.combat.maxWave);
        S.res.pedra += stone;
        S.res.ferro += iron;
        UI.showEventBanner(ev, `+${fmt(stone)} pedra, +${fmt(iron)} ferro!`);
        break;
      }
      case 'buff': {
        const mults = {};
        if (ev.prod) mults.prod = ev.prod;
        if (ev.dps) mults.dps = ev.dps;
        this.addBuff(ev.id, ev.name, ev.icon, ev.dur, mults);
        UI.showEventBanner(ev, '');
        break;
      }
      case 'invasion': {
        S.invasion = ev.count;
        UI.showEventBanner(ev, '');
        break;
      }
      case 'offer': { // mercador
        const price = Math.max(100, S.gold * 0.15);
        UI.showMerchantOffer(price);
        break;
      }
    }
    UI.log(`${ev.icon} <b>Evento:</b> ${ev.desc}`);
  },

  acceptMerchant(price) {
    if (S.gold < price) return false;
    S.gold -= price;
    const roll = Math.random();
    if (roll < 0.45) {
      this.addBuff('pactoProd', 'Pacto do Mercador', '🧙', 240, { prod: 3 });
      UI.log('🧙 O pacto foi selado: <b>produção ×3 por 4 minutos</b>!');
    } else if (roll < 0.8) {
      this.addBuff('pactoDps', 'Lâmina do Mercador', '🧙', 240, { dps: 4 });
      UI.log('🧙 O pacto foi selado: <b>DPS ×4 por 4 minutos</b>!');
    } else {
      this.awardGear();
      UI.log('🧙 O mercador entregou um <b>equipamento misterioso</b>!');
    }
    Sound.play('upgrade');
    return true;
  },

  clickGolden() {
    S.goldenClicks++;
    Sound.play('golden');
    const roll = Math.random();
    if (roll < 0.5) {
      const gain = Math.max(this.clickPower() * 150, this.goldPerSec() * 90);
      this.gainGold(gain);
      UI.log(`🌟 Moeda dourada! <b>+${fmt(gain)}</b> ouro instantâneo!`);
      return { kind: 'gold', amount: gain };
    } else {
      this.addBuff('frenesi', 'Frenesi Dourado', '🌟', 30, { prod: 7 });
      UI.log('🌟 Moeda dourada! <b>FRENESI: produção ×7 por 30s!</b>');
      return { kind: 'frenzy' };
    }
  },

  // ---------- Offline ----------

  computeOffline() {
    const dt = (Date.now() - S.last) / 1000;
    if (dt < 60) return null;
    const capped = Math.min(dt, 12 * 3600);
    const offMult = 0.5 * (1 + 0.10 * this.talentLvl('sonho'));
    const gold = this.goldPerSec() * capped * offMult;
    const know = this.knowledgePerSec() * capped * offMult;
    if (gold > 0) this.gainGold(gold);
    if (know > 0) S.res.conhecimento += know;
    // salas produzem materiais offline
    const eb = this.energyBoost();
    S.res.madeira += 2 * this.roomLvl('serraria') * eb * capped * offMult;
    S.res.pedra += 1.5 * this.roomLvl('mina_r') * eb * capped * offMult;
    S.res.ferro += 0.5 * this.roomLvl('mina_r') * eb * capped * offMult;
    S.res.energia += 1 * this.roomLvl('gerador') * capped * offMult;
    return { seconds: capped, gold, know };
  },

  // ---------- Tick principal ----------

  tick(dt) {
    // produção
    this.gainGold(this.goldPerSec() * dt);
    const eb = this.energyBoost();
    S.res.madeira += 2 * this.roomLvl('serraria') * eb * dt;
    S.res.pedra += 1.5 * this.roomLvl('mina_r') * eb * dt;
    S.res.ferro += 0.5 * this.roomLvl('mina_r') * eb * dt;
    S.res.energia += 1 * this.roomLvl('gerador') * dt;
    S.res.conhecimento += this.knowledgePerSec() * dt;
    S.playTime += dt;

    // combate
    if (S.unlocked.heroes) {
      if (S.combat.hp <= 0 && S.combat.maxHp === 0) this.spawnEnemy();
      const dps = this.teamDps();
      if (dps > 0) this.damageEnemy(dps * dt);
      if (S.combat.boss && S.combat.hp > 0) {
        S.combat.bossT -= dt;
        if (S.combat.bossT <= 0) this.bossFailed();
      }
    }

    // buffs expirados
    const now = Date.now();
    const before = S.buffs.length;
    S.buffs = S.buffs.filter(b => b.until > now);
    if (S.buffs.length !== before) UI.dirty.left = true;

    // eventos mundiais
    if (S.unlocked.events) {
      this.eventTimer -= dt;
      if (this.eventTimer <= 0) {
        this.fireWorldEvent();
        this.scheduleEvent();
      }
    }

    // moeda dourada (desde o início — o gostinho de Cookie Clicker)
    this.goldenTimer -= dt;
    if (this.goldenTimer <= 0) {
      UI.spawnGoldenCoin();
      this.scheduleGolden();
    }

    this.updatePhases();
  },
};

// ===== Áudio (WebAudio, sintetizado — sem arquivos) =====
const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type = 'sine', vol = 0.08, delay = 0) {
    if (!S.sound || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  },
  play(kind) {
    if (!S.sound) return;
    this.ensure();
    if (!this.ctx) return;
    switch (kind) {
      case 'click':       this.tone(520 + Math.random() * 80, 0.06, 'triangle', 0.04); break;
      case 'buy':         this.tone(440, 0.08, 'triangle'); this.tone(660, 0.1, 'triangle', 0.06, 0.06); break;
      case 'upgrade':     this.tone(523, 0.1, 'square', 0.05); this.tone(784, 0.15, 'square', 0.05, 0.08); break;
      case 'hire':        this.tone(392, 0.12, 'sawtooth', 0.04); this.tone(523, 0.12, 'sawtooth', 0.04, 0.1); this.tone(659, 0.2, 'sawtooth', 0.04, 0.2); break;
      case 'achievement': this.tone(659, 0.1, 'sine', 0.09); this.tone(880, 0.1, 'sine', 0.09, 0.1); this.tone(1108, 0.25, 'sine', 0.09, 0.2); break;
      case 'drop':        this.tone(880, 0.08, 'triangle', 0.07); this.tone(1174, 0.15, 'triangle', 0.07, 0.07); break;
      case 'golden':      this.tone(784, 0.08, 'sine', 0.09); this.tone(988, 0.08, 'sine', 0.09, 0.07); this.tone(1318, 0.2, 'sine', 0.09, 0.14); break;
      case 'unlock':      this.tone(330, 0.15, 'sine', 0.08); this.tone(494, 0.15, 'sine', 0.08, 0.12); this.tone(659, 0.3, 'sine', 0.08, 0.24); break;
      case 'event':       this.tone(220, 0.3, 'sawtooth', 0.05); this.tone(277, 0.3, 'sawtooth', 0.05, 0.15); break;
      case 'prestige':    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.08, i * 0.12)); break;
      case 'build':       this.tone(196, 0.12, 'square', 0.05); this.tone(294, 0.15, 'square', 0.05, 0.1); break;
    }
  },
};
