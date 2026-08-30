// ===== Simulador de balanceamento (headless) =====
// Roda um "jogador automático" razoável sobre o motor real e reporta o ritmo de progressão:
// quanto tempo pra cada fase, curva de ouro/s, evolução da onda de combate e o que travou.
// Objetivo: medir equilíbrio de compras com números, não com sensação.
//
// Uso no console de tests/sim.html:
//   Sim.run({ minutes: 120 })            → relatório de uma run
//   Sim.run({ minutes: 120, cps: 3 })    → com 3 cliques/s
//   Sim.paybacks()                       → tabela de payback de cada gerador no estado atual
const Sim = {

  // ---------- jogador automático ----------

  // Compra todos os upgrades acessíveis (são sempre ganho puro).
  buyUpgrades() {
    let bought = 0;
    for (const u of UPGRADES) {
      if (!S.upgrades[u.id] && S.gold >= u.cost) { if (Game.buyUpgrade(u.id)) bought++; }
    }
    return bought;
  },

  // Ganho marginal de ouro/s ao comprar 1 unidade do gerador (considera cruzar marco de 25).
  genMarginal(genId) {
    const before = Game.goldPerSec();
    const owned = S.gens[genId] || 0;
    S.gens[genId] = owned + 1;
    const after = Game.goldPerSec();
    S.gens[genId] = owned;
    return after - before;
  },

  // Melhor gerador por "custo por +1 ouro/s" (menor = melhor). Só considera desbloqueados.
  bestGen() {
    let best = null;
    for (const g of GENERATORS) {
      if (g.reqPrestige && S.prestiges < g.reqPrestige) continue;
      const cost = Game.genCost(g.id, 1);
      const gain = this.genMarginal(g.id);
      if (gain <= 0) continue;
      const ratio = cost / gain;   // segundos de produção pra se pagar
      if (!best || ratio < best.ratio) best = { id: g.id, cost, gain, ratio };
    }
    return best;
  },

  // Heróis: contrata o que puder e sobe nível do mais "barato por DPS".
  bestHeroLevel() {
    let best = null;
    for (const def of HEROES) {
      const h = S.heroes[def.id];
      if (!h) continue;
      const cost = Game.heroLvlCost(def.id, 1);
      const before = Game.teamDps();
      h.lvl += 1; Game._fieldDirty = true;
      const after = Game.teamDps();
      h.lvl -= 1; Game._fieldDirty = true;
      const gain = after - before;
      if (gain <= 0) continue;
      const ratio = cost / gain;
      if (!best || ratio < best.ratio) best = { id: def.id, cost, gain, ratio };
    }
    return best;
  },

  // Um "turno" de decisões de compra. goldShare: fração do ouro que pode ir pro combate (heróis).
  decide(opts) {
    this.buyUpgrades();

    // contrata heróis novos assim que der (DPS é o gargalo do combate)
    for (const def of HEROES) {
      if (S.unlocked.heroes && !S.heroes[def.id] && !(def.reqPrestige && S.prestiges < def.reqPrestige)
          && S.gold >= def.baseCost) Game.hireHero(def.id);
    }

    // alterna entre economia (geradores) e combate (níveis de herói) por ratio,
    // sempre respeitando um teto de payback pra não afundar tudo numa compra ruim
    for (let guard = 0; guard < 40; guard++) {
      const g = this.bestGen();
      const h = S.unlocked.heroes ? this.bestHeroLevel() : null;
      const cands = [];
      if (g && g.cost <= S.gold) cands.push({ kind: 'gen', ...g });
      if (h && h.cost <= S.gold * (opts.heroShare || 0.5)) cands.push({ kind: 'hero', ...h });
      if (!cands.length) break;
      // normaliza: gerador rende ouro/s, herói rende dps → compara pelo tempo de payback relativo
      cands.sort((a, b) => (a.kind === 'gen' ? a.ratio : a.ratio / (opts.dpsWeight || 1))
                         - (b.kind === 'gen' ? b.ratio : b.ratio / (opts.dpsWeight || 1)));
      const pick = cands[0];
      const ok = pick.kind === 'gen' ? Game.buyGen(pick.id, 1) : Game.levelHero(pick.id, 1);
      if (!ok) break;
    }

    // base: sobe salas acessíveis (a IA prioriza as de produção/DPS)
    if (S.unlocked.base) {
      for (const r of ROOMS) {
        if (Game.canAffordRoom(r.id) && Game.roomLvl(r.id) < 40) Game.buildRoom(r.id);
      }
    }
    // talentos: gasta conhecimento no que estiver disponível
    if (S.unlocked.talents && Game.buyTalent) {
      for (const t of TALENTS) {
        const lvl = Game.talentLvl(t.id);
        if (t.max && lvl >= t.max) continue;
        if (Game.talentExclusionBlocker && Game.talentExclusionBlocker(t.id)) continue;
        Game.buyTalent(t.id);
      }
    }
  },

  // ---------- loop ----------

  run(opts = {}) {
    const minutes = opts.minutes || 60;
    const dt = opts.dt || 1;                 // passo em segundos simulados
    const cps = opts.cps || 0;               // cliques por segundo do jogador
    const steps = Math.round(minutes * 60 / dt);

    S = defaultState();
    Game._fieldDirty = true;
    Game._gearDirty = true;

    const log = [];
    const phaseAt = {};
    const waveAt = [];
    let lastWave = 0, stallStart = null, worstStall = 0, worstStallAt = 0;
    const stalls = [];   // paredes de combate: {wave, seconds} sempre que a onda trava > 60s

    for (let i = 0; i < steps; i++) {
      Game.tick(dt);
      // clique manual (a lógica real mora em UI.init(); aqui reproduzimos o efeito no estado)
      for (let c = 0; c < cps * dt; c++) { Game.gainGold(Game.clickPower()); S.clicks++; }
      this.decide(opts);

      const t = S.playTime;
      for (const p of PHASES) {
        if (S.maxPhaseId >= p.id && phaseAt[p.id] === undefined) phaseAt[p.id] = Math.round(t);
      }
      // detecta parede de combate: onda não avança
      if (S.combat.maxWave > lastWave) {
        if (stallStart !== null) {
          const dur = t - stallStart;
          if (dur > worstStall) { worstStall = dur; worstStallAt = lastWave; }
          if (dur > 60) stalls.push({ wave: lastWave, seconds: Math.round(dur) });
          stallStart = null;
        }
        lastWave = S.combat.maxWave;
      } else if (S.unlocked.heroes && stallStart === null) {
        stallStart = t;
      }

      if (i % Math.round(60 / dt) === 0) {
        log.push({
          min: Math.round(t / 60),
          gps: Game.goldPerSec(),
          earned: S.earned,
          wave: S.combat.maxWave,
          dps: S.unlocked.heroes ? Game.teamDps() : 0,
          phase: S.maxPhaseId,
          heroes: Object.keys(S.heroes).length,
          gens: Object.values(S.gens).reduce((a, b) => a + b, 0),
          ess: Game.essenceGain(),
        });
      }
    }
    if (stallStart !== null) {
      const dur = S.playTime - stallStart;
      if (dur > worstStall) { worstStall = dur; worstStallAt = lastWave; }
    }

    return { log, phaseAt, stalls, worstStall, worstStallAt, final: log[log.length - 1] };
  },

  // Tabela de payback por gerador no estado ATUAL (segundos pra a compra se pagar).
  paybacks() {
    const rows = [];
    for (const g of GENERATORS) {
      if (g.reqPrestige && S.prestiges < g.reqPrestige) continue;
      const cost = Game.genCost(g.id, 1);
      const gain = this.genMarginal(g.id);
      rows.push({ id: g.id, owned: S.gens[g.id] || 0, cost, gain, payback: gain > 0 ? cost / gain : Infinity });
    }
    return rows;
  },
};
