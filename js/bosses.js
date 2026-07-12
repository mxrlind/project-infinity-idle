// ===== Chefes Inteligentes (Roadmap #7) =====
// Cada chefe (onda múltipla de 10, a partir da faixa mínima da mecânica) pode sortear uma mecânica
// de BOSS_MECHANICS. Transitório: S.combat.bossMech/bossShiftPhys/bossShiftT não sobrevivem ao save
// entre chefes (resetados em Game.spawnEnemy) e não precisam de migração de save.
// Integra com o motor original via Game.teamDps/Game.tick (game.js), sem duplicar a lógica de combate.

Object.assign(Game, {

  bossMechDef(id) {
    const key = id !== undefined ? id : S.combat.bossMech;
    return key ? (BOSS_MECHANICS.find(m => m.id === key) || null) : null;
  },

  // sorteia (ou não) uma mecânica pro chefe que acabou de spawnar, considerando a onda atual
  rollBossMechanic(wave) {
    const pool = BOSS_MECHANICS.filter(m => wave >= m.minWave);
    if (!pool.length || Math.random() < 0.35) return null;   // 35% de chance de ser um chefe "comum"
    const id = pool[Math.floor(Math.random() * pool.length)].id;
    if (S.codex) S.codex.bossMechs[id] = true;   // Roadmap #11: Códex de Chefes
    return id;
  },

  // multiplicadores de armadura aplicados ao DPS físico/mágico do time contra o chefe ATUAL.
  // O bônus 4pç do Conjunto Golem (gearsets.js) faz o time inteiro ignorar armadura de chefe.
  bossArmorMults() {
    const mech = this.bossMechDef();
    if (!mech || (this.gearSetArmorPenActive && this.gearSetArmorPenActive())) return { phys: 1, magic: 1 };
    if (mech.armor) return { phys: 1 - mech.armor, magic: 1 };
    if (mech.shifting) {
      const drop = 1 - BOSS_MECH_SHIFT_ARMOR;
      return S.combat.bossShiftPhys ? { phys: drop, magic: 1 } : { phys: 1, magic: drop };
    }
    return { phys: 1, magic: 1 };
  },

  // penalidade de DPS quando o chefe exige um papel ausente do campo (ex.: Dragão pede Duelista)
  bossRolePenaltyMult() {
    const mech = this.bossMechDef();
    if (!mech || !mech.req || !mech.req.role) return 1;
    const present = (this.teamRoleEffects().counts[mech.req.role] || 0) > 0;
    return present ? 1 : mech.penalty;
  },

  // avança a fase de resistência do Rei Demônio (chamado pelo tick, só enquanto o chefe estiver vivo)
  tickBossShift(dt) {
    const mech = this.bossMechDef();
    if (!mech || !mech.shifting) return;
    S.combat.bossShiftT -= dt;
    if (S.combat.bossShiftT <= 0) {
      S.combat.bossShiftPhys = !S.combat.bossShiftPhys;
      S.combat.bossShiftT = mech.shiftEvery;
      UI.log(`${mech.icon} O <b>Rei Demônio</b> troca de resistência: agora vulnerável a dano <b>${S.combat.bossShiftPhys ? 'MÁGICO' : 'FÍSICO'}</b>.`);
    }
  },

  // drena o tempo de chefe mais rápido quando a mecânica define drainMult (Necromante)
  bossTimeDrainMult() {
    const mech = this.bossMechDef();
    return (mech && mech.drainMult) || 1;
  },
});
