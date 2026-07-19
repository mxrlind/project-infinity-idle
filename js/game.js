// ===== Motor do jogo =====

const Game = {

  // ---------- Multiplicadores derivados ----------

  achCount() { return Object.keys(S.ach).length; },
  talentLvl(id) { return S.talents[id] || 0; },
  roomLvl(id) { return S.rooms[id] || 0; },

  // Multiplicador geral da Base (Castelo): amplifica sinergias de vizinhança e os edifícios avançados.
  baseMult() { return 1 + 0.10 * this.roomLvl('castelo'); },

  // Renda passiva do Mercado — escala com a maior onda (nunca fica obsoleta) e com a Base (Castelo/Templo).
  mercadoGoldPerSec() {
    const lvl = this.roomLvl('mercado');
    if (lvl <= 0) return 0;
    return lvl * this.enemyGold(S.combat.maxWave, false) * 0.4 * this.baseMult() * this.buffMult('prod');
  },

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
    m *= 1 + 0.04 * this.roomLvl('templo') * this.baseMult(); // Templo: buff de produção global (×Castelo)
    m *= 1 + this.synergyBonuses().gold;                   // sinergia de vizinhança na Base
    m *= 1 + this.teamSynergy().prod;                      // sinergia de time (faixa 60%)
    for (const u of UPGRADES) if (u.type === 'global' && S.upgrades[u.id]) m *= u.mult;
    m *= this.extGoldMult();                               // expansão: mundo + mascotes + pesquisa
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
    return total * this.globalProdMult() + this.mercadoGoldPerSec();   // + renda passiva do Mercado
  },

  genCost(genId, count = 1) {
    const g = GENERATORS.find(x => x.id === genId);
    const owned = S.gens[genId] || 0;
    const disc = Math.max(0.5, 1 - 0.015 * this.talentLvl('barganha'));
    // trade-off de talento (AUDIT item 8): Expansão Agressiva barateia geradores, Tesouro Conservador encarece
    const buildMult = 1 - 0.25 * this.talentLvl('expansao_agressiva') + 0.10 * this.talentLvl('tesouro_conservador');
    // soma geométrica fechada: base·r^owned·(r^count − 1)/(r − 1)
    const r = GEN_COST_MULT;
    return g.baseCost * Math.pow(r, owned) * (Math.pow(r, count) - 1) / (r - 1) * disc * buildMult * this.extGenCostMult();
  },

  genMaxBuy(genId) {
    const first = this.genCost(genId, 1);
    if (S.gold < first) return 0;
    // inversão da soma geométrica: maior n com custo(n) ≤ ouro
    const r = GEN_COST_MULT;
    let n = Math.floor(Math.log(1 + (S.gold / first) * (r - 1)) / Math.log(r));
    while (n > 1 && this.genCost(genId, n) > S.gold) n--;
    while (this.genCost(genId, n + 1) <= S.gold) n++;
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

  // ----- Cache de bônus de equipamento (afixos globais) -----
  // Recalculado só quando o gear muda (equipar/desmanchar/drop/contratar/prestígio),
  // via flag _gearDirty. teamDps/enemyGold/clickAttack leem o cache em O(1) por tick.
  _gearDirty: true,
  gearBonus: { team: 0, gold: 0, crit: 0, mat: 0 },

  ensureGearBonus() {
    if (this._gearDirty) { this.recomputeGearBonuses(); this._gearDirty = false; }
  },

  // ----- Especialização de classe (Arquétipo + Arma ideal) -----
  heroArchetype(heroId) {
    const def = HEROES.find(x => x.id === heroId);
    return def && def.archetype ? ARCHETYPES[def.archetype] : null;
  },

  // ----- Papel de combate (ROLE) -----
  heroRole(heroId) {
    const def = HEROES.find(x => x.id === heroId);
    return def && def.role ? HERO_ROLES[def.role] : null;
  },
  // modificador do DPS PRÓPRIO do herói pelo seu papel (self-dps, fúria do berserker, área do mago).
  // Depende do estado do combate (fightT / chefe), então NÃO é cacheável — mas é O(1).
  roleDpsMult(heroId) {
    const def = HEROES.find(x => x.id === heroId);
    const role = def && def.role ? HERO_ROLES[def.role] : null;
    if (!role) return 1;
    const p = role.combat || {};
    const c = S.combat;
    let m = 1 + (p.selfDps || 0);
    if (p.rage)  m *= 1 + p.rage * Math.min(c.fightT || 0, p.rageMax || 0);  // berserker: fúria por tempo de luta
    if (p.aoe && c.maxHp > 0 && !c.boss) m *= 1 + p.aoe;                     // mago: dano em área nas ondas comuns
    return Math.max(0.05, m);
  },
  // tipo da arma de um item (usa wtype; cai no ícone para itens antigos, sem perder especialização)
  weaponType(item) {
    if (!item) return null;
    return item.wtype || WEAPON_ICON_TO_TYPE[item.icon] || null;
  },
  // true se a arma equipada do herói casa com a arma ideal do arquétipo
  heroMatched(heroId) {
    const arch = this.heroArchetype(heroId);
    const h = S.heroes[heroId];
    if (!arch || !h) return false;
    const w = h.gear.arma;
    return !!w && this.weaponType(w) === arch.weapon;
  },
  // força da especialização pela raridade da arma: Comum×1 … Lendário×3
  specScale(item) { return 0.5 + 0.5 * ((item && item.rarity || 0) + 1); },
  // pacote de especialização efetivo do herói (ou null se a arma for incompatível/ausente)
  heroSpec(heroId) {
    if (!this.heroMatched(heroId)) return null;
    const arch = this.heroArchetype(heroId);
    const s = arch.spec, k = this.specScale(S.heroes[heroId].gear.arma);
    return {
      dps: (s.dps || 0) * k, team: (s.team || 0) * k, gold: (s.gold || 0) * k,
      crit: (s.crit || 0) * k, mat: (s.mat || 0) * k, speed: (s.speed || 0) * k, boss: (s.boss || 0) * k,
      special: arch.special, arch, scale: k,
    };
  },
  // primeira mecânica especial de um dado tipo presente ENTRE OS HERÓIS EM CAMPO (ou null)
  fieldSpecial(kind) {
    for (const id of this.fieldHeroes()) {
      const sp = this.heroSpec(id);
      if (sp && sp.special === kind) return sp;
    }
    return null;
  },

  recomputeGearBonuses() {
    const b = { team: 0, gold: 0, crit: 0, mat: 0 };
    for (const id in S.heroes) {
      const gear = S.heroes[id].gear;
      for (const slot of GEAR_SLOTS) {
        const item = gear[slot.id];
        if (!item || !item.affixes) continue;
        for (const a of item.affixes) {
          if (a.type === 'team') b.team += a.val;
          else if (a.type === 'gold') b.gold += a.val;
          else if (a.type === 'crit') b.crit += a.val;
          else if (a.type === 'mat')  b.mat  += a.val;
        }
      }
      // especialização de classe: aura/ouro/crít/material entram no cache global (afetam o time)
      const spec = this.heroSpec(id);
      if (spec) { b.team += spec.team; b.gold += spec.gold; b.crit += spec.crit; b.mat += spec.mat; }
    }
    // Equipamentos 2.0 (#3): bônus de Conjunto (2pç/4pç) — mesmo cache, recalculado junto do gear
    if (this.activeSetBonuses) {
      const setB = this.activeSetBonuses();
      b.team += setB.team;
      b.crit += setB.crit;
    }
    b.crit = Math.min(FORGE_CRIT_CAP, b.crit);
    this.gearBonus = b;
  },

  // ----- Cache de sinergia de classe (campo de batalha) -----
  // Recalculado só quando a composição do campo muda (contratar/escalar/desescalar/prestígio),
  // via flag _fieldDirty. teamDps() lê o cache em O(1) por tick.
  _fieldDirty: true,
  synergyMult: 1,   // (legado) mantido em sincronia com a faixa de Ataque para compat
  _lastSynergy: { counts: { tank: 0, dps: 0, support: 0 }, pct: 0, n: 0, matched: 0, slots: FIELD_SLOTS },

  ensureSynergy() {
    if (this._fieldDirty) { this.recomputeSynergy(); this._fieldDirty = false; }
  },

  // A sinergia agora é um MEDIDOR 0–100%, somando três frentes claras que o jogador controla:
  //   composição (proporção 🛡️1:⚔️2:✨1)  +  campo cheio  +  heróis com a ARMA IDEAL equipada.
  // efeitos agregados dos PAPÉIS em campo (auras/bônus estáticos). Recalculado com _fieldDirty,
  // no mesmo laço da sinergia. Efeitos que dependem do estado vivo (fúria, exército, área) ficam
  // em roleDpsMult/teamDps, não aqui.
  _roleEff: { teamDps: 0, crit: 0, gold: 0, research: 0, bossTime: 0, execute: 0, summon: false, counts: {} },
  teamRoleEffects() { this.ensureSynergy(); return this._roleEff; },

  recomputeSynergy() {
    const counts = { tank: 0, dps: 0, support: 0 };
    const field = this.fieldHeroes();
    const re = { teamDps: 0, crit: 0, gold: 0, research: 0, bossTime: 0, execute: 0, summon: false, counts: {} };
    const compCounts = { kingdom: {}, element: {}, weapon: {} };
    let n = 0, matched = 0;
    for (const id of field) {
      const def = HEROES.find(x => x.id === id);
      counts[def.class]++;
      n++;
      if (this.heroMatched(id)) matched++;
      const role = def.role ? HERO_ROLES[def.role] : null;
      if (role) {
        const p = role.combat || {};
        re.teamDps  += p.teamDps  || 0;
        re.crit     += p.crit     || 0;
        re.gold     += p.gold     || 0;
        re.research += p.research || 0;
        re.bossTime += p.bossTime || 0;
        re.execute   = Math.max(re.execute, p.execute || 0);
        if (p.summon) re.summon = true;
        re.counts[def.role] = (re.counts[def.role] || 0) + 1;
      }
      if (def.kingdom) compCounts.kingdom[def.kingdom] = (compCounts.kingdom[def.kingdom] || 0) + 1;
      if (def.element) compCounts.element[def.element] = (compCounts.element[def.element] || 0) + 1;
      const arch = ARCHETYPES[def.archetype];
      if (arch) compCounts.weapon[arch.weapon] = (compCounts.weapon[arch.weapon] || 0) + 1;
    }
    // Sinergia de Composição (#2): reino/elemento/arma/diversidade de papéis dos heróis EM CAMPO.
    // Some direto no mesmo acumulador `re` (teamDps/gold/research/crit) — já consumido por
    // teamDps()/enemyGold()/researchSpeed() sem precisar de hooks novos.
    const teamSynergies = [];
    for (const ts of TEAM_SYNERGIES) {
      const w = ts.when;
      const cat = w.kingdom ? 'kingdom' : w.element ? 'element' : w.weapon ? 'weapon' : 'roles';
      const have = cat === 'roles' ? Object.keys(re.counts).length : (compCounts[cat][w[cat]] || 0);
      const active = have >= w.count;
      if (active) {
        re.teamDps  += ts.bonus.dps || 0;
        re.gold     += ts.bonus.gold || 0;
        re.research += ts.bonus.research || 0;
        re.crit     += ts.bonus.crit || 0;
      }
      teamSynergies.push({ id: ts.id, name: ts.name, icon: ts.icon, desc: ts.desc, need: w.count, have, active });
    }
    this._roleEff = re;
    const slots = this.fieldSlots();
    let compScore = 0;
    if (n > 0) {
      let dev = 0;
      for (const cls in SYNERGY_TARGET) dev += Math.abs(counts[cls] / n - SYNERGY_TARGET[cls]);
      compScore = Math.max(0, 1 - dev / 2);
    }
    const fillScore = slots > 0 ? Math.min(1, n / slots) : 0;
    const specScore = n > 0 ? matched / n : 0;
    const pct = n === 0 ? 0 : Math.round(Math.min(100,
      compScore * SYNERGY_WEIGHTS.comp + fillScore * SYNERGY_WEIGHTS.fill + specScore * SYNERGY_WEIGHTS.spec));
    this._lastSynergy = { counts, n, matched, slots, pct, compScore, fillScore, specScore, teamSynergies };
    this.synergyMult = 1 + (pct >= 20 ? SYNERGY_TIER_VAL.atk : 0) + (pct >= 100 ? SYNERGY_MEGA.atk : 0);
  },

  // bônus agregados por faixa (usados nas fórmulas do motor). A faixa 100% ativa o Estado Perfeito (+50% tudo).
  teamSynergy() {
    this.ensureSynergy();
    const pct = this._lastSynergy.pct;
    const out = { pct, atk: 0, gold: 0, prod: 0, know: 0, mega: false };
    if (pct >= 20)  out.atk  += SYNERGY_TIER_VAL.atk;
    if (pct >= 40)  out.gold += SYNERGY_TIER_VAL.gold;
    if (pct >= 60)  out.prod += SYNERGY_TIER_VAL.prod;
    if (pct >= 80)  out.know += SYNERGY_TIER_VAL.know;
    if (pct >= 100) { out.mega = true; out.atk += SYNERGY_MEGA.atk; out.gold += SYNERGY_MEGA.gold; out.prod += SYNERGY_MEGA.prod; out.know += SYNERGY_MEGA.know; }
    return out;
  },

  // soma dos afixos de DPS (scope 'hero') de um item — aplicado só ao herói que o porta
  itemDpsAffix(item) {
    if (!item || !item.affixes) return 0;
    let s = 0;
    for (const a of item.affixes) if (a.type === 'dps') s += a.val;
    return s;
  },

  // "força" comparável de um item (fonte única para auto-equip, comparação e venda).
  // Converte cada afixo para um equivalente em multiplicador de DPS para comparar maçãs com maçãs.
  itemScore(item) {
    if (!item) return 0;
    let s = item.mult || 0;
    if (item.affixes) for (const a of item.affixes) {
      if (a.type === 'dps' || a.type === 'team') s += a.val;   // DPS direto
      else s += a.val * 0.5;                                    // utilitário (ouro/crit/mat) vale menos em "força"
    }
    return s;
  },

  heroGearMult(heroId) {
    const h = S.heroes[heroId];
    if (!h) return 1;
    let m = 1;
    const power = 1 + 0.10 * this.roomLvl('oficina') + this.synergyBonuses().equip;
    for (const slot of GEAR_SLOTS) {
      const item = h.gear[slot.id];
      if (!item) continue;
      m *= 1 + item.mult * power;              // poder-base do item (escalado pela Oficina, como antes)
      m *= 1 + this.itemDpsAffix(item);        // afixos de DPS deste item (independentes da Oficina)
    }
    const spec = this.heroSpec(heroId);        // especialização: DPS + velocidade + "área"
    if (spec) m *= 1 + spec.dps + spec.speed + spec.boss;
    return m;
  },

  heroDps(heroId) {
    const def = HEROES.find(x => x.id === heroId);
    const h = S.heroes[heroId];
    if (!h || h.lvl <= 0) return 0;
    return def.baseDps * h.lvl * Math.pow(2, Math.floor(h.lvl / HERO_MILESTONE)) * this.heroGearMult(heroId) * this.roleDpsMult(heroId);
  },

  // DPS extra das INVOCAÇÕES do necromante (pool separado). Cresce com o total de abates da run.
  summonDps() {
    if (!this.teamRoleEffects().summon) return 0;
    const army = 1 + Math.min(1.5, S.combat.kills / 1000);   // exército cresce até +150%
    let s = 0;
    for (const id of this.fieldHeroes()) {
      const def = HEROES.find(x => x.id === id);
      const role = def.role ? HERO_ROLES[def.role] : null;
      if (role && role.combat && role.combat.summon) s += this.heroDps(id) * role.combat.summon * army;
    }
    return s;
  },

  // ----- Campo de batalha / reserva -----
  // Só heróis com fieldSlot definido (0..FIELD_SLOTS-1) lutam; o resto fica na reserva.
  fieldHeroes() {
    return Object.keys(S.heroes)
      .filter(id => S.heroes[id].fieldSlot !== null && S.heroes[id].fieldSlot !== undefined)
      .sort((a, b) => S.heroes[a].fieldSlot - S.heroes[b].fieldSlot);
  },

  benchHeroes() {
    return Object.keys(S.heroes).filter(id => S.heroes[id].fieldSlot === null || S.heroes[id].fieldSlot === undefined);
  },

  // nº de slots do campo (a pesquisa "Formação Estendida" concede um 5º)
  fieldSlots() {
    return FIELD_SLOTS + (S.research && S.research.done && S.research.done.quinto_slot ? 1 : 0);
  },

  firstFreeFieldSlot() {
    const used = new Set(this.fieldHeroes().map(id => S.heroes[id].fieldSlot));
    for (let i = 0; i < this.fieldSlots(); i++) if (!used.has(i)) return i;
    return null;
  },

  // move heroId pro slotIndex (ou null = reserva). Se outro herói já ocupa o slot, troca de posição.
  setFieldSlot(heroId, slotIndex) {
    const h = S.heroes[heroId];
    if (!h) return false;
    if (slotIndex !== null && (slotIndex < 0 || slotIndex >= this.fieldSlots())) return false;
    if (slotIndex !== null) {
      const occupantId = this.fieldHeroes().find(id => S.heroes[id].fieldSlot === slotIndex && id !== heroId);
      if (occupantId) S.heroes[occupantId].fieldSlot = (h.fieldSlot !== undefined ? h.fieldSlot : null);
    }
    h.fieldSlot = slotIndex;
    this._fieldDirty = true;
    UI.dirty.heroes = true;
    return true;
  },

  benchHero(heroId) {
    return this.setFieldSlot(heroId, null);
  },

  // true se o DPS deste herói conta como MÁGICO (ignora armadura de chefes blindados) — papel Mago
  // (ver HERO_ROLES.mago.combat.armorPen) ou, globalmente, o bônus 4pç do Conjunto Golem (gearsets.js)
  heroIsMagic(heroId) {
    const role = this.heroRole(heroId);
    return !!(role && role.combat && role.combat.armorPen);
  },

  teamDps() {
    this.ensureGearBonus();
    this.ensureSynergy();
    // Chefes Inteligentes (#7): armadura do chefe atual reduz DPS físico (mágico ignora)
    const armorM = this.bossArmorMults ? this.bossArmorMults() : { phys: 1, magic: 1 };
    let total = 0;
    for (const id of this.fieldHeroes()) {
      total += this.heroDps(id) * (this.heroIsMagic(id) ? armorM.magic : armorM.phys);
    }
    total += this.summonDps();                  // exército do necromante (pool separado)
    const re = this._roleEff;
    total *= 1 + re.teamDps;                    // auras de papel (Tanque provoca, Bardo inspira)
    // crítico esperado: duelista/assassino/afixo Letal/Lobo valem também no DPS ocioso, não só no clique
    const critCh = Math.min(FORGE_CRIT_CAP, this.gearBonus.crit + this.extCritBonus() + re.crit);
    total *= 1 + critCh * (FORGE_CRIT_MULT - 1);
    total *= 1 + this.teamSynergy().atk;        // sinergia de time (faixas 20% + Estado Perfeito 100%)
    total *= 1 + 0.10 * this.roomLvl('quartel');
    total *= 1 + 0.08 * this.roomLvl('torre') * this.baseMult();  // Torre Arcana: DPS mágico (×Castelo)
    total *= 1 + this.synergyBonuses().dps;     // sinergia de vizinhança (ex.: Quartel + Oficina)
    total *= 1 + 0.10 * this.talentLvl('furia');
    // trade-off de talento (AUDIT item 8): Assalto Total vs Guarda Calculada
    total *= 1 + 0.20 * this.talentLvl('assalto_total') - 0.08 * this.talentLvl('guarda_calculada');
    total *= 1 + 0.01 * this.achCount();
    total *= 1 + this.gearBonus.team;          // afixo "Estandarte" (soma dos itens equipados)
    total *= this.extDpsMult();                // expansão: mundo + mascotes + pesquisa
    total *= (this.bossRolePenaltyMult ? this.bossRolePenaltyMult() : 1);  // Chefes Inteligentes (#7): chefe exige papel em campo
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
    // trade-off de talento (AUDIT item 8): Expansão Agressiva encarece heróis, Tesouro Conservador barateia
    const buildMult = 1 + 0.15 * this.talentLvl('expansao_agressiva') - 0.15 * this.talentLvl('tesouro_conservador');
    // soma geométrica fechada: base·0.2·r^lvl·(r^count − 1)/(r − 1)
    const r = HERO_LVL_COST_MULT;
    return def.baseCost * 0.2 * Math.pow(r, lvl) * (Math.pow(r, count) - 1) / (r - 1) * buildMult * this.extHeroCostMult();
  },

  heroMaxLevels(heroId) {
    const first = this.heroLvlCost(heroId, 1);
    if (S.gold < first) return 0;
    // inversão da soma geométrica: maior n com custo(n) ≤ ouro
    const r = HERO_LVL_COST_MULT;
    let n = Math.floor(Math.log(1 + (S.gold / first) * (r - 1)) / Math.log(r));
    while (n > 1 && this.heroLvlCost(heroId, n) > S.gold) n--;
    while (this.heroLvlCost(heroId, n + 1) <= S.gold) n++;
    return n;
  },

  enemyMaxHp(wave, boss) {
    let hp = 15 * Math.pow(1.45, wave - 1) * (boss ? 9 : 1);
    if (boss) hp *= this.extBossHpMult();   // Relíquias (#6): Olho do Dragão / Colar do Vazio
    return hp;
  },

  enemyGold(wave, boss) {
    this.ensureGearBonus();
    let g = 4 * Math.pow(1.42, wave - 1) * (boss ? 14 : 1);
    g *= 1 + 0.08 * this.talentLvl('cacador');
    g *= 1 + this.gearBonus.gold;              // afixo "Cobiça" (ouro por abate)
    g *= 1 + this.teamRoleEffects().gold;      // papel: Bardo em campo (+ouro por abate)
    g *= 1 + this.teamSynergy().gold;          // sinergia de time (faixa 40%)
    if (boss) g *= 1 + 0.12 * this.roomLvl('arena') * this.baseMult();  // Arena: ouro de chefes (×Castelo)
    g *= this.extKillGoldMult();               // expansão: Lua Cheia + pesquisa "Caçada Ritual"
    if (S.invasion > 0 && !boss) g *= 3;
    return g;
  },

  bossTimeLimit() {
    let t = 30 + 3 * this.talentLvl('paciencia') + 2 * this.roomLvl('arena') + this.teamRoleEffects().bossTime;
    if (this.gearSetLifestealActive && this.gearSetLifestealActive()) t += 2;  // Conjunto Sombrio (4pç): sustain = mais tempo de chefe
    return t;
  },

  spawnEnemy() {
    const c = S.combat;
    c.boss = c.wave % 10 === 0 && c.bossCooldown === 0;
    // Mundo Vivo (#8): Eclipse pode surpreender com um chefe fora do múltiplo de 10
    c.secretBoss = false;
    if (!c.boss && c.bossCooldown === 0 && this.worldInfo && this.worldInfo().weather && this.worldInfo().weather.id === 'eclipse'
        && Math.random() < ECLIPSE_SECRET_BOSS_CHANCE) {
      c.boss = true;
      c.secretBoss = true;
    }
    // Chefes Inteligentes (#7): sorteia (ou não) uma mecânica pra este chefe
    c.bossMech = c.boss ? this.rollBossMechanic(c.wave) : null;
    c.bossShiftPhys = false;
    const mech = this.bossMechDef();
    c.bossShiftT = (mech && mech.shifting) ? mech.shiftEvery : 0;
    if (mech || c.secretBoss) UI.showBossBanner(mech, c.secretBoss);
    // Mundo Vivo (#8): monstro temático por estação/clima (reflavor + leve HP bônus)
    const w = this.worldInfo ? this.worldInfo() : null;
    const specialKey = w && ((w.weather && SPECIAL_ENEMIES[w.weather.id] && w.weather.id) || (SPECIAL_ENEMIES[w.season.id] && w.season.id));
    c.special = (!c.boss && specialKey) ? specialKey : null;
    c.maxHp = this.enemyMaxHp(c.wave, c.boss) * (c.special ? SPECIAL_ENEMIES[c.special].hpMult : 1);
    c.hp = c.maxHp;
    c.bossT = c.boss ? this.bossTimeLimit() : 0;
    c.fightT = 0;   // reseta a fúria do Berserker a cada novo inimigo

    // Roadmap #11: Códex de Monstros — registra o tipo do inimigo que acabou de aparecer
    if (S.codex) {
      if (c.secretBoss) S.codex.monsters.eclipse_secreto = true;
      else if (c.boss) S.codex.monsters.chefe = true;
      else if (c.special) S.codex.monsters[SPECIAL_ENEMIES[c.special].id] = true;
      else S.codex.monsters.grunt = true;
    }
  },

  dropChance() {
    let ch = 0.35;
    ch += 0.05 * this.roomLvl('oficina');
    ch += this.synergyBonuses().equip;          // sinergia de vizinhança (ex.: Oficina + Mina)
    ch += 0.04 * this.talentLvl('pilhagem');
    // trade-off de talento (AUDIT item 8): Assalto Total vs Guarda Calculada
    ch += 0.15 * this.talentLvl('guarda_calculada') - 0.10 * this.talentLvl('assalto_total');
    ch += this.extDropBonus();                  // expansão: Dragão + Neve + pesquisa + poções
    return Math.min(0.95, ch);
  },

  rollGear(preferSetId) {
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
    const item = { heroId, slot: slot.id, rarity: idx, mult };
    this.assignWeaponLook(item, slot);
    // Equipamentos 2.0 (#3): loot temático — chefes com dropSet (bosses.js) puxam pro set deles
    if (this.rollItemSetElement) {
      const se = this.rollItemSetElement(preferSetId);
      item.set = se.set; item.element = se.element;
    }
    return item;
  },

  // define ícone e (para armas) o tipo de arma (wtype). Armas favorecem levemente a arma ideal
  // do herói dono/aleatório para que drops com especialização apareçam com frequência decente.
  assignWeaponLook(item, slot, preferHeroId) {
    if (slot.id !== 'arma') { item.icon = slot.icons[Math.floor(Math.random() * slot.icons.length)]; return; }
    let wt = null;
    const arch = preferHeroId ? this.heroArchetype(preferHeroId) : (item.heroId ? this.heroArchetype(item.heroId) : null);
    if (arch && Math.random() < 0.5) wt = WEAPON_TYPES.find(w => w.id === arch.weapon);
    if (!wt) wt = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    item.wtype = wt.id;
    item.icon = wt.icon;
  },

  onEnemyKilled() {
    const c = S.combat;
    const wasBoss = c.boss;
    const reward = this.enemyGold(c.wave, wasBoss);
    this.gainGold(reward);
    c.kills++;
    if (S.invasion > 0 && !wasBoss) S.invasion--;

    // materiais em ondas mais altas (afixo "Garimpo" aumenta a chance)
    if (c.wave >= 12 && Math.random() < 0.30 + this.gearBonus.mat) {
      const amt = Math.ceil(c.wave / 10);
      S.res.pedra += amt;
      if (Math.random() < 0.5) S.res.ferro += Math.ceil(amt / 2);
    }
    if (wasBoss && c.wave >= 30 && Math.random() < 0.4) {
      S.res.cristal += 1;
      UI.log(`💠 O chefe soltou um <b>Cristal</b>!`);
    }

    this.onKillExt(wasBoss);                    // expansão: XP de mascote, missões, segredos

    if (wasBoss) {
      c.bossKills++;
      UI.log(`👑 Chefe da onda <b>${c.wave}</b> derrotado! <b>+${fmt(reward)}</b> ouro`);
      // Equipamentos 2.0 (#3): loot temático — o chefe derrotado ainda está em c.bossMech aqui
      const mech = this.bossMechDef ? this.bossMechDef() : null;
      if (Math.random() < this.dropChance()) this.awardGear(mech && mech.dropSet);
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

  awardGear(preferSetId) {
    const item = this.rollGear(preferSetId);
    if (!item) return;
    item.affixes = [];                       // drops não têm afixos (uniformiza a forma do item)
    const h = S.heroes[item.heroId];
    const def = HEROES.find(x => x.id === item.heroId);
    const rar = RARITIES[item.rarity];
    const current = h.gear[item.slot];
    if (!current || this.itemScore(item) > this.itemScore(current)) {  // compara por "força", não só mult
      h.gear[item.slot] = item;
      this._gearDirty = true; this._fieldDirty = true;
      const isRare = item.rarity >= 3; // Épico ou Lendário
      UI.log(`${item.icon} <b>${def.name}</b> equipou <span style="color:${rar.color}">${rar.name}</span> (+${Math.round(item.mult * 100)}% DPS)!`);
      UI.toast(`${item.icon} ${rar.name} para ${def.name}!`, rar.color, isRare);
      if (isRare) UI.legendaryFlash(rar.color, item.rarity === 4);   // partículas extra (#14) só no Lendário
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

  // ---------- Forja de Armas ----------

  forgeUnlocked() {
    // disponível assim que houver ao menos um herói contratado
    for (const _ in S.heroes) return true;
    return false;
  },

  forgeCost(tierId) {
    const t = FORGE_TIERS.find(x => x.id === tierId);
    // ouro escala com o progresso (reusa a curva já balanceada de recompensa da maior onda)
    const gold = Math.ceil(this.enemyGold(S.combat.maxWave, false) * t.goldMult);
    return { gold, ferro: t.ferro, cristal: t.cristal };
  },

  forgeTierUnlocked(tier) {
    return !tier.unlockAt || this.npcLevel(tier.unlockAt.npc) >= tier.unlockAt.lvl;
  },

  canForge(tierId) {
    if (S.forge.inventory.length >= FORGE_INVENTORY_CAP) return false;   // bolsa cheia
    const t = FORGE_TIERS.find(x => x.id === tierId);
    if (!this.forgeTierUnlocked(t)) return false;
    const c = this.forgeCost(tierId);
    return S.gold >= c.gold && S.res.ferro >= c.ferro && S.res.cristal >= c.cristal;
  },

  rollForgeRarity(tier) {
    let total = 0;
    for (const w of tier.weights) total += w;
    let roll = Math.random() * total;
    for (let i = 0; i < tier.weights.length; i++) { roll -= tier.weights[i]; if (roll <= 0) return i; }
    return 0;
  },

  rollAffixes(rarityIdx, tier, elementId, perfect) {
    // quantidade: Raro+ ganham 2, Lendário ganha 3 (só a Forja Lendária tem affixMax pra isso), senão 1
    const want = Math.min(tier.affixMax, rarityIdx >= 4 ? 3 : (rarityIdx >= 2 ? 2 : 1));
    let pool = FORGE_AFFIXES.slice();
    // Equipamentos 2.0 (#3): se o item saiu com elemento, o afixo de DPS vira a versão elemental
    // (mesmo teto de afixos — só muda a cor/flavor, sem inflar o poder)
    if (elementId) {
      const elemAff = FORGE_ELEMENT_AFFIXES.find(a => a.element === elementId);
      if (elemAff) pool = pool.map(a => a.type === 'dps' ? elemAff : a);
    }
    const out = [];
    const rarMult = 1 + rarityIdx * 0.55;              // afixo melhor em raridades altas
    for (let i = 0; i < want && pool.length; i++) {
      const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; // sem tipo repetido
      const base = perfect ? pick.max : pick.min + Math.random() * (pick.max - pick.min);   // Encantamento (#9): rolagem sempre no topo
      let val = base * rarMult;
      if (pick.type === 'crit') val = Math.min(FORGE_CRIT_CAP, val);
      out.push({ type: pick.type, val: Math.round(val * 1000) / 1000, element: pick.element || null });
    }
    return out;
  },

  forgeItem(tierId) {
    if (!this.canForge(tierId)) return false;
    const tier = FORGE_TIERS.find(x => x.id === tierId);
    const cost = this.forgeCost(tierId);
    S.gold -= cost.gold;
    S.res.ferro -= cost.ferro;
    S.res.cristal -= cost.cristal;

    const rarityIdx = this.rollForgeRarity(tier);
    const rar = RARITIES[rarityIdx];
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];  // arma ou amuleto
    const mult = rar.power * (1 + S.combat.maxWave / 40) * (0.85 + Math.random() * 0.30);
    // Equipamentos 2.0 (#3): a forja também pode revelar set/elemento (sem preferência de chefe)
    const se = this.rollItemSetElement ? this.rollItemSetElement(null) : { set: null, element: null };
    const affixes = this.rollAffixes(rarityIdx, tier, se.element);

    const uid = S.forge.nextUid++;
    const item = { uid, slot: slot.id, rarity: rarityIdx, mult, affixes, forged: true, set: se.set, element: se.element };
    this.assignWeaponLook(item, slot);         // forja: tipo de arma 100% aleatório (a "aposta")
    S.forge.inventory.push(item);
    S.forge.forged++;
    this.missionEvent('forge', 1);              // missão diária da Ferreira

    const isRare = rarityIdx >= 3;
    Sound.play('drop');
    if (isRare) UI.legendaryFlash(rar.color, rarityIdx === 4);   // partículas extra (#14) só no Lendário
    UI.log(`${tier.icon} Forja (${tier.name}) revelou <span style="color:${rar.color}">${rar.name}</span> ${item.icon}! (na Bolsa)`);
    UI.toast(`${item.icon} ${rar.name}!`, rar.color, isRare);
    UI.showForgeReveal(S.forge.inventory[S.forge.inventory.length - 1]);
    UI.dirty.heroes = true;    // a bolsa vive na aba Heróis — atualiza quando o jogador for até lá
    return true;
  },

  findForgeItem(uid) {
    return S.forge.inventory.find(x => x.uid === uid) || null;
  },

  // "força" de uma carta específica pra um herói, comparada ao item atual naquele slot
  itemDeltaForHero(uid, heroId) {
    const item = this.findForgeItem(uid);
    const h = S.heroes[heroId];
    if (!item || !h) return 0;
    return this.itemScore(item) - this.itemScore(h.gear[item.slot]);
  },

  equipItem(uid, heroId) {
    const idx = S.forge.inventory.findIndex(x => x.uid === uid);
    if (idx === -1) return false;
    const h = S.heroes[heroId];
    if (!h) return false;
    const item = S.forge.inventory[idx];
    const def = HEROES.find(x => x.id === heroId);
    const rar = RARITIES[item.rarity];
    const old = h.gear[item.slot];
    h.gear[item.slot] = item;
    S.forge.inventory.splice(idx, 1);
    if (old) S.forge.inventory.push(old);   // item antigo volta pra bolsa
    this._gearDirty = true; this._fieldDirty = true;
    const slotName = GEAR_SLOTS.find(s => s.id === item.slot).name;
    UI.log(`${item.icon} <b>${def.name}</b> equipou ${slotName} <span style="color:${rar.color}">${rar.name}</span>!`);
    UI.toast(`${item.icon} ${rar.name} → ${def.name}`, rar.color, item.rarity >= 3);
    Sound.play('hire');
    UI.dirty.heroes = true;
    return true;
  },

  unequipItem(heroId, slotId) {
    const h = S.heroes[heroId];
    if (!h || !h.gear[slotId]) return false;
    if (S.forge.inventory.length >= FORGE_INVENTORY_CAP) return false;   // bolsa cheia — evita perder o item
    S.forge.inventory.push(h.gear[slotId]);
    h.gear[slotId] = null;
    this._gearDirty = true; this._fieldDirty = true;
    UI.dirty.heroes = true;
    return true;
  },

  scrapItem(uid) {
    const idx = S.forge.inventory.findIndex(x => x.uid === uid);
    if (idx === -1) return false;
    const item = S.forge.inventory[idx];
    if (item.rarity >= 4) S.secrets.scrapLegend = true;   // segredo "Coração de Pedra"
    // devolve parte do ferro (proporcional à raridade) + um pouco de ouro; amizade com a Ferreira melhora o retorno
    const ferroBack = Math.ceil((1 + item.rarity) * 4 * FORGE_SCRAP_FERRO * (1 + 0.10 * this.npcLevel('ferreiro')));
    const goldBack = Math.ceil(this.enemyGold(S.combat.maxWave, false) * 3);
    S.res.ferro += ferroBack;
    this.gainGold(goldBack);
    S.forge.inventory.splice(idx, 1);
    UI.log(`♻️ Carta desmanchada: <b>+${fmt(ferroBack)}</b> ⛓️ ferro e <b>+${fmt(goldBack)}</b> ouro.`);
    Sound.play('buy');
    UI.dirty.heroes = true;
    return true;
  },

  clickAttack() {
    // clicar no monstro causa dano; afixo "Letal" dá chance de crítico ×FORGE_CRIT_MULT
    this.ensureGearBonus();
    let dmg = Math.max(1, this.teamDps() * 0.05 + this.clickPower() * 0.5);
    const critCh = Math.min(FORGE_CRIT_CAP, this.gearBonus.crit + this.extCritBonus() + this.teamRoleEffects().crit);  // afixo "Letal" + Lobo + Duelista/Assassino
    const crit = critCh > 0 && Math.random() < critCh;
    if (crit) dmg *= FORGE_CRIT_MULT;
    // Duelista com Espada ideal em campo: chance de ATAQUE DUPLO (dano ×2 no clique)
    const duel = this.fieldSpecial('double');
    const dbl = !!duel && Math.random() < 0.30;
    if (dbl) dmg *= 2;
    this.damageEnemy(dmg);
    return { dmg, crit, dbl };
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
    const g = GENERATORS.find(x => x.id === genId);
    if (!g) return false;
    // regra de desbloqueio vive no motor, não só na UI
    if (g.reqPrestige && S.prestiges < g.reqPrestige) return false;
    if (count === 'max') count = this.genMaxBuy(genId);
    if (count <= 0) return false;
    const cost = this.genCost(genId, count);
    if (S.gold < cost) return false;
    const totalOwnedBefore = Object.values(S.gens).reduce((a, b) => a + b, 0);
    S.gold -= cost;
    const before = S.gens[genId] || 0;
    S.gens[genId] = before + count;
    if (before < 77 && before + count >= 77) S.luckyNumberSeen = true;
    // primeiro gerador da run: o gancho narrativo real do "Aprendiz Coletor" (AUDIT item 4 — antes
    // disparava no 1º CLIQUE, texto errado pro momento; ver ui.js pro flavor certo do 1º clique)
    if (totalOwnedBefore === 0) UI.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${ADVISOR_TIPS.firstGen}"</i>`);
    // marco de quantidade cruzado?
    if (Math.floor((before + count) / GEN_MILESTONE) > Math.floor(before / GEN_MILESTONE)) {
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
    if (!def) return false;
    // regra de desbloqueio vive no motor, não só na UI
    if (def.reqPrestige && S.prestiges < def.reqPrestige) return false;
    if (S.heroes[heroId] || S.gold < def.baseCost) return false;
    S.gold -= def.baseCost;
    S.heroes[heroId] = { lvl: 1, gear: { arma: null, amuleto: null }, fieldSlot: this.firstFreeFieldSlot() };
    this._fieldDirty = true;
    UI.log(`${def.icon} <b>${def.name}</b>, ${def.title}, entrou para o time!`);
    UI.log(`${def.icon} <b>${def.name}:</b> <i>"${def.lines[0]}"</i>`);
    Sound.play('hire');
    UI.dirty.heroes = true;
    UI.dirty.tabs = true;
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
    const disc = this.extRoomCostMult();   // pesquisa "Engenharia Anã"
    for (const k in r.baseCost) cost[k] = r.baseCost[k] * Math.pow(r.costMult, lvl) * disc;
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
      * this.energyBoost()
      * (1 + this.synergyBonuses().knowledge)
      * (1 + this.teamSynergy().know)           // sinergia de time (faixa 80%)
      * this.extKnowMult();                     // expansão: noite/outono/eclipse + Coruja + poções
  },

  // ---------- Grade da Base (posicionamento + sinergias de vizinhança) ----------

  // Garante que S.baseGrid seja um array válido com cada sala exatamente uma vez.
  // Preserva posições existentes e acomoda salas novas/faltantes em células livres.
  ensureBaseGrid() {
    const size = BASE_GRID_COLS * BASE_GRID_ROWS;
    const validIds = new Set(ROOMS.map(r => r.id));
    let g = S.baseGrid;

    const wellFormed = Array.isArray(g) && g.length === size &&
      g.every(x => x === null || validIds.has(x));
    if (wellFormed) {
      const placed = g.filter(Boolean);
      if (placed.length === new Set(placed).size && ROOMS.every(r => placed.includes(r.id))) {
        return g;
      }
    }

    // (re)construção tolerante: mantém colocações válidas, distribui o resto
    const out = new Array(size).fill(null);
    const used = new Set();
    if (Array.isArray(g)) {
      for (let i = 0; i < size; i++) {
        const id = g[i];
        if (id && validIds.has(id) && !used.has(id)) { out[i] = id; used.add(id); }
      }
    }
    for (const r of ROOMS) {
      if (used.has(r.id)) continue;
      const free = out.indexOf(null);
      if (free >= 0) { out[free] = r.id; used.add(r.id); }
    }
    S.baseGrid = out;
    return out;
  },

  // vizinhos ortogonais à direita e abaixo (basta metade dos pares para não contar em dobro)
  cellForwardNeighbors(i) {
    const n = [];
    const col = i % BASE_GRID_COLS;
    const size = BASE_GRID_COLS * BASE_GRID_ROWS;
    if (col < BASE_GRID_COLS - 1) n.push(i + 1);        // direita
    if (i + BASE_GRID_COLS < size) n.push(i + BASE_GRID_COLS); // abaixo
    return n;
  },

  // sinergias atualmente ativas: [{ def, value, i, j }] — value = per × min(nível das duas salas)
  activeSynergies() {
    const g = this.ensureBaseGrid();
    const res = [];
    for (let i = 0; i < g.length; i++) {
      const a = g[i];
      if (!a) continue;
      for (const j of this.cellForwardNeighbors(i)) {
        const b = g[j];
        if (!b) continue;
        const def = ROOM_SYNERGIES.find(d => (d.a === a && d.b === b) || (d.a === b && d.b === a));
        if (!def) continue;
        const lvl = Math.min(this.roomLvl(a), this.roomLvl(b));
        if (lvl < 1) continue;
        res.push({ def, value: def.per * lvl, i, j });
      }
    }
    return res;
  },

  // bônus agregados por tipo, aplicados nas fórmulas do motor
  synergyBonuses() {
    const b = { gold: 0, dps: 0, knowledge: 0, material: 0, equip: 0 };
    const mul = this.extSynergyMult() * this.baseMult();   // pesquisa "Urbanismo Arcano" × Castelo
    for (const s of this.activeSynergies()) b[s.def.type] += s.value * mul;
    return b;
  },

  // troca (ou move) o conteúdo de duas células da grade
  swapCells(i, j) {
    const g = this.ensureBaseGrid();
    if (i < 0 || j < 0 || i >= g.length || j >= g.length || i === j) return false;
    const t = g[i]; g[i] = g[j]; g[j] = t;
    UI.dirty.base = true;
    return true;
  },

  // ---------- Talentos ----------

  talentCost(talId) {
    const t = TALENTS.find(x => x.id === talId);
    return Math.ceil(t.baseCost * Math.pow(TALENT_COST_MULT, this.talentLvl(talId)));
  },

  // trade-offs reais (AUDIT item 8): investir em um lado de um par `exclusiveWith` tranca o outro
  // pra sempre nesta run — mesmo mecanismo do roadmap #5 (Pesquisa), aplicado aos Talentos.
  // Retorna o id do talento já investido que bloqueia `talId`, ou null se ainda está livre.
  talentExclusionBlocker(talId) {
    const t = TALENTS.find(x => x.id === talId);
    if (!t || !t.exclusiveWith) return null;
    return t.exclusiveWith.find(id => this.talentLvl(id) > 0) || null;
  },

  buyTalent(talId) {
    const t = TALENTS.find(x => x.id === talId);
    const lvl = this.talentLvl(talId);
    if (lvl >= t.max) return false;
    if (this.talentExclusionBlocker(talId)) return false;
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
    g = Math.floor(g * (1 + 0.05 * this.talentLvl('transcend')) * this.extEssenceMult());  // + Fênix + pesquisa
    return g;
  },

  // reseta a run — mantém: essência, prestígios, conquistas, talentos, fases desbloqueadas.
  // Compartilhado por doPrestige e Game.doAscend (js/layers.js, roadmap #13), que resetam também
  // essência/prestígios por cima disto — mantém mascotes, pesquisas, mercado, NPCs, mundo, códex
  // e camadas, todos PERMANENTES. A bolsa de equipamentos (S.forge.inventory) NÃO é permanente:
  // é esvaziada aqui (os heróis também são resetados acima, então os itens equipados já se perdem).
  resetRunState() {
    S.gold = 0;
    S.earned = 0;
    S.gens = {};
    S.upgrades = {};
    S.heroes = {};
    S.combat = { wave: 1, maxWave: 1, hp: 0, maxHp: 0, boss: false, bossT: 0, bossCooldown: 0, fightT: 0,
      bossMech: null, bossShiftPhys: false, bossShiftT: 0, special: null, secretBoss: false,
      kills: S.combat.kills, bossKills: S.combat.bossKills };
    S.rooms = {};
    S.res = { madeira: 0, pedra: 0, ferro: 0, energia: 0, cristal: 0, conhecimento: S.res.conhecimento };
    S.forge.inventory = [];
    S.buffs = [];
    S.invasion = 0;
  },

  doPrestige() {
    const gain = this.essenceGain();
    if (gain < 1) return false;
    const prevEarned = S.earned;               // para o "ninho de ouro" da Fênix
    S.essence += gain;
    S.prestiges++;
    this.resetRunState();
    this._gearDirty = true; this._fieldDirty = true;   // gear zerado + heróis resetados → recalcula ambos os caches
    this.onPrestigeExt(prevEarned);            // Fênix (ninho de ouro) + Memória Persistente
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
    // Fase 1: flavor do Aldric durante o clique puro, antes de Heróis desbloquear (AUDIT item 4)
    if (!u.heroes) {
      for (const f of PHASE1_FLAVOR) {
        if (!S.advisorSeen[f.id] && S.earned >= f.earned) {
          S.advisorSeen[f.id] = true;
          UI.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${f.line}"</i>`);
        }
      }
    }
    const notify = (key, tip) => {
      if (!u[key]) {
        u[key] = true;
        UI.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${tip}"</i>`);
        UI.toast('🔓 Novo sistema desbloqueado!', '#e8a33d');
        Sound.play('unlock');
        UI.dirtyAll();
        UI.showLoreModal(key);
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
        UI.toast(`🏅 ${a.name}`, '#e8a33d', true);
        UI.confettiBurst();
        Sound.play('achievement');
        UI.dirty.ach = true;
        UI.dirty.prod = true;
      }
    }
    this.checkLore();                          // descobertas do Códex seguem o mesmo cadenciamento
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
    const freq = (1 + 0.10 * this.talentLvl('fortuna')) * this.extEventFreqMult();
    this.eventTimer = (160 + Math.random() * 180) / freq;
  },

  scheduleGolden() {
    const freq = (1 + 0.10 * this.talentLvl('fortuna')) * this.extEventFreqMult();
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
    if (S.codex) S.codex.events[ev.id] = true;   // Roadmap #11: Códex de Eventos
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
    const mat = (1 + this.synergyBonuses().material) * this.extMaterialMult();   // sinergia + estação/clima
    S.res.madeira += 2 * this.roomLvl('serraria') * eb * mat * capped * offMult;
    S.res.pedra += 1.5 * this.roomLvl('mina_r') * eb * mat * capped * offMult;
    S.res.ferro += 0.5 * this.roomLvl('mina_r') * eb * mat * capped * offMult;
    S.res.energia += 1 * this.roomLvl('gerador') * mat * capped * offMult;
    // expansão: o mundo gira, a pesquisa continua e o mercado se move enquanto você dorme
    const ext = this.offlineExt(capped);
    return { seconds: capped, gold, know, research: ext.research };
  },

  // ---------- Tick principal ----------

  tick(dt) {
    // produção
    this.gainGold(this.goldPerSec() * dt);
    const eb = this.energyBoost();
    const mat = (1 + this.synergyBonuses().material) * this.extMaterialMult();   // sinergia + estação/clima
    S.res.madeira += 2 * this.roomLvl('serraria') * eb * mat * dt;
    S.res.pedra += 1.5 * this.roomLvl('mina_r') * eb * mat * dt;
    S.res.ferro += 0.5 * this.roomLvl('mina_r') * eb * mat * dt;
    S.res.energia += 1 * this.roomLvl('gerador') * mat * this.extEnergyMult() * dt;   // tempestade turbina a energia
    S.res.conhecimento += this.knowledgePerSec() * dt;
    S.playTime += dt;

    // combate
    if (S.unlocked.heroes) {
      if (S.combat.hp <= 0 && S.combat.maxHp === 0) this.spawnEnemy();
      if (S.combat.hp > 0 && S.combat.maxHp > 0) S.combat.fightT = (S.combat.fightT || 0) + dt;  // fúria do Berserker
      const dps = this.teamDps();
      if (dps > 0) this.damageEnemy(dps * dt);
      // Execução de inimigos comuns com pouca vida: papel Assassino em campo, ou Adaga ideal (arquétipo)
      const execT = this.teamRoleEffects().execute;
      const asn = this.fieldSpecial('execute');
      const execFrac = Math.max(execT, asn ? 0.08 * asn.scale : 0);
      if (execFrac > 0 && !S.combat.boss && S.combat.hp > 0 && S.combat.maxHp > 0
          && S.combat.hp / S.combat.maxHp < execFrac) {
        this.damageEnemy(S.combat.hp);
      }
      if (S.combat.boss && S.combat.hp > 0) {
        if (this.tickBossShift) this.tickBossShift(dt);    // Chefes Inteligentes (#7): Rei Demônio troca de resistência
        const drainMult = this.bossTimeDrainMult ? this.bossTimeDrainMult() : 1;
        S.combat.bossT -= dt * drainMult;                  // Necromante: drena o tempo mais rápido
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

    this.tickExt(dt);   // expansão: mundo vivo, pesquisa, mercado, NPCs, mascotes, automação

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
